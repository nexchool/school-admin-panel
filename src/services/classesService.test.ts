import { beforeEach, describe, expect, it, vi } from "vitest";

import { classesService } from "@/services/classesService";
import { gql } from "@/services/graphql";

vi.mock("@/services/api", () => ({
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock("@/services/graphql", () => ({ gql: vi.fn() }));

const mockedGql = vi.mocked(gql);

/** A class node as the schema answers with it — camelCase, nullable label. */
function node(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    name: "Grade 1",
    section: "A",
    stream: null,
    gradeLevel: 1,
    academicYear: "2026-2027",
    academicYearId: "ay1",
    schoolUnitId: "su1",
    schoolUnitName: "Main Campus",
    programmeId: "p1",
    programmeName: "Primary",
    gradeId: "g1",
    gradeName: "Grade 1",
    gradeSequence: 2,
    mediumId: null,
    mediumName: null,
    departmentId: null,
    departmentName: null,
    teacherId: null,
    teacherName: null,
    studentCount: 3,
    teacherCount: 1,
    status: "active",
    ...overrides,
  };
}

function page(nodes: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    classes: {
      totalCount: nodes.length,
      hasNextPage: false,
      nodes,
      ...overrides,
    },
  };
}

/** The variables the one call under test was made with. */
function variablesOf(call = 0) {
  return mockedGql.mock.calls[call][1] as Record<string, unknown>;
}

beforeEach(() => {
  mockedGql.mockReset();
});

describe("getClasses", () => {
  it("maps the schema's shape onto the one the screens read", async () => {
    mockedGql.mockResolvedValue(page([node()]));

    const [cls] = await classesService.getClasses();

    expect(cls.id).toBe("c1");
    expect(cls.grade_name).toBe("Grade 1");
    expect(cls.school_unit_name).toBe("Main Campus");
    expect(cls.grade_sequence).toBe(2);
    expect(cls.student_count).toBe(3);
    expect(cls.status).toBe("active");
  });

  it("coalesces a null class name to an empty string", async () => {
    mockedGql.mockResolvedValue(page([node({ name: null })]));

    const [cls] = await classesService.getClasses();

    expect(cls.name).toBe("");
  });

  it("reads on until the server says there is no more", async () => {
    mockedGql
      .mockResolvedValueOnce(page([node({ id: "c1" })], { hasNextPage: true }))
      .mockResolvedValueOnce(page([node({ id: "c2" })], { hasNextPage: false }));

    const result = await classesService.getClasses();

    expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(variablesOf(0).offset).toBe(0);
    expect(variablesOf(1).offset).toBe(100);
  });

  it("passes the filters it was given and omits the ones it was not", async () => {
    mockedGql.mockResolvedValue(page([]));

    await classesService.getClasses({
      academic_year_id: "ay1",
      school_unit_id: null,
    });

    expect(variablesOf().where).toEqual({ academicYearId: "ay1" });
  });

  it("returns an empty array when the school has no classes", async () => {
    mockedGql.mockResolvedValue(page([]));

    await expect(classesService.getClasses()).resolves.toEqual([]);
  });
});

describe("listClasses", () => {
  it("returns the envelope the table reads, with pages derived from the total", async () => {
    mockedGql.mockResolvedValue(page([node()], { totalCount: 26 }));

    const result = await classesService.listClasses({ page: 2, per_page: 10 });

    expect(result.total).toBe(26);
    expect(result.page).toBe(2);
    expect(result.per_page).toBe(10);
    expect(result.total_pages).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it("turns a page number into the offset the schema takes", async () => {
    mockedGql.mockResolvedValue(page([]));

    await classesService.listClasses({ page: 3, per_page: 50 });

    expect(variablesOf().first).toBe(50);
    expect(variablesOf().offset).toBe(100);
  });

  it("sends sort and search in the schema's vocabulary", async () => {
    mockedGql.mockResolvedValue(page([]));

    await classesService.listClasses({
      sort_by: "student_count",
      sort_dir: "desc",
      search: "nursery",
      search_field: "grade",
    });

    expect(variablesOf().orderBy).toBe("STUDENT_COUNT");
    expect(variablesOf().direction).toBe("DESC");
    expect(variablesOf().where).toMatchObject({
      search: "nursery",
      searchField: "GRADE",
    });
  });

  it("never asks for more than one page of rows at a time", async () => {
    mockedGql.mockResolvedValue(page([]));

    await classesService.listClasses({ per_page: 5000 });

    expect(variablesOf().first).toBe(100);
  });
});

describe("getClassesStats", () => {
  it("maps the totals onto the header's keys", async () => {
    mockedGql.mockResolvedValue({
      classStats: {
        totalClasses: 12,
        totalStudents: 275,
        totalTeachers: 25,
        averageClassSize: 22.9,
      },
    });

    const stats = await classesService.getClassesStats();

    expect(stats).toEqual({
      total_classes: 12,
      total_students: 275,
      total_teachers: 25,
      average_class_size: 22.9,
    });
  });
});

describe("getClass", () => {
  it("names the children and everyone teaching the class", async () => {
    mockedGql.mockResolvedValue({
      class: {
        ...node(),
        students: [
          {
            id: "s1",
            admissionNumber: "ADM-1",
            fullName: "Aarav Patel",
            rollNumber: 1,
          },
        ],
        teachers: [
          {
            teacherId: "t1",
            teacherName: "Meera Shah",
            employeeNumber: "EMP-4",
            subjectId: "sub1",
            subjectName: "Mathematics",
            role: "primary",
            isClassTeacher: false,
          },
        ],
      },
    });

    const detail = await classesService.getClass("c1");

    expect(detail.students[0].name).toBe("Aarav Patel");
    expect(detail.students[0].admission_number).toBe("ADM-1");
    // The two the detail page has always rendered and REST never sent.
    expect(detail.teachers[0].subject_name).toBe("Mathematics");
    expect(detail.teachers[0].teacher_employee_id).toBe("EMP-4");
  });

  it("says so when the class is gone rather than returning a null class", async () => {
    mockedGql.mockResolvedValue({ class: null });

    await expect(classesService.getClass("gone")).rejects.toThrow();
  });
});
