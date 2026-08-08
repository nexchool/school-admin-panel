/**
 * Classes.
 *
 * The reads are GraphQL; what is left on REST is what the canon keeps there —
 * the CSV export, and the writes that have not been migrated yet.
 *
 * Every GraphQL result goes through an explicit node → client mapper. The
 * schema is camelCase and these types are snake_case, and asserting one shape
 * onto the other is what once rendered "Invalid Date" on every row: `tsc`
 * believes an assertion, so nothing fails until a person looks at the screen.
 */

import {
  apiGetBlob,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/services/api";
import { gql } from "@/services/graphql";
import type {
  ClassItem,
  ClassDetail,
  ClassesListFilters,
  ClassesListResponse,
  ClassesStats,
  ClassStatus,
  ClassStudent,
  ClassTeacherAssignment,
  CreateClassInput,
  SubjectLoad,
  CreateSubjectLoadInput,
} from "@/types/class";
import type { Student } from "@/types/student";
import type { Teacher } from "@/types/teacher";

export type {
  ClassItem,
  ClassDetail,
  ClassesListFilters,
  ClassesListResponse,
  ClassesStats,
  CreateClassInput,
  SubjectLoad,
  CreateSubjectLoadInput,
};

const CLASS_FIELDS = `
  id name section stream gradeLevel displayName
  academicYear academicYearId
  schoolUnitId schoolUnitName
  programmeId programmeName
  gradeId gradeName gradeSequence
  mediumId mediumName
  departmentId departmentName
  teacherId teacherName
  studentCount teacherCount status
`;

const CLASSES = `
  query Classes(
    $first: Int!, $offset: Int, $orderBy: ClassOrder!,
    $direction: ClassOrderDirection!, $where: ClassFilter
  ) {
    classes(
      first: $first, offset: $offset, orderBy: $orderBy,
      direction: $direction, where: $where
    ) {
      totalCount
      hasNextPage
      nodes { ${CLASS_FIELDS} }
    }
  }
`;

/** The picker's walk asks for no total — counting is work it never renders. */
const CLASSES_PAGE = `
  query ClassesPage($first: Int!, $offset: Int, $where: ClassFilter) {
    classes(first: $first, offset: $offset, where: $where) {
      hasNextPage
      nodes { ${CLASS_FIELDS} }
    }
  }
`;

const CLASS_STATS = `
  query ClassStats($where: ClassFilter) {
    classStats(where: $where) {
      totalClasses totalStudents totalTeachers averageClassSize
    }
  }
`;

const CLASS_DETAIL = `
  query ClassDetail($id: ID!) {
    class(id: $id) {
      ${CLASS_FIELDS}
      students { id admissionNumber fullName rollNumber }
      teachers {
        teacherId teacherName employeeNumber subjectId subjectName
        role isClassTeacher
      }
    }
  }
`;

type ClassNode = {
  id: string;
  name: string | null;
  section: string | null;
  stream: string | null;
  gradeLevel: number | null;
  displayName: string | null;
  academicYear: string | null;
  academicYearId: string | null;
  schoolUnitId: string | null;
  schoolUnitName: string | null;
  programmeId: string | null;
  programmeName: string | null;
  gradeId: string | null;
  gradeName: string | null;
  gradeSequence: number | null;
  mediumId: string | null;
  mediumName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentCount: number;
  teacherCount: number;
  status: string | null;
};

type ClassDetailNode = ClassNode & {
  students: {
    id: string;
    admissionNumber: string;
    fullName: string;
    rollNumber: number | null;
  }[];
  teachers: {
    teacherId: string;
    teacherName: string | null;
    employeeNumber: string | null;
    subjectId: string | null;
    subjectName: string | null;
    role: string | null;
    isClassTeacher: boolean;
  }[];
};

/** `name` is a nullable display label server-side; the UI types treat it as a
 *  plain string, so the coalesce happens once, here at the boundary. */
function toClassItem(node: ClassNode): ClassItem {
  return {
    id: node.id,
    name: node.name ?? "",
    section: node.section ?? undefined,
    stream: node.stream,
    grade_level: node.gradeLevel,
    display_name: node.displayName ?? undefined,
    academic_year: node.academicYear ?? undefined,
    academic_year_id: node.academicYearId ?? undefined,
    school_unit_id: node.schoolUnitId,
    school_unit_name: node.schoolUnitName,
    programme_id: node.programmeId,
    programme_name: node.programmeName,
    grade_id: node.gradeId,
    grade_name: node.gradeName,
    grade_sequence: node.gradeSequence,
    medium_id: node.mediumId,
    medium_name: node.mediumName,
    department_id: node.departmentId,
    department_name: node.departmentName,
    teacher_id: node.teacherId ?? undefined,
    teacher_name: node.teacherName ?? undefined,
    student_count: node.studentCount,
    teacher_count: node.teacherCount,
    status: (node.status as ClassStatus | null) ?? undefined,
  };
}

function toClassDetail(node: ClassDetailNode): ClassDetail {
  return {
    ...toClassItem(node),
    students: node.students.map(
      (child): ClassStudent => ({
        id: child.id,
        name: child.fullName,
        admission_number: child.admissionNumber,
        roll_number: child.rollNumber ?? undefined,
      }),
    ),
    teachers: node.teachers.map(
      (held): ClassTeacherAssignment => ({
        id: `${held.teacherId}:${held.subjectId ?? "class"}`,
        class_id: node.id,
        teacher_id: held.teacherId,
        teacher_name: held.teacherName ?? "",
        teacher_employee_id: held.employeeNumber ?? undefined,
        subject_id: held.subjectId ?? undefined,
        subject_name: held.subjectName ?? undefined,
        is_class_teacher: held.isClassTeacher,
      }),
    ),
  };
}

const ORDER_FIELD: Record<NonNullable<ClassesListFilters["sort_by"]>, string> = {
  name: "NAME",
  grade: "GRADE",
  programme: "PROGRAMME",
  branch: "BRANCH",
  student_count: "STUDENT_COUNT",
  teacher_count: "TEACHER_COUNT",
};

/** The filter input the schema takes. Empty values are left out entirely, so
 *  an empty search box does not become a search for "". */
function whereFrom(params?: ClassesListFilters) {
  const where: Record<string, unknown> = {};
  if (!params) return where;
  if (params.academic_year_id) where.academicYearId = params.academic_year_id;
  if (params.school_unit_id) where.schoolUnitId = params.school_unit_id;
  if (params.programme_id) where.programmeId = params.programme_id;
  if (params.grade_id) where.gradeId = params.grade_id;
  if (params.department_id) where.departmentId = params.department_id;
  if (params.search) {
    where.search = params.search;
    where.searchField = (params.search_field ?? "all").toUpperCase();
  }
  return where;
}

/** The server's page cap. Asking for more is not refused, only trimmed. */
const MAX_PER_PAGE = 100;

/** Far past any real school: twenty campuses of forty sections is 800 rows.
 *  A bound exists so a server that always says "there is more" cannot spin. */
const MAX_PICKER_PAGES = 100;

/** The REST writes still answer with a nullable `name`; the UI types treat it
 *  as a plain string. The reads coalesce in `toClassItem`. */
function normalizeClass<T extends { name?: string | null }>(c: T): T {
  if (c == null) return c;
  return { ...c, name: c.name ?? "" } as T;
}

/** Serialize export filters, skipping empty values so the URL stays clean. */
function exportQueryString(params?: ClassesListFilters): string {
  const sp = new URLSearchParams();
  if (!params) return "";
  const entries: [string, unknown][] = [
    ["academic_year_id", params.academic_year_id],
    ["school_unit_id", params.school_unit_id],
    ["programme_id", params.programme_id],
    ["grade_id", params.grade_id],
    ["department_id", params.department_id],
    ["search", params.search],
    ["search_field", params.search_field],
    ["sort_by", params.sort_by],
    ["sort_dir", params.sort_dir],
  ];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  return sp.toString();
}

export const classesService = {
  /**
   * Every class matching the filter, as a plain array.
   *
   * The structured class pickers build their Branch → Programme → Grade
   * dropdowns off the whole list, so this reads on until the server says
   * there is no more rather than taking a page. Bounded by the school's own
   * structure — a class list is hundreds of rows, not the fifteen thousand a
   * student list can be.
   */
  getClasses: async (params?: {
    academic_year_id?: string | null;
    school_unit_id?: string | null;
  }): Promise<ClassItem[]> => {
    const where = whereFrom(params as ClassesListFilters);
    const items: ClassItem[] = [];

    for (let page = 0; page < MAX_PICKER_PAGES; page += 1) {
      const data = await gql<{
        classes: { hasNextPage: boolean; nodes: ClassNode[] };
      }>(CLASSES_PAGE, {
        first: MAX_PER_PAGE,
        offset: page * MAX_PER_PAGE,
        where,
      });
      items.push(...data.classes.nodes.map(toClassItem));
      if (!data.classes.hasNextPage) return items;
    }

    // Only reachable if a school somehow has 10,000 classes. Say so rather
    // than quietly handing back a picker missing most of the school.
    console.warn(
      `Stopped reading classes after ${MAX_PICKER_PAGES} pages; the list may be incomplete.`,
    );
    return items;
  },

  /** One page of the classes table, in the envelope the table already reads. */
  listClasses: async (
    params?: ClassesListFilters,
  ): Promise<ClassesListResponse> => {
    const page = params?.page ?? 1;
    const perPage = Math.min(params?.per_page ?? 20, MAX_PER_PAGE);

    const data = await gql<{
      classes: {
        totalCount: number;
        hasNextPage: boolean;
        nodes: ClassNode[];
      };
    }>(CLASSES, {
      first: perPage,
      offset: (page - 1) * perPage,
      orderBy: ORDER_FIELD[params?.sort_by ?? "grade"],
      direction: (params?.sort_dir ?? "asc").toUpperCase(),
      where: whereFrom(params),
    });

    const total = data.classes.totalCount;
    return {
      items: data.classes.nodes.map(toClassItem),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    };
  },

  /** Aggregate totals for the overview header, over the same filters. */
  getClassesStats: async (
    params?: ClassesListFilters,
  ): Promise<ClassesStats> => {
    const data = await gql<{
      classStats: {
        totalClasses: number;
        totalStudents: number;
        totalTeachers: number;
        averageClassSize: number;
      };
    }>(CLASS_STATS, { where: whereFrom(params) });

    return {
      total_classes: data.classStats.totalClasses,
      total_students: data.classStats.totalStudents,
      total_teachers: data.classStats.totalTeachers,
      average_class_size: data.classStats.averageClassSize,
    };
  },

  /** CSV of the filtered list. Still REST: a file download is infrastructure,
   *  not a business read (backend-architecture.md). */
  exportClasses: async (params?: ClassesListFilters): Promise<Blob> => {
    const qs = exportQueryString(params);
    return apiGetBlob(`/api/classes/export${qs ? `?${qs}` : ""}`);
  },

  getClass: async (id: string): Promise<ClassDetail> => {
    const data = await gql<{ class: ClassDetailNode | null }>(CLASS_DETAIL, {
      id,
    });
    if (!data.class) {
      throw new Error("That class no longer exists.");
    }
    return toClassDetail(data.class);
  },

  createClass: async (data: CreateClassInput): Promise<ClassItem> => {
    const out = await apiPost<ClassItem>("/api/classes/", data);
    return normalizeClass(out);
  },

  updateClass: async (
    id: string,
    data: Partial<CreateClassInput>
  ): Promise<ClassItem> => {
    const out = await apiPut<ClassItem>(`/api/classes/${id}`, data);
    return normalizeClass(out);
  },

  deleteClass: async (id: string): Promise<void> => {
    await apiDelete(`/api/classes/${id}`);
  },

  getUnassignedStudents: async (
    classId: string
  ): Promise<Student[]> => {
    const data = await apiGet<Student[]>(
      `/api/classes/${classId}/unassigned-students`
    );
    return Array.isArray(data) ? data : [];
  },

  assignStudent: async (
    classId: string,
    studentId: string
  ): Promise<void> => {
    await apiPost(`/api/classes/${classId}/students`, {
      student_id: studentId,
    });
  },

  removeStudent: async (
    classId: string,
    studentId: string
  ): Promise<void> => {
    await apiDelete(`/api/classes/${classId}/students/${studentId}`);
  },

  getAvailableClassTeachers: async (
    classId?: string
  ): Promise<Teacher[]> => {
    const params = classId ? `?class_id=${classId}` : "";
    const data = await apiGet<Teacher[]>(
      `/api/classes/meta/available-class-teachers${params}`
    );
    return Array.isArray(data) ? data : [];
  },

  getUnassignedTeachers: async (classId: string): Promise<Teacher[]> => {
    const data = await apiGet<Teacher[]>(
      `/api/classes/${classId}/unassigned-teachers`
    );
    return Array.isArray(data) ? data : [];
  },

  assignTeacher: async (
    classId: string,
    teacherId: string,
    subjectId: string,
    isClassTeacher = false
  ): Promise<void> => {
    await apiPost(`/api/classes/${classId}/teachers`, {
      teacher_id: teacherId,
      subject_id: subjectId,
      is_class_teacher: isClassTeacher,
    });
  },

  removeTeacher: async (
    classId: string,
    teacherId: string
  ): Promise<void> => {
    await apiDelete(`/api/classes/${classId}/teachers/${teacherId}`);
  },

  getSubjectLoads: async (classId: string): Promise<SubjectLoad[]> => {
    const data = await apiGet<SubjectLoad[]>(
      `/api/classes/${classId}/subject-load`
    );
    return Array.isArray(data) ? data : [];
  },

  createSubjectLoad: async (
    classId: string,
    data: CreateSubjectLoadInput
  ): Promise<SubjectLoad> => {
    return apiPost<SubjectLoad>(
      `/api/classes/${classId}/subject-load`,
      data
    );
  },

  updateSubjectLoad: async (
    classId: string,
    loadId: string,
    weeklyPeriods: number
  ): Promise<SubjectLoad> => {
    return apiPut<SubjectLoad>(
      `/api/classes/${classId}/subject-load/${loadId}`,
      { weekly_periods: weeklyPeriods }
    );
  },

  deleteSubjectLoad: async (
    classId: string,
    loadId: string
  ): Promise<void> => {
    await apiDelete(`/api/classes/${classId}/subject-load/${loadId}`);
  },
};
