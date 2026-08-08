/**
 * Subjects.
 *
 * The catalogue read is GraphQL; the single-subject read and the writes are
 * still REST. The result goes through an explicit node → client mapper rather
 * than a type assertion — the schema is camelCase and these types are
 * snake_case, and `tsc` believes an assertion right up until a person looks at
 * the screen.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import { gql } from "@/services/graphql";
import type {
  Subject,
  SubjectListItem,
  SubjectType,
  CreateSubjectInput,
  SubjectsListParams,
  SubjectsListResult,
  UpdateSubjectInput,
} from "@/types/subject";

const CATALOGUE = `
  query SubjectCatalogue(
    $first: Int!, $offset: Int, $orderBy: SubjectOrder!,
    $direction: SubjectOrderDirection!, $where: SubjectFilter
  ) {
    subjectCatalogue(
      first: $first, offset: $offset, orderBy: $orderBy,
      direction: $direction, where: $where
    ) {
      totalCount
      nodes {
        id name code description subjectType isActive
        classes {
          classSubjectId classId className gradeName
          programmeId programmeName weeklyPeriods isMandatory
        }
        programmes { id name }
      }
    }
  }
`;

type CatalogueNode = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  subjectType: string | null;
  isActive: boolean;
  classes: {
    classSubjectId: string;
    classId: string;
    className: string | null;
    gradeName: string | null;
    programmeId: string | null;
    programmeName: string | null;
    weeklyPeriods: number;
    isMandatory: boolean;
  }[];
  programmes: { id: string; name: string | null }[];
};

function toSubjectListItem(node: CatalogueNode): SubjectListItem {
  return {
    id: node.id,
    name: node.name,
    code: node.code ?? undefined,
    description: node.description ?? undefined,
    subject_type: (node.subjectType as SubjectType | null) ?? undefined,
    is_active: node.isActive,
    classes: node.classes.map((held) => ({
      class_subject_id: held.classSubjectId,
      class_id: held.classId,
      class_name: held.className,
      grade_name: held.gradeName,
      programme_id: held.programmeId,
      programme_name: held.programmeName,
      weekly_periods: held.weeklyPeriods,
      is_mandatory: held.isMandatory,
    })),
    programmes: node.programmes.map((programme) => ({
      id: programme.id,
      name: programme.name,
    })),
  };
}

/** Mirrors `SubjectOrder` in the schema. */
const ORDER_FIELD: Record<NonNullable<SubjectsListParams["sortBy"]>, string> = {
  name: "NAME",
  code: "CODE",
  subject_type: "SUBJECT_TYPE",
  created_at: "CREATED_AT",
  updated_at: "UPDATED_AT",
};

/** The server's page cap. Asking for more is not refused, only trimmed. */
const MAX_PER_PAGE = 100;

export const subjectsService = {
  /** One page of the catalogue, in the envelope the table already reads. */
  listSubjects: async (
    params: SubjectsListParams,
  ): Promise<SubjectsListResult> => {
    const page = params.page ?? 1;
    const perPage = Math.min(params.perPage ?? 20, MAX_PER_PAGE);

    const where: Record<string, unknown> = {};
    if (params.search?.trim()) where.search = params.search.trim();
    if (params.subjectType) where.subjectType = params.subjectType.toUpperCase();
    if (params.includeInactive) where.includeInactive = true;

    const data = await gql<{
      subjectCatalogue: { totalCount: number; nodes: CatalogueNode[] };
    }>(CATALOGUE, {
      first: perPage,
      offset: (page - 1) * perPage,
      orderBy: ORDER_FIELD[params.sortBy ?? "name"],
      direction: (params.sortDir ?? "asc").toUpperCase(),
      where,
    });

    const total = data.subjectCatalogue.totalCount;
    return {
      items: data.subjectCatalogue.nodes.map(toSubjectListItem),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    };
  },

  getSubject: async (id: string): Promise<Subject> => {
    return apiGet<Subject>(`/api/subjects/${id}`);
  },

  createSubject: async (data: CreateSubjectInput): Promise<Subject> => {
    return apiPost<Subject>("/api/subjects/", data);
  },

  updateSubject: async (
    id: string,
    data: UpdateSubjectInput
  ): Promise<Subject> => {
    return apiPut<Subject>(`/api/subjects/${id}`, data);
  },

  deleteSubject: async (id: string): Promise<void> => {
    await apiDelete(`/api/subjects/${id}`);
  },
};
