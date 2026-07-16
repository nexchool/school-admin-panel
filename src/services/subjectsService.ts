import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  Subject,
  CreateSubjectInput,
  SubjectsListParams,
  SubjectsListResult,
  UpdateSubjectInput,
} from "@/types/subject";

export const subjectsService = {
  getSubjects: async (opts?: {
    includeInactive?: boolean;
  }): Promise<Subject[]> => {
    const q =
      opts?.includeInactive === true ? "?include_inactive=true" : "";
    const data = await apiGet<Subject[]>(`/api/subjects/${q}`);
    return Array.isArray(data) ? data : [];
  },

  /** Paginated + searchable catalogue. Any list param switches the backend to
   *  the `{items, total, page, per_page, total_pages}` envelope. */
  listSubjects: async (
    params: SubjectsListParams
  ): Promise<SubjectsListResult> => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("per_page", String(params.perPage ?? 20));
    if (params.search?.trim()) qs.set("search", params.search.trim());
    if (params.subjectType) qs.set("subject_type", params.subjectType);
    if (params.includeInactive) qs.set("include_inactive", "true");
    if (params.sortBy) qs.set("sort_by", params.sortBy);
    if (params.sortDir) qs.set("sort_dir", params.sortDir);
    return apiGet<SubjectsListResult>(`/api/subjects/?${qs.toString()}`);
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
