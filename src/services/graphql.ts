/**
 * The GraphQL transport — deliberately thin.
 *
 * It is a `fetch` and an error contract, nothing more. Caching, retries,
 * invalidation and loading state stay with TanStack Query, which the whole app
 * already speaks; a GraphQL client with its own normalized cache would give us
 * two caching models to keep in step, and two answers to "why is this stale".
 *
 * Everything about the request itself — auth header, refresh-token handoff,
 * tenant header, the friendly network-failure message — is `apiRequest`, the
 * same function REST uses. There is one place where a request is assembled.
 *
 * What is genuinely different is the reply. GraphQL answers 200 with an
 * `errors` array, so failures are read out of the body rather than the status
 * line. Those failures are raised as `ApiException`s carrying the status the
 * same failure would have had over REST, which is what lets every existing
 * error path — `toastError`, the 403 permission refresh, modal error states —
 * keep working without knowing which transport it is looking at.
 */

import { notifyForbidden } from "@/lib/forbiddenHandler";
import { ApiException, apiRequest, endSession } from "./api";

const GRAPHQL_ENDPOINT = "/api/graphql";

/**
 * A refusal the server named. `code` comes from `extensions.code` — the
 * server's own vocabulary (see `server/graphql_api/errors.py`), which is
 * stable in a way the message deliberately is not.
 */
export class GraphQLException extends ApiException {
  code: string;

  constructor(message: string, code: string, status: number, data?: unknown) {
    super(message, status, data);
    this.name = "GraphQLException";
    this.code = code;
  }
}

/**
 * What each refusal would have been over REST.
 *
 * Not decoration: code elsewhere in the app branches on `status` (a 403
 * refreshes stale permissions, a 401 signs out), and a mutation that moved to
 * GraphQL should not change how any of that behaves.
 */
const STATUS_FOR_CODE: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  SETUP_INCOMPLETE: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 400,
  TENANT_REQUIRED: 400,
  INTERNAL_ERROR: 500,
};

type GraphQLError = {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; details?: unknown };
};

type GraphQLReply<T> = { data?: T | null; errors?: GraphQLError[] };

/**
 * Run one operation and return its `data`.
 *
 * Partial results are not returned. GraphQL can answer with data *and* errors
 * — a nullable field that failed — and a caller handed a half-filled object
 * has no way to notice. A screen that legitimately wants the rest of a page
 * when one field failed should ask for that field separately.
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await apiRequest(GRAPHQL_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  // A non-200 from a GraphQL endpoint is the transport failing before the
  // schema was reached (a gateway error page, a body too large), so it is
  // read as REST reads it rather than as a GraphQL reply.
  if (!response.ok && response.status >= 500) {
    throw new ApiException(
      "We could not reach the server. Please try again in a moment.",
      response.status,
    );
  }

  let reply: GraphQLReply<T>;
  try {
    reply = (await response.json()) as GraphQLReply<T>;
  } catch {
    throw new ApiException(
      "The server sent a reply we could not read.",
      response.status,
    );
  }

  const failure = reply.errors?.[0];
  if (failure) {
    const code = failure.extensions?.code ?? "INTERNAL_ERROR";
    const status = STATUS_FOR_CODE[code] ?? 400;

    if (code === "UNAUTHENTICATED" && typeof window !== "undefined") {
      await endSession();
    }
    // A 403 can mean this person's permissions went stale — the same
    // self-correction REST does, for the same reason.
    if (status === 403 && typeof window !== "undefined") {
      notifyForbidden();
    }

    throw new GraphQLException(failure.message, code, status, reply.errors);
  }

  if (reply.data === undefined || reply.data === null) {
    throw new ApiException("The server returned no data.", response.status);
  }

  return reply.data;
}
