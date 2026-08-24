/**
 * What the examinations screens work with.
 *
 * The names match the GraphQL type exactly (`server/modules/examinations/
 * graphql/types.py`), so there is nothing to map and nothing to get wrong —
 * the convention `academicStructureService` already follows.
 */

/** The stored decisions an examination moves through. Never derived here. */
export type ExaminationStatus =
  | "draft"
  | "scheduled"
  | "marks_entry"
  | "published"
  | "cancelled";

export interface ExamType {
  id: string;
  name: string;
  code?: string | null;
  sequence: number;
}

export interface ExamPaper {
  id: string;
  classId: string;
  classSubjectId: string;
  subjectName?: string | null;
  className?: string | null;
  componentLabel?: string | null;
  examDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxMarks: number;
  passMarks?: number | null;
  marksLocked: boolean;
}

export interface ExaminationEvent {
  id: string;
  eventName: string;
  occurredOn: string;
  note?: string | null;
  actorUserId?: string | null;
}

export interface Examination {
  id: string;
  name: string;
  status: ExaminationStatus;
  description?: string | null;
  academicCycleId: string;
  academicTermId?: string | null;
  examTypeId: string;
  gradingSchemeId?: string | null;
  examWindowId?: string | null;
  papers?: ExamPaper[];
  classesSitting?: string[];
  timeline?: ExaminationEvent[];
}

export interface ExaminationPage {
  nodes: Examination[];
  hasNextPage: boolean;
  totalCount: number;
}

export interface ExaminationListFilters {
  academicCycleId?: string | null;
  status?: ExaminationStatus | null;
  limit: number;
  offset: number;
}

/** One subject in a subject set — the same settings apply to every section. */
export interface SubjectSetEntry {
  subjectId: string;
  maxMarks: number;
  passMarks?: number | null;
  componentLabel?: string | null;
  examDate?: string | null;
}

export interface SubjectSet {
  classIds: string[];
  subjects: SubjectSetEntry[];
}

export interface CreateExaminationInput {
  academicCycleId: string;
  examTypeId: string;
  name: string;
  description?: string | null;
  academicTermId?: string | null;
  gradingSchemeId?: string | null;
  examWindowId?: string | null;
  /** Papers created in the same transaction as the examination. */
  subjectSet?: SubjectSet | null;
}

export interface UpdateExaminationInput {
  name?: string;
  description?: string | null;
  academicTermId?: string | null;
  examWindowId?: string | null;
  examTypeId?: string | null;
  gradingSchemeId?: string | null;
}

/** How each status reads on screen, and which badge tone it takes. */
export const EXAMINATION_STATUS_LABEL: Record<ExaminationStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  marks_entry: "Marks entry",
  published: "Published",
  cancelled: "Cancelled",
};


/** The canonical mark statuses. "Not entered" is the absence of a row. */
export type MarkStatus = "present" | "absent" | "exempted" | "malpractice";

export const MARK_STATUS_LABEL: Record<MarkStatus, string> = {
  present: "Present",
  absent: "Absent",
  exempted: "Exempted",
  malpractice: "Malpractice",
};

/** Only `present` carries a number. The server refuses the other three with one. */
export const STATUS_TAKES_MARKS: Record<MarkStatus, boolean> = {
  present: true,
  absent: false,
  exempted: false,
  malpractice: false,
};

export interface RegisterStudent {
  studentId: string;
  /** The mark's id, which a correction targets. Null when none exists. */
  markId?: string | null;
  admissionNumber?: string | null;
  fullName?: string | null;
  rollNumber?: number | null;
  /** Null means no mark has been recorded — never absent, never zero. */
  status: MarkStatus | null;
  marksObtained?: number | null;
  remarks?: string | null;
}

export interface MarkingProgress {
  eligible: number;
  recorded: number;
  /** Null on a closed paper: its cohort is its own marks. */
  outstanding: number | null;
  locked: boolean;
  cohortSource: string;
}

export interface MarkingRegister {
  paper: ExamPaper;
  examinationId: string;
  examinationName: string;
  examinationStatus: ExaminationStatus;
  openForMarking: boolean;
  progress: MarkingProgress;
  students: RegisterStudent[];
}

export interface MarkEntry {
  studentId: string;
  status: MarkStatus;
  marksObtained?: number | null;
}


/** One row of an import preview, as the importer reports it. */
export interface ImportPreviewRow {
  row_number: number;
  values: {
    admission_number?: string | null;
    marks?: number | string | null;
    status?: string | null;
  };
  errors: string[];
  warnings: string[];
  valid: boolean;
}

export interface ImportSummary {
  valid: number;
  invalid: number;
  total: number;
}

export interface MarksImportPreview {
  preview: ImportPreviewRow[];
  summary: ImportSummary;
}


export type CorrectionStatus = "requested" | "approved" | "rejected";

export const CORRECTION_STATUS_LABEL: Record<CorrectionStatus, string> = {
  requested: "Awaiting decision",
  approved: "Approved",
  rejected: "Rejected",
};

/** A request to change a mark on a closed paper, with the context to decide. */
export interface MarkCorrection {
  id: string;
  examMarkId: string;
  status: CorrectionStatus;
  fromStatus: MarkStatus;
  toStatus: MarkStatus;
  fromMarks?: number | null;
  toMarks?: number | null;
  reason: string;
  studentId?: string | null;
  admissionNumber?: string | null;
  fullName?: string | null;
  examPaperId?: string | null;
  className?: string | null;
  subjectName?: string | null;
  examinationId?: string | null;
  examinationName?: string | null;
  maxMarks?: number | null;
  requestedByName?: string | null;
  requestedAt?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
}


/** One version of a student's result. A published version never changes. */
export interface ExamResultVersion {
  id: string;
  version: number;
  isCurrent: boolean;
  publishedAt?: string | null;
  publishedByUserId?: string | null;
  revisionReason?: string | null;
  totalMax?: number | null;
  totalObtained?: number | null;
  percentage?: number | null;
  gradeLabel?: string | null;
  isPass?: boolean | null;
  complete: boolean;
  warnings: string[];
}

/**
 * `official` is what the school has issued; `current` is what it is working on.
 * They differ while a revision is pending, and must never be collapsed.
 */
export interface StudentResult {
  studentId: string;
  admissionNumber?: string | null;
  fullName?: string | null;
  hasResult: boolean;
  revisionPending: boolean;
  official?: ExamResultVersion | null;
  current?: ExamResultVersion | null;
  versions: ExamResultVersion[];
}

export interface ExaminationResults {
  examinationId: string;
  examinationName: string;
  examinationStatus: ExaminationStatus;
  readyToPublish: boolean;
  cohort: number;
  calculated: number;
  published: number;
  revisionPending: number;
  blocked: { studentId: string; code: string }[];
  students: StudentResult[];
}
