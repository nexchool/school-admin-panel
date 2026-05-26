import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";

export interface AcademicTerm {
  id: string;
  academic_year_id: string;
  name: string;
  code: string | null;
  sequence: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const academicTermsService = {
  list: (academicYearId?: string) =>
    apiGet<AcademicTerm[]>(
      academicYearId
        ? `/api/academics/terms?academic_year_id=${encodeURIComponent(academicYearId)}`
        : "/api/academics/terms",
    ),
  create: (data: Partial<AcademicTerm>) =>
    apiPost<AcademicTerm>("/api/academics/terms", data),
  update: (id: string, data: Partial<AcademicTerm>) =>
    apiPatch<AcademicTerm>(`/api/academics/terms/${id}`, data),
  remove: (id: string) => apiDelete<void>(`/api/academics/terms/${id}`),
};
