/**
 * Reconciling records that describe one human.
 *
 * A parent recorded once at admission and again when a second child arrives;
 * a teacher re-entered by a bulk import. Ordinary events in a school, and
 * ones only a person can judge — a household shares a phone, so looking alike
 * is a question rather than an answer.
 *
 * Nothing here merges on its own. Suggestions are computed when asked, so the
 * list cannot go stale behind a merge somebody else just made.
 */

import { gql } from "./graphql";

export interface PersonSummary {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  email: string | null;
  hasAccount: boolean;
  isEmployed: boolean;
  isStudent: boolean;
}

export interface DuplicateSuggestion {
  person: PersonSummary;
  other: PersonSummary;
  reason: string;
  /** Why these two cannot be combined, if they cannot. */
  blockedReason: string | null;
}

export interface MergeResult {
  personId: string;
  fullName: string;
  merge: {
    id: string;
    keptPersonId: string;
    absorbedPersonId: string;
    reason: string | null;
    mergedAt: string;
  };
}

const PERSON = `
  id fullName dateOfBirth phoneNumber email hasAccount isEmployed isStudent
`;

const SUGGESTIONS = `
  query DuplicateSuggestions($limit: Int!) {
    duplicateSuggestions(limit: $limit) {
      reason
      blockedReason
      person { ${PERSON} }
      other { ${PERSON} }
    }
  }
`;

const MERGE = `
  mutation MergePeople($keep: ID!, $absorb: ID!, $reason: String) {
    mergePeople(keep: $keep, absorb: $absorb, reason: $reason) {
      personId
      fullName
      merge { id keptPersonId absorbedPersonId reason mergedAt }
    }
  }
`;

export const peopleMergeService = {
  suggestions: async (limit = 100): Promise<DuplicateSuggestion[]> => {
    const data = await gql<{ duplicateSuggestions: DuplicateSuggestion[] }>(
      SUGGESTIONS,
      { limit },
    );
    return data.duplicateSuggestions;
  },

  merge: async (input: {
    keep: string;
    absorb: string;
    reason?: string;
  }): Promise<MergeResult> => {
    const data = await gql<{ mergePeople: MergeResult }>(MERGE, input);
    return data.mergePeople;
  },
};
