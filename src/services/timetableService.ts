import { gql } from "@/services/graphql";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/api";
import type {
  TimetableVersion,
  TimetableEntry,
  TimetableBundle,
  ClassSubjectOffering,
  SubjectTeacherAssignment,
  GenerateTimetableResult,
} from "@/types/timetable";

const VERSION_FIELDS = `
  id classId label status bellScheduleId effectiveFrom effectiveTo
`;

const VERSIONS = `
  query TimetableVersions($classId: ID!, $includeDrafts: Boolean!) {
    timetableVersions(classId: $classId, includeDrafts: $includeDrafts) {
      ${VERSION_FIELDS}
    }
  }
`;

const TIMETABLE = `
  query Timetable($classId: ID!, $versionId: ID) {
    timetable(classId: $classId, versionId: $versionId) {
      editable
      workingDays
      version { ${VERSION_FIELDS} }
      bellSchedule {
        id name
        lessonPeriods {
          id bellScheduleId periodNumber periodKind label startsAt endsAt
          sortOrder
        }
      }
      entries {
        id timetableVersionId dayOfWeek periodNumber periodLabel periodName
        startsAt endsAt classSubjectId classSubjectTeacherId subjectName
        teacherId teacherName room entryStatus editable notes conflictFlags
      }
    }
  }
`;

