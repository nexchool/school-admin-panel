import type { AcademicTerm } from "@/services/academicTermsService";
import type {
  EventStatus,
  ExamWindow,
  SchoolEvent,
  SchoolEventType,
} from "@/services/academicCalendarService";
import type { Holiday } from "@/services/holidayService";

import {
  APPLIES_TO_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  EXAM_TYPE_OPTIONS,
  labelFor,
} from "./calendarOptions";

export type CalendarEntryKind =
  | "holiday"
  | "vacation"
  | "exam"
  | "event"
  | "semester";

/** One row in the unified calendar layer (list/week views, search, details). */
export interface CalendarEntry {
  /** Unique across kinds: `${kind}:${id}` */
  key: string;
  id: string;
  kind: CalendarEntryKind;
  name: string;
  startDate: string;
  endDate: string;
  typeLabel: string;
  appliesTo: string;
  description?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
  updatedByName?: string | null;
  updatedAt?: string | null;
  /** Raw lifecycle status (holidays/vacations are always "active"). */
  statusValue: EventStatus;
  /** Display label for `statusValue`. */
  status: string;
  /** Only live (active) entries appear on the month/week/upcoming views. */
  isLive: boolean;
  /** For event entries: the raw event_type (drives per-type colors). */
  eventType?: SchoolEventType;
  raw: Holiday | ExamWindow | SchoolEvent | AcademicTerm;
}

function statusFields(status: EventStatus): {
  statusValue: EventStatus;
  status: string;
  isLive: boolean;
} {
  return {
    statusValue: status,
    status: labelFor(EVENT_STATUS_OPTIONS, status),
    isLive: status === "active",
  };
}

export const ENTRY_KIND_OPTIONS: { value: CalendarEntryKind; label: string }[] = [
  { value: "holiday", label: "Public Holidays" },
  { value: "vacation", label: "Vacations" },
  { value: "exam", label: "Examinations" },
  { value: "event", label: "School Events" },
  { value: "semester", label: "Semesters" },
];

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  national: "National Holiday",
  public: "Public Holiday",
  regional: "Regional Holiday",
  school: "School Holiday",
  optional: "Optional Holiday",
};

/** Dot/chip color classes per entry — the single source of the ERP-wide
 * calendar color scheme (matches the month grid legend). */
export function entryColorClass(entry: Pick<CalendarEntry, "kind" | "eventType">): string {
  switch (entry.kind) {
    case "holiday":
      return "bg-red-500";
    case "vacation":
      return "bg-violet-500";
    case "exam":
      return "bg-blue-500";
    case "semester":
      return "bg-blue-900";
    case "event":
      switch (entry.eventType) {
        case "training":
          return "bg-yellow-500";
        case "meeting":
          return "bg-pink-500";
        default:
          return "bg-amber-500";
      }
  }
}

interface BuildEntriesInput {
  holidays: Holiday[];
  examWindows: ExamWindow[];
  events: SchoolEvent[];
  terms: AcademicTerm[];
}

export function buildCalendarEntries({
  holidays,
  examWindows,
  events,
  terms,
}: BuildEntriesInput): CalendarEntry[] {
  const entries: CalendarEntry[] = [];

  for (const h of holidays) {
    // Weekly-off rows (recurring + materialized Saturdays) are shading, not
    // manageable entries; skip them in the entries layer.
    if (h.is_recurring || h.holiday_type === "weekly_off" || !h.start_date) continue;
    const isVacation = h.holiday_type === "vacation";
    entries.push({
      key: `${isVacation ? "vacation" : "holiday"}:${h.id}`,
      id: h.id,
      kind: isVacation ? "vacation" : "holiday",
      name: h.name,
      startDate: h.start_date,
      endDate: h.end_date || h.start_date,
      typeLabel: isVacation
        ? "Vacation"
        : HOLIDAY_TYPE_LABELS[h.holiday_type] ?? h.holiday_type,
      appliesTo: labelFor(APPLIES_TO_OPTIONS, h.applies_to ?? "entire_school"),
      description: h.description,
      createdByName: h.created_by_name,
      createdAt: h.created_at,
      updatedByName: h.updated_by_name,
      updatedAt: h.updated_at,
      // Holidays/vacations have no lifecycle status — they are always live.
      ...statusFields("active"),
      raw: h,
    });
  }

  for (const w of examWindows) {
    entries.push({
      key: `exam:${w.id}`,
      id: w.id,
      kind: "exam",
      name: w.name,
      startDate: w.start_date,
      endDate: w.end_date,
      typeLabel: labelFor(EXAM_TYPE_OPTIONS, w.exam_type),
      // Null and empty both mean the window applies to the whole school.
      appliesTo: w.applicable_class_ids?.length
        ? `${w.applicable_class_ids.length} classes`
        : "All classes",
      description: w.description,
      createdByName: w.created_by_name,
      createdAt: w.created_at,
      updatedByName: w.updated_by_name,
      updatedAt: w.updated_at,
      ...statusFields(w.status),
      raw: w,
    });
  }

  for (const e of events) {
    entries.push({
      key: `event:${e.id}`,
      id: e.id,
      kind: "event",
      name: e.name,
      startDate: e.event_date,
      endDate: e.event_date,
      typeLabel: labelFor(EVENT_TYPE_OPTIONS, e.event_type),
      appliesTo: labelFor(APPLIES_TO_OPTIONS, e.applies_to),
      description: e.description,
      createdByName: e.created_by_name,
      createdAt: e.created_at,
      updatedByName: e.updated_by_name,
      updatedAt: e.updated_at,
      ...statusFields(e.status),
      eventType: e.event_type,
      raw: e,
    });
  }

  for (const t of terms) {
    entries.push({
      key: `semester:${t.id}`,
      id: t.id,
      kind: "semester",
      name: t.name,
      startDate: t.start_date,
      endDate: t.end_date,
      typeLabel: "Semester",
      appliesTo: "Entire School",
      ...statusFields(t.is_active ? "active" : "archived"),
      raw: t,
    });
  }

  return entries.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export interface EntryFilters {
  search: string;
  kinds: CalendarEntryKind[]; // empty = all
  statuses: EventStatus[]; // empty = all
}

export function filterEntries(
  entries: CalendarEntry[],
  { search, kinds, statuses }: EntryFilters,
): CalendarEntry[] {
  const query = search.trim().toLowerCase();
  return entries.filter((entry) => {
    if (kinds.length && !kinds.includes(entry.kind)) return false;
    if (statuses.length && !statuses.includes(entry.statusValue)) return false;
    if (query && !entry.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function entriesOnDate(entries: CalendarEntry[], iso: string): CalendarEntry[] {
  return entries.filter((e) => e.startDate <= iso && iso <= e.endDate);
}
