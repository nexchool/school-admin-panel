import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/api";
import type {
  TimetableVersion,
  TimetableEntry,
  TimetableBundle,
  ClassSubjectOffering,
  SubjectTeacherAssignment,
  GenerateTimetableResult,
} from "@/types/timetable";

const enc = encodeURIComponent;

export const timetableService = {
  // ── Versions ─────────────────────────────────────────────────────────────

  listVersions: (classId: string) =>
    apiGet<{ items: TimetableVersion[] }>(
      `/api/classes/${enc(classId)}/timetable/versions`
    ),

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

  getBundle: (classId: string, versionId?: string | null) => {
    const q = versionId
      ? `/api/classes/${enc(classId)}/timetable?version_id=${enc(versionId)}`
      : `/api/classes/${enc(classId)}/timetable`;
    return apiGet<TimetableBundle>(q);
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
