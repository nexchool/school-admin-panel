import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveAcademicYearProvider } from "@/contexts/ActiveAcademicYearContext";
import { useFinanceSummary } from "./useFinanceSummary";
import { useStudentFees } from "./useStudentFees";
import { useFeeStructures } from "./useFeeStructures";
import { financeService } from "@/services/financeService";
import type { ReactNode } from "react";

vi.mock("@/services/financeService", async () => {
  return {
    financeService: {
      getSummary: vi.fn().mockResolvedValue(null),
      getStudentFees: vi.fn().mockResolvedValue([]),
      getStructures: vi.fn().mockResolvedValue([]),
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

// ── useFinanceSummary ─────────────────────────────────────────────────────────

describe("useFinanceSummary", () => {
  it("forwards context academic_year_id when none provided", async () => {
    vi.mocked(financeService.getSummary).mockClear();
    const { result } = renderHook(() => useFinanceSummary(), {
      wrapper: makeWrapper("ay-1"),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-1" }),
    );
  });

  it("explicit param overrides context", async () => {
    vi.mocked(financeService.getSummary).mockClear();
    const { result } = renderHook(
      () => useFinanceSummary({ academic_year_id: "ay-override" }),
      { wrapper: makeWrapper("ay-context") },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-override" }),
    );
  });

  it("works when context has no year", async () => {
    vi.mocked(financeService.getSummary).mockClear();
    const { result } = renderHook(() => useFinanceSummary(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: undefined }),
    );
  });
});

// ── useStudentFees ────────────────────────────────────────────────────────────

describe("useStudentFees", () => {
  it("forwards context academic_year_id when none provided", async () => {
    vi.mocked(financeService.getStudentFees).mockClear();
    const { result } = renderHook(() => useStudentFees(), {
      wrapper: makeWrapper("ay-1"),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getStudentFees).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-1" }),
    );
  });

  it("explicit param overrides context", async () => {
    vi.mocked(financeService.getStudentFees).mockClear();
    const { result } = renderHook(
      () => useStudentFees({ academic_year_id: "ay-override" }),
      { wrapper: makeWrapper("ay-context") },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getStudentFees).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-override" }),
    );
  });

  it("works when context has no year", async () => {
    vi.mocked(financeService.getStudentFees).mockClear();
    const { result } = renderHook(() => useStudentFees(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getStudentFees).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: undefined }),
    );
  });
});

// ── useFeeStructures ──────────────────────────────────────────────────────────

describe("useFeeStructures", () => {
  it("forwards context academic_year_id when none provided", async () => {
    vi.mocked(financeService.getStructures).mockClear();
    const { result } = renderHook(() => useFeeStructures(), {
      wrapper: makeWrapper("ay-1"),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getStructures).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-1" }),
    );
  });

  it("explicit param overrides context", async () => {
    vi.mocked(financeService.getStructures).mockClear();
    const { result } = renderHook(
      () => useFeeStructures({ academic_year_id: "ay-override" }),
      { wrapper: makeWrapper("ay-context") },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getStructures).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: "ay-override" }),
    );
  });

  it("works when context has no year", async () => {
    vi.mocked(financeService.getStructures).mockClear();
    const { result } = renderHook(() => useFeeStructures(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(financeService.getStructures).toHaveBeenCalledWith(
      expect.objectContaining({ academic_year_id: undefined }),
    );
  });
});
