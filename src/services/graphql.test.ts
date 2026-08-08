import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiException } from "./api";
import { GraphQLException, gql } from "./graphql";

const apiRequest = vi.fn();
const endSession = vi.fn().mockResolvedValue(undefined);
const notifyForbidden = vi.fn();

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    apiRequest: (...args: unknown[]) => apiRequest(...args),
    endSession: () => endSession(),
  };
});

vi.mock("@/lib/forbiddenHandler", () => ({
  notifyForbidden: () => notifyForbidden(),
}));

/** A GraphQL reply: always 200, the outcome is in the body. */
function reply(body: unknown, status = 200) {
  apiRequest.mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

function failure(code: string, message = "Refused") {
  reply({ data: null, errors: [{ message, extensions: { code } }] });
}

/** The refusal a call produced, typed so its status and code can be read. */
async function refusalFrom(
  run: Promise<unknown>,
): Promise<ApiException & { code?: string }> {
  return (await run.catch((e: unknown) => e)) as ApiException & {
    code?: string;
  };
}

describe("gql", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    endSession.mockClear();
    notifyForbidden.mockClear();
  });

  it("returns the data a successful operation produced", async () => {
    reply({ data: { student: { id: "s-1" } } });

    await expect(gql("query { student { id } }")).resolves.toEqual({
      student: { id: "s-1" },
    });
  });

  it("sends the query and variables as one operation", async () => {
    reply({ data: { ok: true } });

    await gql("mutation W($id: ID!) { withdrawStudent(id: $id) { id } }", {
      id: "s-1",
    });

    const [endpoint, options] = apiRequest.mock.calls[0];
    expect(endpoint).toBe("/api/graphql");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      query: "mutation W($id: ID!) { withdrawStudent(id: $id) { id } }",
      variables: { id: "s-1" },
    });
  });

  // A GraphQL failure arrives on a 200. Everything downstream — toasts, modal
  // error states, the permission refresh — reads an ApiException, so these
  // have to arrive as one or each of those paths needs a second branch.
  it("raises a refusal as an ApiException carrying its code", async () => {
    failure("CONFLICT", "This student is already recorded as withdrawn");

    const error = await refusalFrom(gql("mutation { withdrawStudent { id } }"));

    expect(error).toBeInstanceOf(ApiException);
    expect(error).toBeInstanceOf(GraphQLException);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("This student is already recorded as withdrawn");
  });

  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["SETUP_INCOMPLETE", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["VALIDATION_ERROR", 400],
  ])("gives %s the status the same failure had over REST", async (code, status) => {
    failure(code);

    const error = await refusalFrom(gql("query { x }"));

    expect(error.status).toBe(status);
  });

  it("signs the user out when their identity is rejected", async () => {
    failure("UNAUTHENTICATED", "Session expired");

    await gql("query { x }").catch(() => {});

    expect(endSession).toHaveBeenCalled();
  });

  it("asks for a permission refresh when refused", async () => {
    failure("FORBIDDEN");

    await gql("query { x }").catch(() => {});

    // A 403 can mean this person's cached permissions went stale — the same
    // self-correction the REST layer does.
    expect(notifyForbidden).toHaveBeenCalled();
    expect(endSession).not.toHaveBeenCalled();
  });

  it("does not sign the user out for an ordinary refusal", async () => {
    failure("CONFLICT");

    await gql("query { x }").catch(() => {});

    expect(endSession).not.toHaveBeenCalled();
  });

  // GraphQL can answer with data *and* errors when a nullable field fails. A
  // caller handed the half-filled object has no way to notice.
  it("does not return a partial result", async () => {
    reply({
      data: { students: null },
      errors: [{ message: "boom", extensions: { code: "INTERNAL_ERROR" } }],
    });

    await expect(gql("query { students { id } }")).rejects.toBeInstanceOf(
      ApiException,
    );
  });

  it("treats a gateway failure as a transport error, not a refusal", async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });

    const error = await refusalFrom(gql("query { x }"));

    expect(error).toBeInstanceOf(ApiException);
    expect(error.status).toBe(502);
  });

  it("reports an unreadable reply instead of throwing a parser error", async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token <");
      },
    });

    const error = await refusalFrom(gql("query { x }"));

    expect(error).toBeInstanceOf(ApiException);
    expect(error.message).toContain("could not read");
  });
});
