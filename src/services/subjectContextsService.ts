import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";

export type SubjectContextType = "mandatory" | "elective";
export type SubjectContextRole =
  | "first_language"
  | "second_language"
  | "third_language"
  | "core"
  | "co_curricular";

export interface SubjectContextDto {
  id: string;
  tenant_id: string;
  programme_id: string;
  grade_id: string;
  subject_id: string;
  subject_name: string | null;
  subject_code: string | null;
  display_name: string | null;
  short_code: string | null;
  type: SubjectContextType;
  role: SubjectContextRole | null;
  medium_id: string | null;
  variant_of_context_id: string | null;
  elective_group_key: string | null;
  default_weekly_periods: number;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Payload shape for bulk upsert. `id` is optional (omitted = create). */
export interface SubjectContextUpsertInput {
  id?: string;
  subject_id: string;
  display_name?: string | null;
  short_code?: string | null;
  type?: SubjectContextType;
  role?: SubjectContextRole | null;
  medium_id?: string | null;
  variant_of_context_id?: string | null;
  elective_group_key?: string | null;
  default_weekly_periods?: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface ApplyResultDto {
  created_count: number;
  skipped_count: number;
  classes_matched: number;
}

export interface PreviewDto {
  class_count: number;
  subject_count: number;
  contexts: SubjectContextDto[];
}

function unwrap<T>(res: unknown, key?: string): T {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
    if (key && key in obj) return obj[key] as T;
  }
  return res as T;
}

export const subjectContextsService = {
  list: async (params: {
    programme_id?: string;
    grade_id?: string;
  } = {}): Promise<SubjectContextDto[]> => {
    const qs = new URLSearchParams();
    if (params.programme_id) qs.set("programme_id", params.programme_id);
    if (params.grade_id) qs.set("grade_id", params.grade_id);
    const url = `/api/subject-contexts/${qs.toString() ? `?${qs}` : ""}`;
    const res = await apiGet<SubjectContextDto[]>(url);
    return Array.isArray(res) ? res : [];
  },

  create: (
    input: SubjectContextUpsertInput & {
      programme_id: string;
      grade_id: string;
    },
  ): Promise<SubjectContextDto> =>
    apiPost<SubjectContextDto>("/api/subject-contexts/", input),

  patch: (
    id: string,
    input: Partial<SubjectContextUpsertInput>,
  ): Promise<SubjectContextDto> =>
    apiPatch<SubjectContextDto>(`/api/subject-contexts/${id}`, input),

  remove: (id: string): Promise<void> =>
    apiDelete<void>(`/api/subject-contexts/${id}`),

  bulkUpsert: async (payload: {
    programme_id: string;
    grade_id: string;
    contexts: SubjectContextUpsertInput[];
    delete_missing?: boolean;
  }): Promise<SubjectContextDto[]> => {
    const res = await apiPost<unknown>(
      "/api/subject-contexts/bulk-upsert",
      payload,
    );
    return unwrap<SubjectContextDto[]>(res, "contexts") ?? [];
  },

  preview: async (params: {
    programme_id: string;
    grade_id: string;
  }): Promise<PreviewDto> => {
    const qs = new URLSearchParams(params);
    const res = await apiGet<PreviewDto>(
      `/api/subject-contexts/preview?${qs}`,
    );
    return res;
  },

  apply: (payload: {
    programme_id: string;
    grade_id: string;
  }): Promise<ApplyResultDto> =>
    apiPost<ApplyResultDto>("/api/subject-contexts/apply", payload),
};