type VersionNode = {
  id: string;
  classId: string;
  label: string | null;
  status: string;
  bellScheduleId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

/** Explicit, and NOT cast through `unknown` — a cast is what let an
 *  incomplete calendar mapper reach the browser and throw on mount. */
function toVersion(node: VersionNode): TimetableVersion {
  return {
    id: node.id,
    class_id: node.classId,
    label: node.label,
    status: node.status as TimetableVersion["status"],
    bell_schedule_id: node.bellScheduleId,
    effective_from: node.effectiveFrom,
    effective_to: node.effectiveTo,
  };
}

const enc = encodeURIComponent;

export const timetableService = {
  // ── Versions ─────────────────────────────────────────────────────────────

  listVersions: async (classId: string): Promise<{ items: TimetableVersion[] }> => {
    const data = await gql<{ timetableVersions: VersionNode[] }>(VERSIONS, {
      classId,
      includeDrafts: true,
    });
    return { items: data.timetableVersions.map(toVersion) };
  },

  createVersion: (
    classId: string,
    body: {
      label?: string | null;
      bell_schedule_id?: string | null;
      status?: string;
      effective_from?: string | null;
      effective_to?: string | null;
    }
  ) =>
    apiPost<TimetableVersion>(
      `/api/classes/${enc(classId)}/timetable/versions`,
      body
    ),

  patchVersion: (
    classId: string,
    versionId: string,
    body: {
      label?: string | null;
      bell_schedule_id?: string | null;
      effective_from?: string | null;
      effective_to?: string | null;
    }
  ) =>
    apiPatch<TimetableVersion>(
      `/api/classes/${enc(classId)}/timetable/versions/${enc(versionId)}`,
      body
    ),

  activateVersion: (classId: string, versionId: string) =>
    apiPost<TimetableVersion>(
      `/api/classes/${enc(classId)}/timetable/versions/${enc(versionId)}/activate`,
      {}
    ),

  cloneVersion: (classId: string, body?: { label?: string | null }) =>
    apiPost<TimetableVersion>(
      `/api/classes/${enc(classId)}/timetable/versions/clone`,
      body ?? {}
    ),

  deleteVersion: (classId: string, versionId: string) =>
    apiDelete<{ message?: string }>(
      `/api/classes/${enc(classId)}/timetable/versions/${enc(versionId)}`
    ),

  // ── Bundle (grid data) ────────────────────────────────────────────────────

  getBundle: async (
    classId: string,
    versionId?: string | null,
  ): Promise<TimetableBundle> => {
    const data = await gql<{
      timetable: {
        editable: boolean;
        workingDays: number[];
        version: VersionNode | null;
        bellSchedule: {
          id: string;
          name: string;
          lessonPeriods: {
            id: string;
            bellScheduleId: string | null;
            periodNumber: number | null;
            periodKind: string | null;
            label: string | null;
            startsAt: string | null;
            endsAt: string | null;
            sortOrder: number | null;
          }[];
        } | null;
        entries: {
          id: string;
          timetableVersionId: string | null;
          dayOfWeek: number;
          periodNumber: number | null;
          periodLabel: string | null;
          periodName: string | null;
          startsAt: string | null;
          endsAt: string | null;
          classSubjectId: string | null;
          classSubjectTeacherId: string | null;
          subjectName: string | null;
          teacherId: string | null;
          teacherName: string | null;
          room: string | null;
          entryStatus: string | null;
          editable: boolean;
          notes: string | null;
          conflictFlags: string[];
        }[];
      };
    }>(TIMETABLE, { classId, versionId: versionId ?? null });

    const t = data.timetable;
    return {
      timetable_version: t.version ? toVersion(t.version) : null,
      working_days: t.workingDays,
      editable: t.editable,
      bell_schedule: t.bellSchedule
        ? {
            id: t.bellSchedule.id,
            name: t.bellSchedule.name,
            lesson_periods: t.bellSchedule.lessonPeriods.map((p) => ({
              id: p.id,
              bell_schedule_id: p.bellScheduleId ?? "",
              period_number: p.periodNumber ?? 0,
              period_kind: p.periodKind ?? "",
              starts_at: p.startsAt,
              ends_at: p.endsAt,
              label: p.label,
              sort_order: p.sortOrder ?? 0,
            })),
          }
        : null,
      items: t.entries.map((e) => ({
        id: e.id,
        timetable_version_id: e.timetableVersionId ?? "",
        class_subject_id: e.classSubjectId ?? "",
        subject_name: e.subjectName,
        subject_code: null,
        teacher_id: e.teacherId ?? "",
        teacher_name: e.teacherName,
        day_of_week: e.dayOfWeek,
        period_number: e.periodNumber ?? 0,
        room: e.room,
        notes: e.notes,
        entry_status: e.entryStatus ?? "",
        period_label: e.periodLabel,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        editable: e.editable,
        conflict_flags: e.conflictFlags,
      })),
    };
  },

  // ── Entries ───────────────────────────────────────────────────────────────

  createEntry: (
    classId: string,
    body: {
      timetable_version_id: string;
      class_subject_id: string;
      teacher_id: string;
      day_of_week: number;
      period_number: number;
      room?: string | null;
      notes?: string | null;
    }
  ) =>
    apiPost<TimetableEntry>(
      `/api/classes/${enc(classId)}/timetable/entries`,
      body
    ),

  patchEntry: (
    classId: string,
    entryId: string,
    body: Partial<{
      class_subject_id: string;
      teacher_id: string;
      day_of_week: number;
      period_number: number;
      room: string | null;
      notes: string | null;
    }>
  ) =>
    apiPatch<TimetableEntry>(
      `/api/classes/${enc(classId)}/timetable/entries/${enc(entryId)}`,
      body
    ),

  deleteEntry: (classId: string, entryId: string) =>
    apiDelete<{ message?: string }>(
      `/api/classes/${enc(classId)}/timetable/entries/${enc(entryId)}`
    ),

  moveEntry: (
    classId: string,
    entryId: string,
    body: { day_of_week: number; period_number: number }
  ) =>
    apiPost<TimetableEntry>(
      `/api/classes/${enc(classId)}/timetable/entries/${enc(entryId)}/move`,
      body
    ),

  swapEntries: (
    classId: string,
    body: { entry_a_id: string; entry_b_id: string }
  ) =>
    apiPost<{ entry_a: TimetableEntry; entry_b: TimetableEntry }>(
      `/api/classes/${enc(classId)}/timetable/entries/swap`,
      body
    ),

  // ── Generation ────────────────────────────────────────────────────────────

  generate: (
    classId: string,
    body?: {
      timetable_version_id?: string;
      label?: string | null;
      bell_schedule_id?: string | null;
    }
  ) =>
    apiPost<GenerateTimetableResult>(
      `/api/classes/${enc(classId)}/timetable/generate`,
      body ?? {}
    ),

  // ── Class subjects + teachers (for entry editor dropdowns) ────────────────

  listClassSubjects: (classId: string) =>
    apiGet<{ items: ClassSubjectOffering[] }>(
      `/api/classes/${enc(classId)}/subjects`
    ),

  listSubjectTeachers: (classId: string) =>
    apiGet<{ items: SubjectTeacherAssignment[] }>(
      `/api/classes/${enc(classId)}/subject-teachers`
    ),
};
