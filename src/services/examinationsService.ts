/**
 * Examinations over GraphQL.
 *
 * Thin on purpose: eight slices of invariants live in the server's examination
 * services, and the one thing this layer must never do is re-decide any of
 * them. In particular it does **not** resolve which offering teaches a subject
 * in a section — the server does that (`expand_subject_set`), because a
 * paper's class is derived from its offering and a client resolving it badly
 * would be a client inventing a paper's class.
 *
 * Field names match the GraphQL type exactly, so there is nothing to map.
 */

import { apiGetBlob, apiPostForm } from "./api";
import { gql } from "./graphql";
import type {
  CorrectionStatus,
  ExaminationResults,
  CreateExaminationInput,
  ImportSummary,
  MarksImportPreview,
  MarkCorrection,
  MarkEntry,
  MarkingRegister,
  ExamType,
  Examination,
  ExaminationListFilters,
  ExaminationPage,
  SubjectSet,
  UpdateExaminationInput,
} from "@/types/examination";

const EXAMINATION_FIELDS = `
  id name status description
  academicCycleId academicTermId examTypeId gradingSchemeId examWindowId
`;

const PAPER_FIELDS = `
  id classId classSubjectId subjectName className componentLabel
  examDate startsAt endsAt maxMarks passMarks marksLocked
`;

const EXAMINATIONS = `
  query Examinations($academicCycleId: ID, $status: String, $limit: Int!, $offset: Int!) {
    examinations(
      academicCycleId: $academicCycleId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      nodes { ${EXAMINATION_FIELDS} classesSitting }
      hasNextPage
      totalCount
    }
  }
`;

const EXAMINATION = `
  query Examination($id: ID!) {
    examination(id: $id) {
      ${EXAMINATION_FIELDS}
      classesSitting
      papers { ${PAPER_FIELDS} }
      timeline { id eventName occurredOn note actorUserId }
    }
  }
`;

const EXAM_TYPES = `
  query ExamTypes { examTypes { id name code sequence } }
`;

const CREATE_EXAMINATION = `
  mutation CreateExamination($input: CreateExaminationInput!) {
    createExamination(input: $input) {
      ${EXAMINATION_FIELDS}
      papers { ${PAPER_FIELDS} }
    }
  }
`;

const ADD_EXAM_PAPERS = `
  mutation AddExamPapers($examinationId: ID!, $subjectSet: SubjectSetInput!) {
    addExamPapers(examinationId: $examinationId, subjectSet: $subjectSet) {
      ${EXAMINATION_FIELDS}
      papers { ${PAPER_FIELDS} }
    }
  }
`;

const UPDATE_EXAMINATION = `
  mutation UpdateExamination($id: ID!, $input: UpdateExaminationInput!) {
    updateExamination(id: $id, input: $input) { ${EXAMINATION_FIELDS} }
  }
`;

const SCHEDULE_EXAMINATION = `
  mutation ScheduleExamination($id: ID!) {
    scheduleExamination(id: $id) { ${EXAMINATION_FIELDS} }
  }
`;

const CANCEL_EXAMINATION = `
  mutation CancelExamination($id: ID!, $reason: String!) {
    cancelExamination(id: $id, reason: $reason) { ${EXAMINATION_FIELDS} }
  }
`;

const REGISTER_FIELDS = `
  paper { ${PAPER_FIELDS} }
  examinationId examinationName examinationStatus
  openForMarking
  progress { eligible recorded outstanding locked cohortSource }
  students {
    studentId markId admissionNumber fullName rollNumber status marksObtained remarks
  }
`;

const MARKING_REGISTER = `
  query MarkingRegister($examPaperId: ID!) {
    markingRegister(examPaperId: $examPaperId) { ${REGISTER_FIELDS} }
  }
`;

const RECORD_MARKS = `
  mutation RecordMarks($examPaperId: ID!, $rows: [MarkEntryInput!]!) {
    recordMarks(examPaperId: $examPaperId, rows: $rows) { ${REGISTER_FIELDS} }
  }
`;

const CORRECTION_FIELDS = `
  id examMarkId status
  fromStatus toStatus fromMarks toMarks reason
  studentId admissionNumber fullName
  examPaperId className subjectName examinationId examinationName maxMarks
  requestedByUserId requestedByName requestedAt
  decidedByUserId decidedByName decidedAt decisionNote
`;

const MARK_CORRECTIONS = `
  query MarkCorrections($status: String) {
    markCorrections(status: $status) { ${CORRECTION_FIELDS} }
  }
`;

const CORRECTIONS_FOR_MARK = `
  query CorrectionsForMark($examMarkId: ID!) {
    correctionsForMark(examMarkId: $examMarkId) { ${CORRECTION_FIELDS} }
  }
`;

