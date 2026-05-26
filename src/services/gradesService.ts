import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";

export interface Grade {
  id: string;
  name: string;
  sequence: number;
}

export const gradesService = {
  list: () => apiGet<Grade[]>("/api/grades/"),
  create: (data: Partial<Grade>) => apiPost<Grade>("/api/grades/", data),
  update: (id: string, data: Partial<Grade>) =>
    apiPatch<Grade>(`/api/grades/${id}`, data),
  remove: (id: string) => apiDelete<void>(`/api/grades/${id}`),
};
