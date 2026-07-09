/**
 * Canonical student lifecycle statuses.
 *
 * Values are lowercase strings persisted as-is on the backend (see
 * server/modules/students — `student.student_status`). Keep this list in sync
 * with the backend enum in server/modules/students/student_schemas.py.
 *
 * The status field is NOT collected when creating a student (new students
 * default to "active" server-side); it is only editable afterwards.
 */
import type { Option } from "@/lib/data/referenceData";

export const DEFAULT_STUDENT_STATUS = "active";

export const STUDENT_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
  { value: "graduated", label: "Graduated" },
  { value: "leaving", label: "Leaving" },
  { value: "suspended", label: "Suspended" },
  { value: "dropped_out", label: "Dropped Out" },
];

export const STUDENT_STATUS_VALUES = STUDENT_STATUS_OPTIONS.map((o) => o.value);
