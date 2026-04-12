/** Class-level subject offering (GET /api/classes/:id/subjects) */
export interface ClassSubjectOffering {
  id: string;
  class_id: string;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  weekly_periods: number;
  is_mandatory: boolean;
  is_elective_bucket: boolean;
  sort_order?: number | null;
  academic_term_id?: string | null;
  academic_term_name?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateClassSubjectInput {
  subject_id: string;
  weekly_periods: number;
  /** When true, subject is required (not optional). Maps from UI "Optional" inverted. */
  is_mandatory: boolean;
}

export interface UpdateClassSubjectInput {
  weekly_periods?: number;
  is_mandatory?: boolean;
  is_elective_bucket?: boolean;
  sort_order?: number | null;
  academic_term_id?: string | null;
  status?: string;
}

/** GET /api/classes/:id/subject-teachers */
export interface ClassSubjectTeacherAssignment {
  id: string;
  class_subject_id: string;
  teacher_id: string;
  teacher_name?: string | null;
  employee_id?: string | null;
  role: "primary" | "assistant" | "guest";
  effective_from?: string | null;
  effective_to?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateSubjectTeacherInput {
  class_subject_id: string;
  teacher_id: string;
  role?: "primary" | "assistant" | "guest";
}

/** Enriched row for the class subjects table */
export interface ClassSubjectTableRow extends ClassSubjectOffering {
  subject_type?: string;
  subject_is_active?: boolean;
  teachers: ClassSubjectTeacherAssignment[];
}
