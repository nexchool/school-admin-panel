import { apiGet, apiPost } from "@/services/api";

/**
 * Issuing and reporting on the passwords a school hands its students.
 *
 * One rule shapes this whole file: **a plaintext password exists in exactly
 * one response and is then gone.** It is returned by the operation that
 * generated it and is never stored, cached, logged or fetchable afterwards —
 * `getStatus` deliberately has no field that could carry one. If somebody
 * loses the slip, the school issues a new password; it cannot look the old
 * one up, and neither can anyone else.
 */

/** A way the school knows this account — an email address, an admission number. */
export type CredentialIdentifier = {
  type: string;
  value: string;
  is_verified: boolean;
  is_primary: boolean;
};

export type CredentialSummary = {
  type: string;
  is_provisional: boolean;
  must_change: boolean;
  issued_at: string | null;
  last_rotated_at: string | null;
};

/** Whether this student can sign in with a PIN. Never the digits. */
export type PinStatus = {
  issued: boolean;
  length: number;
  is_provisional?: boolean;
  must_change?: boolean;
  issued_at?: string | null;
  last_rotated_at?: string | null;
};

/** The one and only moment a PIN crosses the wire. */
export type IssuedPin = {
  student_id: string;
  status: "issued" | "reset";
  credential: "pin";
  pin: string;
  sessions_revoked: number;
};

/** Everything an operator may see. Notably: no password, no PIN, and no hash. */
export type CredentialStatus = {
  student_id: string;
  admission_number: string | null;
  has_account: boolean;
  email?: string;
  is_suspended?: boolean;
  last_login_at?: string | null;
  identifiers: CredentialIdentifier[];
  credential: CredentialSummary | null;
  must_change_password?: boolean;
  /** The PIN is its own credential, alongside the password rather than
   *  instead of it — one student may hold both. */
  pin?: PinStatus;
  /** Why there is nothing to report — today, always "no_account". */
  reason?: string;
};

/** The one and only moment a plaintext password crosses the wire. */
export type IssuedCredential = {
  student_id: string;
  status: "issued" | "reset";
  admission_number: string | null;
  password: string;
  must_change: boolean;
  sessions_revoked: number;
  admission_identifier_issued: boolean;
};

export type SkippedStudent = {
  student_id: string;
  admission_number: string | null;
  status: "skipped";
  reason: string;
};

export type FailedStudent = {
  student_id: string;
  admission_number: string | null;
  error: string;
};

export type BulkIssueResult = {
  requested: number;
  /** How many the run actually reached. Differs from `requested` only if
   *  something stopped it part-way — which is when an operator needs to know. */
  processed: number;
  issued: number;
  skipped: number;
  failed: number;
  credentials: IssuedCredential[];
  skipped_students: SkippedStudent[];
  failed_students: FailedStudent[];
  counts_by_skip_reason: Record<string, number>;
};

export type BackfillResult = Omit<BulkIssueResult, "credentials"> & {
  issued_students: Array<{
    student_id: string;
    admission_number: string | null;
    status: "issued";
  }>;
};

/** Which students a bulk operation is for. One of the two is required. */
export type BulkTarget = { class_id?: string; student_ids?: string[] };

export const studentCredentialsService = {
  getStatus: (studentId: string) =>
    apiGet<CredentialStatus>(`/students/${studentId}/credentials`),

  /**
   * `reset` is the destructive one and defaults to false: without it, a
   * student who already has a working password is left alone rather than
   * locked out.
   */
  issue: (studentId: string, options?: { reset?: boolean }) =>
    apiPost<IssuedCredential>(`/students/${studentId}/credentials/issue`, {
      reset: options?.reset ?? false,
    }),

  /** Ask for a new password at next sign-in without taking today's away. */
  forceChange: (studentId: string) =>
    apiPost<{ student_id: string; status: string; must_change: boolean }>(
      `/students/${studentId}/credentials/force-change`,
      {},
    ),

  bulkIssue: (target: BulkTarget, options?: { reset?: boolean }) =>
    apiPost<BulkIssueResult>("/students/credentials/bulk-issue", {
      ...target,
      reset: options?.reset ?? false,
    }),

  /**
   * Give this student a PIN for signing in from a phone, or replace it.
   *
   * A separate credential from their password: issuing one disturbs neither
   * the password nor the admission number. `reset` is the destructive one and
   * defaults to false.
   */
  issuePin: (studentId: string, options?: { reset?: boolean }) =>
    apiPost<IssuedPin>(`/students/${studentId}/pin`, {
      reset: options?.reset ?? false,
    }),

  /** Ask for a new PIN at next sign-in without issuing one. */
  forcePinChange: (studentId: string) =>
    apiPost<{ student_id: string; status: string; credential: "pin" }>(
      `/students/${studentId}/pin/force-change`,
      {},
    ),

  /** Never touches a password — only adds the admission-number way in. */
  backfillAdmissionIds: (target: BulkTarget) =>
    apiPost<BackfillResult>(
      "/students/credentials/backfill-admission-ids",
      target,
    ),
};
