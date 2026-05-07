/**
 * School Setup service.
 *
 * Owns the setup aggregator endpoints only (status / complete / power
 * tools). Structural masters live in their own services:
 *   - schoolUnitsService
 *   - programmesService
 *   - gradesService
 *   - academicTermsService
 */

import { apiGet, apiPost, apiPostForm } from "@/services/api";

// ── Status types ─────────────────────────────────────────────────────

export type ModuleKey =
  | "units"
  | "programmes"
  | "grades"
  | "academic_year"
  | "classes"
  | "subjects"
  | "terms";

export interface ModuleReadinessBase {
  ready: boolean;
  count: number;
  blockers: string[];
}

export interface UnitsModule extends ModuleReadinessBase {}
export interface ProgrammesModule extends ModuleReadinessBase {}
export interface GradesModule extends ModuleReadinessBase {
  is_full_ladder: boolean;
}
export interface AcademicYearModule extends ModuleReadinessBase {
  active_id: string | null;
}
export interface ClassesModule extends ModuleReadinessBase {
  coverage_ok: boolean;
}
export interface SubjectsModule extends ModuleReadinessBase {
  contexts_defined: boolean;
  applied_to_classes: boolean;
  missing_pairs: number;
  classes_without_subjects: number;
}
export interface TermsModule extends ModuleReadinessBase {
  optional: boolean;
}

export interface SetupStatus {
  units: UnitsModule;
  programmes: ProgrammesModule;
  grades: GradesModule;
  academic_year: AcademicYearModule;
  classes: ClassesModule;
  subjects: SubjectsModule;
  terms: TermsModule;
  overall: {
    ready: boolean;
    is_setup_complete: boolean;
    needs_reconfirm: boolean;
  };
}

// ── Power-feature types ──────────────────────────────────────────────

export type DuplicateMode = "unit_to_unit" | "programme_to_programme";

export interface DuplicateUnitPayload {
  mode: "unit_to_unit";
  source_unit_id: string;
  target_unit_id: string;
  programme_id?: string;
  academic_year_id: string;
}

export interface DuplicateProgrammePayload {
  mode: "programme_to_programme";
  source_programme_id: string;
  target_programme_id: string;
  grade_ids?: string[];
}

export type DuplicatePayload = DuplicateUnitPayload | DuplicateProgrammePayload;

export interface DuplicateResult {
  created: unknown[];
  skipped: unknown[];
  created_count: number;
  skipped_count: number;
  message?: string;
}

export interface PromoteYearPayload {
  source_year_id: string;
  target_year_id: string;
  apply_subjects?: boolean;
}

export interface PromoteYearResult {
  classes_created: number;
  classes_skipped: number;
  subject_links_created: number;
  message?: string;
}

export interface ImportCsvResult {
  classes_created: number;
  classes_skipped: number;
  subject_links_created: number;
  subject_links_skipped: number;
  errors: { row: number; error: string }[];
  message?: string;
}

// ── Template types ───────────────────────────────────────────────────

export type TemplateGroup = {
  id: string;
  name: string;
  board_code: string;
  is_active: boolean;
};

export type TemplateItem = {
  id: string;
  template_group_id: string;
  grade_number: number;
  stream?: string | null;
  subject_name: string;
  subject_code?: string | null;
  periods_per_week?: number | null;
  is_elective: boolean;
  sort_order?: number;
};

// ── Setup aggregator ─────────────────────────────────────────────────

const setup = {
  status: () => apiGet<SetupStatus>("/api/school-setup/status"),
  complete: () =>
    apiPost<{ is_setup_complete: boolean }>("/api/school-setup/complete"),
  duplicateStructure: (payload: DuplicatePayload) =>
    apiPost<DuplicateResult>("/api/school-setup/duplicate-structure", payload),
  promoteYear: (payload: PromoteYearPayload) =>
    apiPost<PromoteYearResult>("/api/school-setup/promote-year", payload),
  parseImportHeaders: async (file: File): Promise<{ headers: string[] }> => {
    const fd = new FormData();
    fd.append("file", file);
    return apiPostForm<{ headers: string[] }>(
      "/api/school-setup/import/parse-headers",
      fd,
    );
  },

  importExcel: async (
    file: File,
    academicYearId: string,
    mapping?: Record<string, string>,
  ): Promise<ImportCsvResult> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("academic_year_id", academicYearId);
    if (mapping) fd.append("mapping", JSON.stringify(mapping));
    return apiPostForm<ImportCsvResult>("/api/school-setup/import", fd);
  },

  listTemplates: () =>
    apiGet<{ data: TemplateGroup[] }>("/api/school-setup/templates/"),

  templateItems: (groupId: string) =>
    apiGet<{ data: TemplateItem[] }>(
      `/api/school-setup/templates/${groupId}/items/`,
    ),

  applySubjectOfferings: (academicYearId: string) =>
    apiPost<{ data: { created: number; skipped: number } }>(
      "/api/school-setup/apply-subject-offerings",
      { academic_year_id: academicYearId },
    ),
};

export const schoolSetupService = { setup };