const REQUEST_CORRECTION = `
  mutation RequestMarkCorrection(
    $examMarkId: ID!, $toStatus: String!, $toMarks: Float, $reason: String!
  ) {
    requestMarkCorrection(
      examMarkId: $examMarkId, toStatus: $toStatus, toMarks: $toMarks, reason: $reason
    ) { ${CORRECTION_FIELDS} }
  }
`;

const APPROVE_CORRECTION = `
  mutation ApproveMarkCorrection($correctionId: ID!, $note: String) {
    approveMarkCorrection(correctionId: $correctionId, note: $note) {
      ${CORRECTION_FIELDS}
    }
  }
`;

const REJECT_CORRECTION = `
  mutation RejectMarkCorrection($correctionId: ID!, $note: String) {
    rejectMarkCorrection(correctionId: $correctionId, note: $note) {
      ${CORRECTION_FIELDS}
    }
  }
`;

const RESULT_VERSION_FIELDS = `
  id version isCurrent publishedAt publishedByUserId revisionReason
  totalMax totalObtained percentage gradeLabel isPass complete warnings
`;

const RESULTS_FIELDS = `
  examinationId examinationName examinationStatus
  readyToPublish cohort calculated published revisionPending
  blocked { studentId code }
  students {
    studentId admissionNumber fullName hasResult revisionPending
    official { ${RESULT_VERSION_FIELDS} }
    current { ${RESULT_VERSION_FIELDS} }
    versions { ${RESULT_VERSION_FIELDS} }
  }
`;

const EXAMINATION_RESULTS = `
  query ExaminationResults($examinationId: ID!) {
    examinationResults(examinationId: $examinationId) { ${RESULTS_FIELDS} }
  }
`;
const CALCULATE_RESULTS = `
  mutation CalculateExaminationResults($examinationId: ID!) {
    calculateExaminationResults(examinationId: $examinationId) { ${RESULTS_FIELDS} }
  }
`;
const PUBLISH_RESULTS = `
  mutation PublishExaminationResults($examinationId: ID!) {
    publishExaminationResults(examinationId: $examinationId) { ${RESULTS_FIELDS} }
  }
`;
const REVISE_RESULT = `
  mutation ReviseStudentResult($examinationId: ID!, $studentId: ID!, $reason: String!) {
    reviseStudentResult(
      examinationId: $examinationId, studentId: $studentId, reason: $reason
    ) { ${RESULTS_FIELDS} }
  }
`;
const PUBLISH_REVISION = `
  mutation PublishStudentRevision($examinationId: ID!, $studentId: ID!) {
    publishStudentRevision(examinationId: $examinationId, studentId: $studentId) {
      ${RESULTS_FIELDS}
    }
  }
`;

