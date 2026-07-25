import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";

export interface Holiday {
  id: string;
  name: string;
  description?: string | null;
  holiday_type: string;
  start_date?: string | null;
  end_date?: string | null;
  is_recurring: boolean;
  recurring_day_of_week?: number | null;
  recurring_day_name?: string | null;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  applies_to?: string;
  duration_days?: number;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateHolidayPayload {
  name: string;
  holiday_type: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_recurring: boolean;
  recurring_day_of_week?: number;
  academic_year_id?: string;
  applies_to?: string;
}

export const holidayService = {
  getHolidays: async (params?: {
    start_date?: string;
    end_date?: string;
    include_recurring?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    if (params?.include_recurring === false) q.set("include_recurring", "false");
    const suffix = q.toString() ? `?${q.toString()}` : "";
    const url = `/api/holidays/${suffix}`;
    const data = await apiGet<Holiday[] | { data: Holiday[] }>(url);
    const arr = Array.isArray(data) ? data : (data as { data: Holiday[] })?.data;
    return Array.isArray(arr) ? arr : [];
  },

  getUpcoming: async (limit = 10) => {
    const data = await apiGet<Holiday[] | { data: Holiday[] }>(
      `/api/holidays/upcoming?limit=${limit}`
    );
    const arr = Array.isArray(data) ? data : (data as { data: Holiday[] })?.data;
    return Array.isArray(arr) ? arr : [];
  },

  createHoliday: async (payload: CreateHolidayPayload) =>
    apiPost<Holiday>("/api/holidays/", payload),

  updateHoliday: async (id: string, data: Partial<CreateHolidayPayload>) =>
    apiPut<Holiday>(`/api/holidays/${id}`, data),

  deleteHoliday: async (id: string) => apiDelete(`/api/holidays/${id}`),
};
