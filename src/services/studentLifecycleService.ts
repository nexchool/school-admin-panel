/**
 * What the school does to a student, over GraphQL.
 *
 * These are acts, not edits. Withdrawing a student closes their place in a
 * class, records the date and the reason, and stops the school being billed
 * for them — which is why none of it is reachable by setting a status field.
 * The server refuses `withdrawn`, `graduated` and `transferred` on an
 * ordinary update for exactly that reason.
 *
 * First module on the GraphQL transport. The conventions it follows are in
 * `server/docs/architecture/graphql-conventions.md`.
 */

import { gql } from "./graphql";

/** The student as these operations return them — enough to confirm the act. */
export interface LifecycleStudent {
  id: string;
  admissionNumber: string;
  fullName: string;
  status: string | null;
  currentClass: { id: string; name: string | null; section: string | null } | null;
}

const STUDENT_RESULT = `
  id
  admissionNumber
  fullName
  status
  currentClass { id name section }
`;

/** Fields every act shares: when it happened, and why. */
export interface LifecycleInput {
  id: string;
  reason?: string;
  /** ISO date (YYYY-MM-DD). Defaults to today, server-side. */
  occurredOn?: string;
}

export interface ReEnrollInput extends LifecycleInput {
  classId: string;
  academicYearId?: string;
}

export interface TransferSectionInput extends LifecycleInput {
  toClassId: string;
}

export interface TransferOutInput extends LifecycleInput {
  destinationSchool?: string;
}

const WITHDRAW = `
  mutation WithdrawStudent($id: ID!, $reason: String, $occurredOn: Date) {
    withdrawStudent(id: $id, reason: $reason, occurredOn: $occurredOn) { ${STUDENT_RESULT} }
  }
`;

const GRADUATE = `
  mutation GraduateStudent($id: ID!, $reason: String, $occurredOn: Date) {
    graduateStudent(id: $id, reason: $reason, occurredOn: $occurredOn) { ${STUDENT_RESULT} }
  }
`;

const RE_ENROLL = `
  mutation ReEnrollStudent(
    $id: ID!, $classId: ID!, $academicYearId: ID, $reason: String, $occurredOn: Date
  ) {
    reEnrollStudent(
      id: $id, classId: $classId, academicYearId: $academicYearId,
      reason: $reason, occurredOn: $occurredOn
    ) { ${STUDENT_RESULT} }
  }
`;

const TRANSFER_TO_SECTION = `
  mutation TransferStudentToSection(
    $id: ID!, $toClassId: ID!, $reason: String, $occurredOn: Date
  ) {
    transferStudentToSection(
      id: $id, toClassId: $toClassId, reason: $reason, occurredOn: $occurredOn
    ) { ${STUDENT_RESULT} }
  }
`;

const TRANSFER_OUT = `
  mutation TransferStudentOut(
    $id: ID!, $destinationSchool: String, $reason: String, $occurredOn: Date
  ) {
    transferStudentOut(
      id: $id, destinationSchool: $destinationSchool,
      reason: $reason, occurredOn: $occurredOn
    ) { ${STUDENT_RESULT} }
  }
`;

export const studentLifecycleService = {
  /** A student leaves before completing their education. */
  withdraw: async (input: LifecycleInput): Promise<LifecycleStudent> => {
    const data = await gql<{ withdrawStudent: LifecycleStudent }>(WITHDRAW, { ...input });
    return data.withdrawStudent;
  },

  /** A student completes their education. */
  graduate: async (input: LifecycleInput): Promise<LifecycleStudent> => {
    const data = await gql<{ graduateStudent: LifecycleStudent }>(GRADUATE, { ...input });
    return data.graduateStudent;
  },

  /**
   * A student who left comes back. Not a re-admission — the same person, the
   * same admission number, a new placement.
   */
  reEnroll: async (input: ReEnrollInput): Promise<LifecycleStudent> => {
    const data = await gql<{ reEnrollStudent: LifecycleStudent }>(RE_ENROLL, { ...input });
    return data.reEnrollStudent;
  },

  /** A student moves to another section of the same year — 8A to 8B. */
  transferToSection: async (
    input: TransferSectionInput,
  ): Promise<LifecycleStudent> => {
    const data = await gql<{ transferStudentToSection: LifecycleStudent }>(
      TRANSFER_TO_SECTION,
      { ...input },
    );
    return data.transferStudentToSection;
  },

  /** A student leaves this school for another one. */
  transferOut: async (input: TransferOutInput): Promise<LifecycleStudent> => {
    const data = await gql<{ transferStudentOut: LifecycleStudent }>(
      TRANSFER_OUT,
      { ...input },
    );
    return data.transferStudentOut;
  },
};
