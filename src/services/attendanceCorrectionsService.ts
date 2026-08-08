/**
 * Changing attendance that has already been settled.
 *
 * Not an edit. A correction carries what the register said, what it should
 * say, why, who asked and who decided — because the point of the workflow is
 * that a changed mark can be accounted for afterwards.
 *
 * Whether a request waits for a decision is the school's own setting. Someone
 * who could approve it does not have to ask themselves, so `applied` may come
 * back true on the request itself.
 */

import { gql } from "./graphql";

export interface AttendanceCorrection {
  id: string;
  attendanceRecordId: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  status: "requested" | "approved" | "rejected" | string;
  requestedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  studentId: string | null;
  studentName: string | null;
  className: string | null;
  sessionDate: string | null;
  requestedByName: string | null;
  decidedByName: string | null;
}

const FIELDS = `
  id attendanceRecordId fromStatus toStatus reason status
  requestedAt decidedAt decisionNote
  studentId studentName className sessionDate requestedByName decidedByName
`;

const PENDING = `query PendingCorrections { pendingAttendanceCorrections { ${FIELDS} } }`;

const FOR_RECORD = `
  query RecordCorrections($recordId: ID!) {
    attendanceRecordCorrections(recordId: $recordId) { ${FIELDS} }
  }
`;

const REQUEST = `
  mutation RequestCorrection($recordId: ID!, $toStatus: String!, $reason: String!) {
    requestAttendanceCorrection(recordId: $recordId, toStatus: $toStatus, reason: $reason) {
      applied
      correction { ${FIELDS} }
    }
  }
`;

const APPROVE = `
  mutation ApproveCorrection($id: ID!, $note: String) {
    approveAttendanceCorrection(id: $id, note: $note) { ${FIELDS} }
  }
`;

const REJECT = `
  mutation RejectCorrection($id: ID!, $note: String) {
    rejectAttendanceCorrection(id: $id, note: $note) { ${FIELDS} }
  }
`;

export const attendanceCorrectionsService = {
  /** What is waiting on a decision. */
  pending: async (): Promise<AttendanceCorrection[]> => {
    const data = await gql<{ pendingAttendanceCorrections: AttendanceCorrection[] }>(
      PENDING,
    );
    return data.pendingAttendanceCorrections;
  },

  /** Every change ever asked for on one register entry, oldest first. */
  forRecord: async (recordId: string): Promise<AttendanceCorrection[]> => {
    const data = await gql<{ attendanceRecordCorrections: AttendanceCorrection[] }>(
      FOR_RECORD,
      { recordId },
    );
    return data.attendanceRecordCorrections;
  },

  request: async (input: {
    recordId: string;
    toStatus: string;
    reason: string;
  }): Promise<{ applied: boolean; correction: AttendanceCorrection }> => {
    const data = await gql<{
      requestAttendanceCorrection: {
        applied: boolean;
        correction: AttendanceCorrection;
      };
    }>(REQUEST, input);
    return data.requestAttendanceCorrection;
  },

  approve: async (input: { id: string; note?: string }) => {
    const data = await gql<{ approveAttendanceCorrection: AttendanceCorrection }>(
      APPROVE,
      input,
    );
    return data.approveAttendanceCorrection;
  },

  reject: async (input: { id: string; note?: string }) => {
    const data = await gql<{ rejectAttendanceCorrection: AttendanceCorrection }>(
      REJECT,
      input,
    );
    return data.rejectAttendanceCorrection;
  },
};
