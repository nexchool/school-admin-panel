// Keep in sync with server modules/subjects/services.py SUBJECT_TYPES.
export type SubjectType =
  | "core"
  | "elective"
  | "language"
  | "activity"
  | "co_curricular"
  | "other";

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  subject_type?: SubjectType | string;
  is_active?: boolean;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

/** One active class assignment of a subject (from the paginated catalogue). */
export interface SubjectClassAssignment {
  class_subject_id: string;
  class_id: string;
  class_name: string | null;
  grade_name: string | null;
  programme_id: string | null;
  programme_name: string | null;
  weekly_periods: number;
  is_mandatory: boolean;
}

export interface SubjectProgrammeRef {
  id: string;
  name: string | null;
}

/** Catalogue row: subject + its class assignments + derived programmes. */
export interface SubjectListItem extends Subject {
  classes: SubjectClassAssignment[];
  programmes: SubjectProgrammeRef[];
}

export type SubjectsSortBy =
  | "name"
  | "code"
  | "subject_type"
  | "created_at"
  | "updated_at";

export interface SubjectsListParams {
  search?: string;
  page?: number;
  perPage?: number;
  subjectType?: SubjectType;
  includeInactive?: boolean;
  sortBy?: SubjectsSortBy;
  sortDir?: "asc" | "desc";
}

export interface SubjectsListResult {
  items: SubjectListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateSubjectInput {
  name: string;
  code?: string;
  description?: string;
  subject_type?: SubjectType;
  /** Assign the new subject to these classes atomically on create. */
  class_ids?: string[];
  /** Weekly periods for the initial class assignments (default 1). */
  weekly_periods?: number;
}

export interface UpdateSubjectInput {
  name?: string;
  code?: string;
  description?: string;
  subject_type?: SubjectType;
  is_active?: boolean;
}
