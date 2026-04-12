import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import type {
  Subject,
  CreateSubjectInput,
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
