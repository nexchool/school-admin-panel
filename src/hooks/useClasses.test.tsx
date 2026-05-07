import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveUnitProvider } from "@/contexts/ActiveUnitContext";
import { ActiveAcademicYearProvider } from "@/contexts/ActiveAcademicYearContext";
import { useClasses } from "./useClasses";
import { classesService } from "@/services/classesService";
import type { ReactNode } from "react";

vi.mock("@/services/classesService", () => ({
  classesService: {
    getClasses: vi.fn().mockResolvedValue([]),
  },
}));

function makeWrapper({
  unitId = null,
  academicYearId = null,
}: { unitId?: string | null; academicYearId?: string | null } = {}) {
  return ({ children }: { children: ReactNode }) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={qc}>
        <ActiveUnitProvider initialUnitId={unitId}>
          <ActiveAcademicYearProvider initialAcademicYearId={academicYearId}>
            {children}
          </ActiveAcademicYearProvider>
        </ActiveUnitProvider>
      </QueryClientProvider>
    );
  };
}

describe("useClasses", () => {
  it("passes both context values to the service when no overrides", async () => {
    const { result } = renderHook(() => useClasses(), {
      wrapper: makeWrapper({ unitId: "u-1", academicYearId: "ay-1" }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(classesService.getClasses).toHaveBeenCalledWith({
      academic_year_id: "ay-1",
      school_unit_id: "u-1",
    });
  });

  it("overrides academic year only when override is given", async () => {
    vi.mocked(classesService.getClasses).mockClear();
    const { result } = renderHook(
      () => useClasses({ academic_year_id: "ay-override" }),
      { wrapper: makeWrapper({ unitId: "u-1", academicYearId: "ay-1" }) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(classesService.getClasses).toHaveBeenCalledWith({
      academic_year_id: "ay-override",
      school_unit_id: "u-1",
    });
  });

  it("explicit null override clears the filter", async () => {
    vi.mocked(classesService.getClasses).mockClear();
    const { result } = renderHook(
      () => useClasses({ school_unit_id: null }),
      { wrapper: makeWrapper({ unitId: "u-1", academicYearId: "ay-1" }) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(classesService.getClasses).toHaveBeenCalledWith({
      academic_year_id: "ay-1",
      school_unit_id: undefined,
    });
  });
});
