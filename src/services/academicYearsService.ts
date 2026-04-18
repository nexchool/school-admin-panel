import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface AcademicsOverview {
  total_classes: number;
  total_subjects: number;
}

export const academicYearsService = {
  getOverview: async (): Promise<AcademicsOverview> => {
    const res = await apiGet<AcademicsOverview | { data: AcademicsOverview }>(
      "/api/academics/overview"
    );
    if (res && typeof res === "object" && "data" in res) {
      return (res as { data: AcademicsOverview }).data;
    }
    return res as AcademicsOverview;
  },

  getAcademicYears: async (activeOnly = false): Promise<AcademicYear[]> => {
    const url = activeOnly
      ? "/api/academics/academic-years?active_only=true"
      : "/api/academics/academic-years";
    const res = await apiGet<{ academic_years: AcademicYear[] }>(url);
    return res?.academic_years ?? [];
  },

  createAcademicYear: async (payload: {
    name: string;
    start_date: string;
    end_date: string;
    is_active?: boolean;
  }): Promise<AcademicYear> => {
    const res = await apiPost<{ academic_year?: AcademicYear }>(
      "/api/academics/academic-years",
      payload
    );
    const ay = (res as { academic_year?: AcademicYear })?.academic_year;
    if (!ay) throw new Error("Failed to create academic year");
    return ay;
  },

  updateAcademicYear: async (
    id: string,
    payload: Partial<{
      name: string;
      start_date: string;
      end_date: string;
      is_active: boolean;
    }>
  ): Promise<AcademicYear> => {
    const res = await apiPut<{ academic_year?: AcademicYear }>(
      `/api/academics/academic-years/${id}`,
      payload
    );
    const ay = (res as { academic_year?: AcademicYear })?.academic_year;
    if (!ay) throw new Error("Failed to update academic year");
    return ay;
  },

  deleteAcademicYear: async (id: string): Promise<void> => {
    await apiDelete(`/api/academics/academic-years/${id}`);
  },
};
