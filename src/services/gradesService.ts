import { apiDelete, apiPatch, apiPost } from "@/services/api";

export interface Grade {
  id: string;
  name: string;
  sequence: number;
}

export const gradesService = {
  create: (data: Partial<Grade>) => apiPost<Grade>("/api/grades/", data),
  update: (id: string, data: Partial<Grade>) =>
    apiPatch<Grade>(`/api/grades/${id}`, data),
  remove: (id: string) => apiDelete<void>(`/api/grades/${id}`),
};
