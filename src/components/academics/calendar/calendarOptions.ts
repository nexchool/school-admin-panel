import type {
  AppliesTo,
  ExamType,
  SchoolEventType,
} from "@/services/academicCalendarService";

export const APPLIES_TO_OPTIONS: { value: AppliesTo; label: string }[] = [
  { value: "entire_school", label: "Entire School" },
  { value: "students", label: "Students" },
  { value: "teachers", label: "Teachers" },
  { value: "staff", label: "Staff" },
];

export const EXAM_TYPE_OPTIONS: { value: ExamType; label: string }[] = [
  { value: "unit_test", label: "Unit Test" },
  { value: "mid_term", label: "Mid Term" },
  { value: "final", label: "Final" },
  { value: "pre_board", label: "Pre-Board" },
  { value: "board", label: "Board" },
  { value: "other", label: "Other" },
];

export const EVENT_TYPE_OPTIONS: { value: SchoolEventType; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "event", label: "Event" },
  { value: "meeting", label: "Meeting" },
  { value: "celebration", label: "Celebration" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
];

/** Python weekday order used by the API: 0=Mon … 6=Sun. */
export const WEEKDAY_OPTIONS = [
  { value: 6, label: "Sunday" },
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
] as const;

/** Today's date in the user's local timezone as YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Date arithmetic on ISO dates, timezone-safe (computed in UTC). */
export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing the given ISO date. */
export function weekStartOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return addDaysIso(iso, -((d.getUTCDay() + 6) % 7));
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T | string | null | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "—");
}
