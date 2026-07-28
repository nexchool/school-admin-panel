export type DepartmentStatus = "active" | "inactive";

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  display_order: number;
  /** Reserved for administrative departments. Read-only, always
   *  "academic_division" in this version — never sent on write. */
  type: string;
  status: DepartmentStatus;
  teacher_count: number;
  class_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface DepartmentsListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: DepartmentStatus;
  sortBy?: "display_order" | "name" | "created_at";
  sortDir?: "asc" | "desc";
}

export interface DepartmentsListResult {
  items: Department[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DepartmentStats {
  total: number;
  active: number;
  teachers_assigned: number;
  classes_assigned: number;
}

export interface CreateDepartmentInput {
  name: string;
  code?: string | null;
  description?: string | null;
  display_order?: number;
  status?: DepartmentStatus;
}

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;
