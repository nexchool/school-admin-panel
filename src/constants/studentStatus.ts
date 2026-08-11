/**
 * Canonical student lifecycle statuses.
 *
 * Values are lowercase strings persisted as-is on the backend (see
 * server/modules/students/student_schemas.py). Keep this list in sync with it.
 *
 * The status field is NOT collected when creating a student (new students
 * default to "active" server-side); it is only editable afterwards — and then
 * only for the statuses below that a person is allowed to set.
 */
import type { Option } from "@/lib/data/referenceData";

export const DEFAULT_STUDENT_STATUS = "active";

/**
 * Statuses reached only by doing the thing they describe.
 *
 * Withdrawing, graduating or transferring a student closes their place in a
 * class, records when and why, and changes who the school is billed for.
 * Setting the word alone would leave all of that undone, so the server refuses
 * these on an ordinary edit and the app offers them as actions instead
 * (see `useStudentLifecycle`).
 */
export const WORKFLOW_STATUS_VALUES = [
  "withdrawn",
  "graduated",
  "transferred",
] as const;

/** What a person may set on a student's record directly. */
export const EDITABLE_STUDENT_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  // Flagged to leave at the end of the year — still here, still taught, and
  // excluded from promotion. Past tense is `withdrawn`, which is an action.
  { value: "leaving", label: "Leaving" },
  { value: "suspended", label: "Suspended" },
  { value: "dropped_out", label: "Dropped Out" },
];

/** Every status a student may hold — for reading one, not for setting it. */
export const STUDENT_STATUS_OPTIONS: Option[] = [
  ...EDITABLE_STUDENT_STATUS_OPTIONS,
  { value: "withdrawn", label: "Withdrawn" },
  { value: "graduated", label: "Graduated" },
  { value: "transferred", label: "Transferred" },
];

export const STUDENT_STATUS_VALUES = STUDENT_STATUS_OPTIONS.map((o) => o.value);

export const EDITABLE_STUDENT_STATUS_VALUES =
  EDITABLE_STUDENT_STATUS_OPTIONS.map((o) => o.value);

export function isWorkflowStatus(status?: string | null): boolean {
  return (
    !!status &&
    (WORKFLOW_STATUS_VALUES as readonly string[]).includes(status.toLowerCase())
  );
}

/** The label for a stored status, falling back to the raw value. */
export function studentStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return (
    STUDENT_STATUS_OPTIONS.find((o) => o.value === status.toLowerCase())
      ?.label ?? status
  );
}
