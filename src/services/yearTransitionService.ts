import { apiGet, apiPatch, apiPost } from "@/services/api";

export interface CopyClassesResult {
  class_mapping: Record<string, string>;
  from_year_id: string;
  to_year_id: string;
  source_class_count: number;
  created: number;
  reused_existing: number;
  message?: string;
}

export interface PromotionPreviewSummary {
  total_enrollments: number;
  promotable: number;
  graduated: number;
  unmapped: number;
  blocked_double_promotion: number;
  unused_mapping_keys: number;
  /** Eligible enrollments excluded by filters (leaving / failed). */
  skipped?: number;
  /** Students moving to a higher grade section. */
  promoted?: number;
  /** Same-grade / hold / repeat-year class targets. */
  repeated?: number;
  /** Counted from class roster only — no StudentClassEnrollment row for the from-year. */
  legacy_placement_only_rows?: number;
}

export interface PromotionPreviewFilters {
  exclude_leaving: boolean;
  include_failed: boolean;
}

export interface PromotionPreviewResult {
  summary: PromotionPreviewSummary;
  filters?: PromotionPreviewFilters;
  unmapped_source_class_ids: string[];
  unused_mapping_keys: string[];
  message?: string;
}

export interface PromotionExecuteResult {
  promotion_batch_id: string;
  summary: Record<string, unknown>;
  batch?: Record<string, unknown>;
  filters?: PromotionPreviewFilters;
  message?: string;
}

export interface CopyAcademicStructureResult {
  class_subjects_created: number;
  subject_teachers_created: number;
  class_teachers_created: number;
  skipped: {
    class_subjects: number;
    subject_teachers: number;
    class_teachers: number;
  };
}

export interface CopyTimetableResult {
  versions_created: number;
  entries_created: number;
  skipped: {
    classes_no_source: number;
    classes_target_has_version: number;
    entries_no_class_subject: number;
  };
}

export interface FinanceRolloverResult {
  structures_created: number;
  structures_reused: number;
  components_created: number;
  class_links_created: number;
  class_links_skipped_unmapped: number;
  /** Target class is already linked to a different fee structure for the new year. */
  class_links_skipped_conflict: number;
}

export interface TransportRolloverResult {
  fee_plans_created: number;
  fee_plans_reused: number;
  enrollments_created: number;
  enrollments_skipped_graduated: number;
  enrollments_skipped_existing: number;
}

export interface CopyHolidaysResult {
  holidays_created: number;
  skipped_existing: number;
}

export interface TeacherGapsResult {
  academic_year_id: string;
  totals: {
    classes: number;
    classes_missing_class_teacher: number;
    class_subjects: number;
    class_subjects_missing_primary_teacher: number;
  };
  samples: {
    classes_missing_class_teacher: Array<{
      class_id: string;
      class_name: string | null;
      class_section: string | null;
    }>;
    class_subjects_missing_primary_teacher: Array<{
      class_subject_id: string;
      class_id: string;
      class_name: string | null;
      class_section: string | null;
      subject_id: string;
    }>;
  };
}

export interface PromotionHistoryItem {
  id: string;
  from_academic_year_id: string | null;
  from_academic_year_name: string | null;
  to_academic_year_id: string | null;
  to_academic_year_name: string | null;
  status: string;
  summary: Record<string, unknown> | null;
  created_by_user_id: string | null;
  created_at: string | null;
}

