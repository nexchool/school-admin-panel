import { beforeEach, describe, expect, it, vi } from "vitest";

import { subjectsService } from "@/services/subjectsService";
import { gql } from "@/services/graphql";

vi.mock("@/services/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock("@/services/graphql", () => ({ gql: vi.fn() }));

const mockedGql = vi.mocked(gql);

/** A catalogue row as the schema answers with it — camelCase throughout. */
function node(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub1",
    name: "Mathematics",
    code: "MATH",
    description: null,
    subjectType: "core",
    isActive: true,
    classes: [
      {
        classSubjectId: "cs1",
        classId: "c1",
        className: "5-A",
        gradeName: "Grade 5",
        programmeId: "p1",
        programmeName: "GSEB Gujarati",
        weeklyPeriods: 6,
        isMandatory: true,
      },
    ],
    programmes: [{ id: "p1", name: "GSEB Gujarati" }],
    ...overrides,
  };
}

function page(nodes: unknown[], totalCount = nodes.length) {
  return { subjectCatalogue: { totalCount, nodes } };
}

function variablesOf(call = 0) {
  return mockedGql.mock.calls[call][1] as Record<string, unknown>;
}

beforeEach(() => {
  mockedGql.mockReset();
});

describe("listSubjects", () => {
  it("maps the schema's shape onto the one the table reads", async () => {
    mockedGql.mockResolvedValue(page([node()]));

    const { items } = await subjectsService.listSubjects({});

    expect(items[0].name).toBe("Mathematics");
    expect(items[0].subject_type).toBe("core");
    expect(items[0].is_active).toBe(true);
    expect(items[0].classes[0]).toEqual({
      class_subject_id: "cs1",
      class_id: "c1",
      class_name: "5-A",
      grade_name: "Grade 5",
      programme_id: "p1",
      programme_name: "GSEB Gujarati",
      weekly_periods: 6,
      is_mandatory: true,
    });
    expect(items[0].programmes).toEqual([{ id: "p1", name: "GSEB Gujarati" }]);
  });

  it("keeps a subject that is taught nowhere, with empty lists", async () => {
    mockedGql.mockResolvedValue(page([node({ classes: [], programmes: [] })]));

    const { items } = await subjectsService.listSubjects({});

    expect(items[0].classes).toEqual([]);
    expect(items[0].programmes).toEqual([]);
  });

  it("derives the envelope's page count from the total", async () => {
    mockedGql.mockResolvedValue(page([node()], 26));

    const result = await subjectsService.listSubjects({ page: 2, perPage: 10 });

    expect(result.total).toBe(26);
    expect(result.page).toBe(2);
    expect(result.total_pages).toBe(3);
  });

  it("turns a page number into the offset the schema takes", async () => {
    mockedGql.mockResolvedValue(page([]));

    await subjectsService.listSubjects({ page: 3, perPage: 50 });

    expect(variablesOf().first).toBe(50);
    expect(variablesOf().offset).toBe(100);
  });

  it("never asks for more than one page of rows at a time", async () => {
    mockedGql.mockResolvedValue(page([]));

    await subjectsService.listSubjects({ perPage: 5000 });

    expect(variablesOf().first).toBe(100);
  });

  it("sends sort, search and type in the schema's vocabulary", async () => {
    mockedGql.mockResolvedValue(page([]));

    await subjectsService.listSubjects({
      sortBy: "subject_type",
      sortDir: "desc",
      search: "  math  ",
      subjectType: "co_curricular",
      includeInactive: true,
    });

    expect(variablesOf().orderBy).toBe("SUBJECT_TYPE");
    expect(variablesOf().direction).toBe("DESC");
    expect(variablesOf().where).toEqual({
      search: "math",
      subjectType: "CO_CURRICULAR",
      includeInactive: true,
    });
  });

  it("omits an empty search rather than searching for nothing", async () => {
    mockedGql.mockResolvedValue(page([]));

    await subjectsService.listSubjects({ search: "   " });

    expect(variablesOf().where).toEqual({});
  });
});
