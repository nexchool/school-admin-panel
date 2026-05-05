import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";
import type { ActiveStatus } from "@/services/schoolUnitsService";

export interface AcademicProgramme {
  id: string;
  name: string;
  board: string;
  medium: string | null;
  medium_id?: string | null;
  code: string;
  status: ActiveStatus;
}

export const programmesService = {
  list: () => apiGet<AcademicProgramme[]>("/api/programmes/"),
  create: (data: Partial<AcademicProgramme>) =>
    apiPost<AcademicProgramme>("/api/programmes/", data),
  update: (id: string, data: Partial<AcademicProgramme>) =>
    apiPatch<AcademicProgramme>(`/api/programmes/${id}`, data),
  remove: (id: string) => apiDelete<void>(`/api/programmes/${id}`),
};
