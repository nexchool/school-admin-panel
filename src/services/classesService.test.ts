import { beforeEach, describe, expect, it, vi } from "vitest";

import { classesService } from "@/services/classesService";
import { apiGet } from "@/services/api";

vi.mock("@/services/api", () => ({
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockedGet = vi.mocked(apiGet);

function envelope(items: unknown[], overrides = {}) {
  return {
    items,
    total: items.length,
    page: 1,
    per_page: items.length,
    total_pages: 1,
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
});

describe("getClasses", () => {
  it("unwraps the list envelope into a plain array", async () => {
    mockedGet.mockResolvedValue(envelope([{ id: "c1", name: "Grade 1" }]));

    const result = await classesService.getClasses();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("coalesces a null class name to an empty string", async () => {
    mockedGet.mockResolvedValue(envelope([{ id: "c1", name: null }]));

    const [cls] = await classesService.getClasses();

    expect(cls.name).toBe("");
  });

  it("requests no page param, so the backend returns every row", async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await classesService.getClasses({ academic_year_id: "ay1" });

    const url = mockedGet.mock.calls[0][0] as string;
    expect(url).not.toContain("page");
    expect(url).toContain("academic_year_id=ay1");
  });

  it("returns an empty array when the payload has no items", async () => {
    mockedGet.mockResolvedValue({ total: 0 });

    await expect(classesService.getClasses()).resolves.toEqual([]);
  });

  it("omits filters that are null or empty", async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await classesService.getClasses({
      academic_year_id: "ay1",
      school_unit_id: null,
    });

    expect(mockedGet.mock.calls[0][0]).not.toContain("school_unit_id");
  });
});

describe("listClasses", () => {
  it("returns the envelope intact for the paginated table", async () => {
    mockedGet.mockResolvedValue(
      envelope([{ id: "c1", name: "Grade 1" }], {
        total: 26,
        page: 2,
        per_page: 10,
        total_pages: 3,
      })
    );

    const result = await classesService.listClasses({ page: 2, per_page: 10 });

    expect(result.total).toBe(26);
    expect(result.page).toBe(2);
    expect(result.total_pages).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it("forwards pagination, sort and search params", async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await classesService.listClasses({
      page: 3,
      per_page: 50,
      sort_by: "student_count",
      sort_dir: "desc",
      search: "nursery",
    });

    const url = mockedGet.mock.calls[0][0] as string;
    expect(url).toContain("page=3");
    expect(url).toContain("per_page=50");
    expect(url).toContain("sort_by=student_count");
    expect(url).toContain("sort_dir=desc");
    expect(url).toContain("search=nursery");
  });

  it("falls back to a safe empty envelope on a malformed payload", async () => {
    mockedGet.mockResolvedValue({});

    const result = await classesService.listClasses();

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      per_page: 0,
      total_pages: 1,
    });
  });
});