export interface PromotionHistoryResult {
  items: PromotionHistoryItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface AcademicSettings {
  id?: string;
  current_academic_year_id: string | null;
  default_bell_schedule_id: string | null;
  allow_admin_attendance_override?: boolean;
  default_working_days_json?: number[] | null;
  admission_number_format?: string | null;
  teacher_employee_id_format?: string | null;
}

export const yearTransitionService = {
  copyClasses: async (
    from_year_id: string,
    to_year_id: string
  ): Promise<CopyClassesResult> => {
    return apiPost<CopyClassesResult>("/api/classes/copy", {
      from_year_id,
      to_year_id,
    });
  },

  previewPromotion: async (
    from_year_id: string,
    to_year_id: string,
    class_mapping: Record<string, string>,
    options?: {
      exclude_leaving?: boolean;
      include_failed?: boolean;
    }
  ): Promise<PromotionPreviewResult> => {
    const body = {
      from_year_id,
      to_year_id,
      class_mapping,
      ...(options?.exclude_leaving !== undefined
        ? { exclude_leaving: options.exclude_leaving }
        : {}),
      ...(options?.include_failed !== undefined
        ? { include_failed: options.include_failed }
        : {}),
    };
    return apiPost<PromotionPreviewResult>(
      "/api/students/promotion/preview",
      body
    );
  },

  copyAcademicStructure: async (
    class_mapping: Record<string, string>
  ): Promise<CopyAcademicStructureResult> => {
    return apiPost<CopyAcademicStructureResult>(
      "/api/academics/rollover/copy-structure",
      { class_mapping }
    );
  },

  copyTimetable: async (
    class_mapping: Record<string, string>
  ): Promise<CopyTimetableResult> => {
    return apiPost<CopyTimetableResult>(
      "/api/academics/rollover/copy-timetable",
      { class_mapping }
    );
  },

  copyHolidays: async (
    from_year_id: string,
    to_year_id: string
  ): Promise<CopyHolidaysResult> => {
    return apiPost<CopyHolidaysResult>(
      "/api/academics/rollover/copy-holidays",
      { from_year_id, to_year_id }
    );
  },

  rolloverFinance: async (
    from_year_id: string,
    to_year_id: string,
    class_mapping: Record<string, string>
  ): Promise<FinanceRolloverResult> => {
    return apiPost<FinanceRolloverResult>("/api/finance/rollover", {
      from_year_id,
      to_year_id,
      class_mapping,
    });
  },

  rolloverTransport: async (
    from_year_id: string,
    to_year_id: string,
    options?: { copy_fee_plans?: boolean; copy_enrollments?: boolean }
  ): Promise<TransportRolloverResult> => {
    return apiPost<TransportRolloverResult>("/api/transport/rollover", {
      from_year_id,
      to_year_id,
      ...(options?.copy_fee_plans !== undefined
        ? { copy_fee_plans: options.copy_fee_plans }
        : {}),
      ...(options?.copy_enrollments !== undefined
        ? { copy_enrollments: options.copy_enrollments }
        : {}),
    });
  },

  getTeacherGaps: async (
    academic_year_id: string
  ): Promise<TeacherGapsResult> => {
    const url = `/api/academics/rollover/teacher-gaps?academic_year_id=${encodeURIComponent(
      academic_year_id
    )}`;
    return apiGet<TeacherGapsResult>(url);
  },

  listPromotionHistory: async (
    page = 1,
    pageSize = 20,
    options?: { from_year_id?: string; to_year_id?: string }
  ): Promise<PromotionHistoryResult> => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (options?.from_year_id) params.set("from_year_id", options.from_year_id);
    if (options?.to_year_id) params.set("to_year_id", options.to_year_id);
    return apiGet<PromotionHistoryResult>(
      `/api/students/promotion/history?${params.toString()}`
    );
  },

  getAcademicSettings: async (): Promise<AcademicSettings> => {
    return apiGet<AcademicSettings>("/api/academics/settings");
  },

  setActiveYear: async (
    academic_year_id: string
  ): Promise<AcademicSettings> => {
    return apiPatch<AcademicSettings>("/api/academics/settings", {
      current_academic_year_id: academic_year_id,
    });
  },

  executePromotion: async (
    from_year_id: string,
    to_year_id: string,
    class_mapping: Record<string, string>,
    options?: {
      exclude_leaving?: boolean;
      include_failed?: boolean;
    }
  ): Promise<PromotionExecuteResult> => {
    return apiPost<PromotionExecuteResult>("/api/students/promote", {
      from_year_id,
      to_year_id,
      class_mapping,
      ...(options?.exclude_leaving !== undefined
        ? { exclude_leaving: options.exclude_leaving }
        : {}),
      ...(options?.include_failed !== undefined
        ? { include_failed: options.include_failed }
        : {}),
    });
  },
};
