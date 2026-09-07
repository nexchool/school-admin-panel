"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/hooks/useAppMutation";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import { studentCredentialsKeys } from "@/hooks/useStudentCredentials";
import {
  accountAccessService,
  mySessionsService,
  type AccountAccess,
  type AccountSession,
} from "@/services/accountAccessService";

export const accountAccessKeys = {
  all: ["account-access"] as const,
  access: (accountId: string) =>
    [...accountAccessKeys.all, "access", accountId] as const,
  sessions: (accountId: string) =>
    [...accountAccessKeys.all, "sessions", accountId] as const,
};

/**
 * Whether this account can get in, and how.
 *
 * Cached like any other read because it carries no secret: the payload names
 * credentials without containing them.
 */
export function useAccountAccess(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useTenantQuery<AccountAccess>({
    queryKey: accountAccessKeys.access(accountId ?? ""),
    queryFn: () => accountAccessService.get(accountId as string),
    enabled: Boolean(accountId) && (options?.enabled ?? true),
  });
}

/** Where this account is signed in. Metadata only — no token, ever. */
export function useAccountSessions(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useTenantQuery<{ sessions: AccountSession[] }>({
    queryKey: accountAccessKeys.sessions(accountId ?? ""),
    queryFn: () => accountAccessService.listSessions(accountId as string),
    enabled: Boolean(accountId) && (options?.enabled ?? true),
  });
}

function useAccessRefresh() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: accountAccessKeys.all });
    // Suspending an account changes what the credential panel should offer,
    // so the two views do not disagree about the same person.
    queryClient.invalidateQueries({ queryKey: studentCredentialsKeys.all });
  };
}

export function useSuspendAccount() {
  const refresh = useAccessRefresh();
  return useAppMutation(
    {
      mutationFn: ({
        accountId,
        reason,
      }: {
        accountId: string;
        reason?: string;
      }) => accountAccessService.suspend(accountId, reason),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        result.sessions_revoked > 0
          ? `Access suspended. Signed out of ${result.sessions_revoked} ${
              result.sessions_revoked === 1 ? "device" : "devices"
            }.`
          : "Access suspended",
      error: "Couldn't suspend this account",
    },
  );
}

export function useReactivateAccount() {
  const refresh = useAccessRefresh();
  return useAppMutation(
    {
      mutationFn: ({ accountId }: { accountId: string }) =>
        accountAccessService.reactivate(accountId),
      onSuccess: refresh,
    },
    {
      // Said plainly, because an operator who expects the old sessions back
      // would otherwise read the silence as a failure.
      success: "Access restored. They will need to sign in again.",
      error: "Couldn't restore access to this account",
    },
  );
}

export function useRevokeAccountSession() {
  const refresh = useAccessRefresh();
  return useAppMutation(
    {
      mutationFn: ({
        accountId,
        sessionId,
      }: {
        accountId: string;
        sessionId: string;
      }) => accountAccessService.revokeSession(accountId, sessionId),
      onSuccess: refresh,
    },
    {
      success: "Signed out of that device",
      error: "Couldn't sign that device out",
    },
  );
}

export function useRevokeAllAccountSessions() {
  const refresh = useAccessRefresh();
  return useAppMutation(
    {
      mutationFn: ({ accountId }: { accountId: string }) =>
        accountAccessService.revokeAllSessions(accountId),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        `Signed out of ${result.revoked} ${
          result.revoked === 1 ? "device" : "devices"
        }`,
      error: "Couldn't sign this account out",
    },
  );
}

export const mySessionKeys = {
  all: ["my-sessions"] as const,
};

/** Where am I signed in? Metadata only — no token appears in this payload. */
export function useMySessions() {
  return useTenantQuery<{ sessions: AccountSession[] }>({
    queryKey: mySessionKeys.all,
    queryFn: () => mySessionsService.list(),
  });
}

function useMySessionRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: mySessionKeys.all });
}

export function useRevokeMySession() {
  const refresh = useMySessionRefresh();
  return useAppMutation(
    {
      mutationFn: ({ sessionId }: { sessionId: string }) =>
        mySessionsService.revoke(sessionId),
      onSuccess: refresh,
    },
    {
      success: "Signed out of that device",
      error: "Couldn't sign that device out",
    },
  );
}

export function useRevokeMyOtherSessions() {
  const refresh = useMySessionRefresh();
  return useAppMutation(
    {
      mutationFn: () => mySessionsService.revokeOthers(),
      onSuccess: refresh,
    },
    {
      success: (result) =>
        result.revoked === 0
          ? "You weren't signed in anywhere else"
          : `Signed out of ${result.revoked} other ${
              result.revoked === 1 ? "device" : "devices"
            }`,
      error: "Couldn't sign your other devices out",
    },
  );
}
