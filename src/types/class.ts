export type ClassStatus = "active" | "archived";

/** Fields the classes list may be sorted by. Mirrors `SORTABLE_COLUMNS` in
 *  `server/modules/classes/services.py` — keep the two in step. */
export type ClassesSortBy =
  | "name"
  | "grade"
  | "programme"
  | "branch"
  | "student_count"
  | "teacher_count";

/** Fields `search` may target. Mirrors `SEARCH_FIELDS` server-side. */
export type ClassesSearchField =
  | "all"
  | "name"
  | "section"
  | "grade"
  | "programme"
  | "branch";

export interface ClassesListFilters {
  academic_year_id?: string | null;
  school_unit_id?: string | null;
  programme_id?: string | null;
  grade_id?: string | null;
  department_id?: string | null;
  search?: string | null;
  search_field?: ClassesSearchField;
  sort_by?: ClassesSortBy;
  sort_dir?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface ClassesListResponse {
  items: ClassItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ClassesStats {
  total_classes: number;
  total_students: number;
  total_teachers: number;
  average_class_size: number;
}

export interface ClassItem {
  id: string;
  /** Display label. Backend may store NULL post multi-school migration; the
   *  service-layer coalesces to an empty string before reaching the UI. */
  name: string;
  section?: string;
  academic_year?: string;
  academic_year_id?: string;
  teacher_id?: string;
  teacher_name?: string;
  student_count?: number;
  teacher_count?: number;
  medium_id?: string | null;
  medium_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  stream?: string | null;
  /** Derived server-side from the academic year's `is_active` — `classes` has
   *  no status column of its own. Absent on endpoints other than the list. */
  status?: ClassStatus;
  grade_level?: number | null;
  /** What the school calls this class — grade + section, composed server-side.
   *  `name` is a nullable legacy label and is empty for every class created
   *  through the structured form, so screens must not compose their own. */
  display_name?: string;
  // Multi-school structural fields. Optional during the soft-migration
  // window — older rows may not yet have them populated.
  school_unit_id?: string | null;
  school_unit_name?: string | null;
  programme_id?: string | null;
  programme_name?: string | null;
  grade_id?: string | null;
  grade_name?: string | null;
  /** Grade ordering (Grade.sequence). Used to sort grade groups correctly
   *  (e.g. Nursery < LKG < UKG < 1 < … < 10) instead of by name string. */
  grade_sequence?: number | null;
  created_at?: string;
}

export interface ClassTeacherAssignment {
  id: string;
  class_id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_employee_id?: string;
  subject_id?: string;
  subject_name?: string;
  is_class_teacher: boolean;
}

/** A child as the class detail page lists them.
 *
 *  Deliberately not the full `Student`: this page renders a name, an
 *  admission number and a link. Typing it as `Student` meant casting a
 *  four-field object into a thirty-field type, which type-checks and then
 *  hands any new caller a mostly-undefined student. */
export interface ClassStudent {
  id: string;
  name: string;
  admission_number: string;
  roll_number?: number;
}

export interface ClassDetail extends ClassItem {
  students: ClassStudent[];
  teachers: ClassTeacherAssignment[];
}

export interface CreateClassInput {
  name: string;
  section: string;
  academic_year_id: string;
  teacher_id?: string;
  start_date?: string;
  end_date?: string;
  /** Structural fields added in the multi-school migration */
  grade_id?: string | null;
  programme_id?: string | null;
  school_unit_id?: string | null;
  medium_id?: string | null;
  department_id?: string | null;
  stream?: string | null;
}

/** Alias for CreateClassInput (used by classesService) */
export type CreateClassDTO = CreateClassInput;

/** Subject load: weekly periods per subject for a class */
export interface SubjectLoad {
  id: string;
  class_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  weekly_periods: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubjectLoadInput {
  subject_id: string;
  weekly_periods: number;
}
