import { apiDelete, apiGet, apiPost } from "@/services/api";

/**
 * Whether somebody can get in, and from where.
 *
 * Separate from `studentCredentialsService`, which is about the secrets a
 * school *issues*. This is about the access those secrets buy: is the account
 * suspended, is it locked, which methods may it use, and what is signed in
 * right now. The split matters because the two answer different questions for
 * an operator — "reset their password" versus "shut this account down" — and
 * because everything here is true of any account, not only a student's.
 *
 * **Nothing in these types can carry a secret.** No password, no PIN, no
 * refresh token, no hash of any of them: a session is described by where and
 * when, never by what proves it.
 */

/** How this account is known — an email address, a mobile number. */
export type AccessIdentifier = {
  type: string;
  value: string;
  is_verified: boolean;
};

/** That a credential exists and what state it is in. Never its value. */
export type AccessCredential = {
  issued: boolean;
  is_provisional: boolean;
  must_change: boolean;
  last_rotated_at: string | null;
};

export type AccountAccess = {
  has_account: boolean;
  account_id?: string;
  email?: string;
  is_suspended?: boolean;
  /** Temporarily barred by failed attempts. Clears itself; a suspension does not. */
  is_locked?: boolean;
  must_change_password?: boolean;
  last_login_at?: string | null;
  identifiers?: AccessIdentifier[];
  /** Keyed by credential type: `password`, `pin`. */
  credentials?: Record<string, AccessCredential>;
  /** What the school's policy actually permits this person — not a guess from
   *  the identifiers they happen to hold. */
  allowed_methods?: string[];
  active_sessions?: number;
};

/** One place this account is signed in. Where and when, never what proves it. */
export type AccountSession = {
  id: string;
  login_method: string | null;
  client_surface: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  expires_at: string | null;
  revoked: boolean;
};

export type SuspensionResult = {
  account_id: string;
  is_suspended: boolean;
  sessions_revoked: number;
  access: AccountAccess;
};

export type ReactivationResult = {
  account_id: string;
  is_suspended: boolean;
  /** Always zero, and returned so the screen can say so. A suspension is not
   *  undone by handing back the sessions it ended — the person signs in. */
  sessions_restored: number;
  access: AccountAccess;
};

export const accountAccessService = {
  get: (accountId: string) =>
    apiGet<AccountAccess>(`/auth/accounts/${accountId}/access`),

  /** Stop this account signing in, now. Their record is untouched. */
  suspend: (accountId: string, reason?: string) =>
    apiPost<SuspensionResult>(`/auth/accounts/${accountId}/suspend`, {
      reason: reason ?? undefined,
    }),

  /** Let them sign in again. Restores no session — see `sessions_restored`. */
  reactivate: (accountId: string) =>
    apiPost<ReactivationResult>(`/auth/accounts/${accountId}/reactivate`, {}),

  listSessions: (accountId: string) =>
    apiGet<{ sessions: AccountSession[] }>(
      `/auth/accounts/${accountId}/sessions`,
    ),

  revokeSession: (accountId: string, sessionId: string) =>
    apiDelete<{ message?: string }>(
      `/auth/accounts/${accountId}/sessions/${sessionId}`,
    ),

  revokeAllSessions: (accountId: string) =>
    apiDelete<{ revoked: number }>(`/auth/accounts/${accountId}/sessions`),
};

/**
 * The signed-in person's own sessions.
 *
 * A separate object from `accountAccessService` because the endpoints are
 * different in kind: these need no permission and take no account id — the
 * token says whose sessions they are. Somebody who suspects their password is
 * known can look here and end the other sessions themselves, without waiting
 * for an administrator.
 */
export const mySessionsService = {
  list: () => apiGet<{ sessions: AccountSession[] }>("/auth/sessions"),

  /** End one. The current one is included, and ending it signs you out. */
  revoke: (sessionId: string) =>
    apiDelete<{ message?: string }>(`/auth/sessions/${sessionId}`),

  /** End every *other* session, keeping the one making the request — which is
   *  what somebody clicking "sign out my other devices" means by it. */
  revokeOthers: () => apiDelete<{ revoked: number }>("/auth/sessions"),
};
