import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveAcademicYearProvider } from "@/contexts/ActiveAcademicYearContext";
import { useStudents } from "./useStudents";
import { studentsService } from "@/services/studentsService";
import type { ReactNode } from "react";

vi.mock("@/services/studentsService", async () => {
  return {
    studentsService: {
      getStudents: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 1,
      }),
    },
  };
});

function makeWrapper(academicYearId: string | null = null) {
  return ({ children }: { children: ReactNode }) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={qc}>
        <ActiveAcademicYearProvider initialAcademicYearId={academicYearId}>
          {children}
        </ActiveAcademicYearProvider>
      </QueryClientProvider>
    );
  };
}

describe("useStudents", () => {
  it("forwards context academic_year_id when none provided", async () => {
    vi.mocked(studentsService.getStudents).mockClear();
    const { result } = renderHook(() => useStudents(), {
      wrapper: makeWrapper("ay-1"),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsService.getStudents).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-1" }),
    );
  });

  it("explicit param overrides context", async () => {
    vi.mocked(studentsService.getStudents).mockClear();
    const { result } = renderHook(
      () => useStudents({ academic_year_id: "ay-override" }),
      { wrapper: makeWrapper("ay-context") },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsService.getStudents).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-override" }),
    );
  });

  it("works when context has no year", async () => {
    vi.mocked(studentsService.getStudents).mockClear();
    const { result } = renderHook(() => useStudents(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsService.getStudents).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: undefined }),
    );
  });
});