export const examinationsService = {
  list: async (filters: ExaminationListFilters): Promise<ExaminationPage> => {
    const data = await gql<{ examinations: ExaminationPage }>(EXAMINATIONS, {
      academicCycleId: filters.academicCycleId ?? null,
      status: filters.status ?? null,
      limit: filters.limit,
      offset: filters.offset,
    });
    return data.examinations;
  },

  get: async (id: string): Promise<Examination | null> => {
    const data = await gql<{ examination: Examination | null }>(EXAMINATION, {
      id,
    });
    return data.examination;
  },

  examTypes: async (): Promise<ExamType[]> => {
    const data = await gql<{ examTypes: ExamType[] }>(EXAM_TYPES);
    return data.examTypes;
  },

  create: async (input: CreateExaminationInput): Promise<Examination> => {
    const data = await gql<{ createExamination: Examination }>(
      CREATE_EXAMINATION,
      { input },
    );
    return data.createExamination;
  },

  addPapers: async (
    examinationId: string,
    subjectSet: SubjectSet,
  ): Promise<Examination> => {
    const data = await gql<{ addExamPapers: Examination }>(ADD_EXAM_PAPERS, {
      examinationId,
      subjectSet,
    });
    return data.addExamPapers;
  },

  update: async (
    id: string,
    input: UpdateExaminationInput,
  ): Promise<Examination> => {
    const data = await gql<{ updateExamination: Examination }>(
      UPDATE_EXAMINATION,
      { id, input },
    );
    return data.updateExamination;
  },

  schedule: async (id: string): Promise<Examination> => {
    const data = await gql<{ scheduleExamination: Examination }>(
      SCHEDULE_EXAMINATION,
      { id },
    );
    return data.scheduleExamination;
  },

  markingRegister: async (examPaperId: string): Promise<MarkingRegister | null> => {
    const data = await gql<{ markingRegister: MarkingRegister | null }>(
      MARKING_REGISTER,
      { examPaperId },
    );
    return data.markingRegister;
  },

  /**
   * One operation for the whole register. `record_marks` is all-or-nothing, so
   * there is deliberately no per-row call to partially succeed.
   */
  recordMarks: async (
    examPaperId: string,
    rows: MarkEntry[],
  ): Promise<MarkingRegister> => {
    const data = await gql<{ recordMarks: MarkingRegister }>(RECORD_MARKS, {
      examPaperId,
      rows,
    });
    return data.recordMarks;
  },

  /**
   * Uploading a sheet is REST, and deliberately: this schema has no upload
   * scalar, and binary transfer is the one case the GraphQL conventions leave
   * to REST — the same door the student importer uses.
   */
  previewMarksSheet: async (
    examPaperId: string,
    file: File,
  ): Promise<MarksImportPreview> => {
    const form = new FormData();
    form.append("file", file);
    return apiPostForm<MarksImportPreview>(
      `/api/examinations/papers/${examPaperId}/marks/preview`,
      form,
    );
  },

  importMarksSheet: async (
    examPaperId: string,
    file: File,
  ): Promise<{ imported: number; summary: ImportSummary }> => {
    const form = new FormData();
    form.append("file", file);
    return apiPostForm<{ imported: number; summary: ImportSummary }>(
      `/api/examinations/papers/${examPaperId}/marks/import`,
      form,
    );
  },

  marksTemplate: async (examPaperId: string): Promise<Blob> =>
    apiGetBlob(`/api/examinations/papers/${examPaperId}/marks/template`),

  markCorrections: async (
    status: CorrectionStatus | null = "requested",
  ): Promise<MarkCorrection[]> => {
    const data = await gql<{ markCorrections: MarkCorrection[] }>(
      MARK_CORRECTIONS,
      { status },
    );
    return data.markCorrections;
  },

  correctionsForMark: async (examMarkId: string): Promise<MarkCorrection[]> => {
    const data = await gql<{ correctionsForMark: MarkCorrection[] }>(
      CORRECTIONS_FOR_MARK,
      { examMarkId },
    );
    return data.correctionsForMark;
  },

  requestMarkCorrection: async (input: {
    examMarkId: string;
    toStatus: string;
    toMarks?: number | null;
    reason: string;
  }): Promise<MarkCorrection> => {
    const data = await gql<{ requestMarkCorrection: MarkCorrection }>(
      REQUEST_CORRECTION,
      input,
    );
    return data.requestMarkCorrection;
  },

  approveMarkCorrection: async (
    correctionId: string,
    note?: string | null,
  ): Promise<MarkCorrection> => {
    const data = await gql<{ approveMarkCorrection: MarkCorrection }>(
      APPROVE_CORRECTION,
      { correctionId, note: note ?? null },
    );
    return data.approveMarkCorrection;
  },

  rejectMarkCorrection: async (
    correctionId: string,
    note?: string | null,
  ): Promise<MarkCorrection> => {
    const data = await gql<{ rejectMarkCorrection: MarkCorrection }>(
      REJECT_CORRECTION,
      { correctionId, note: note ?? null },
    );
    return data.rejectMarkCorrection;
  },

  examinationResults: async (
    examinationId: string,
  ): Promise<ExaminationResults | null> => {
    const data = await gql<{ examinationResults: ExaminationResults | null }>(
      EXAMINATION_RESULTS,
      { examinationId },
    );
    return data.examinationResults;
  },

  calculateResults: async (examinationId: string): Promise<ExaminationResults> => {
    const data = await gql<{ calculateExaminationResults: ExaminationResults }>(
      CALCULATE_RESULTS,
      { examinationId },
    );
    return data.calculateExaminationResults;
  },

  publishResults: async (examinationId: string): Promise<ExaminationResults> => {
    const data = await gql<{ publishExaminationResults: ExaminationResults }>(
      PUBLISH_RESULTS,
      { examinationId },
    );
    return data.publishExaminationResults;
  },

  reviseStudentResult: async (
    examinationId: string,
    studentId: string,
    reason: string,
  ): Promise<ExaminationResults> => {
    const data = await gql<{ reviseStudentResult: ExaminationResults }>(
      REVISE_RESULT,
      { examinationId, studentId, reason },
    );
    return data.reviseStudentResult;
  },

  publishStudentRevision: async (
    examinationId: string,
    studentId: string,
  ): Promise<ExaminationResults> => {
    const data = await gql<{ publishStudentRevision: ExaminationResults }>(
      PUBLISH_REVISION,
      { examinationId, studentId },
    );
    return data.publishStudentRevision;
  },

  /**
   * The marksheet is a file, so it is REST — the same split the XLSX import
   * follows. Always the *published* version: the server refuses to render an
   * unpublished revision, so a download can never leak a figure nobody has
   * been told.
   */
  marksheet: async (
    examinationId: string,
    studentId: string,
    version?: number,
  ): Promise<Blob> =>
    apiGetBlob(
      `/api/examinations/${examinationId}/students/${studentId}/marksheet` +
        (version ? `?version=${version}` : ""),
    ),

  cancel: async (id: string, reason: string): Promise<Examination> => {
    const data = await gql<{ cancelExamination: Examination }>(
      CANCEL_EXAMINATION,
      { id, reason },
    );
    return data.cancelExamination;
  },
};
