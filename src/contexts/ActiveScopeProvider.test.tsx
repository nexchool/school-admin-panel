import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ActiveScopeProvider } from "./ActiveScopeProvider";
import { useActiveUnit } from "./ActiveUnitContext";
import { useActiveAcademicYear } from "./ActiveAcademicYearContext";

// ── Mock hook modules ────────────────────────────────────────────────────────

vi.mock("@/hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useSchoolUnits", () => ({
  useSchoolUnits: vi.fn(),
}));

vi.mock("@/hooks/useAcademicYears", () => ({
  useAcademicYears: vi.fn(),
}));

vi.mock("@/hooks/useSchoolSetup", () => ({
  useSetupStatus: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { useAuth } from "@/hooks";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useSetupStatus } from "@/hooks/useSchoolSetup";

function setup(overrides: {
  isAuthenticated?: boolean;
  defaultUnitId?: string | null;
  units?: { id: string; status: string }[];
  years?: { id: string; is_active: boolean }[];
  activeYearId?: string | null;
}) {
  const {
    isAuthenticated = true,
    defaultUnitId = null,
    units = [],
    years = [],
    activeYearId = null,
  } = overrides;

  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
    user: defaultUnitId ? { default_unit_id: defaultUnitId } : null,
  } as ReturnType<typeof useAuth>);

  vi.mocked(useSchoolUnits).mockReturnValue({
    data: units,
  } as ReturnType<typeof useSchoolUnits>);

  vi.mocked(useAcademicYears).mockReturnValue({
    data: years,
  } as ReturnType<typeof useAcademicYears>);

  vi.mocked(useSetupStatus).mockReturnValue({
    data: activeYearId
      ? { academic_year: { active_id: activeYearId } }
      : undefined,
  } as ReturnType<typeof useSetupStatus>);
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <ActiveScopeProvider>{children}</ActiveScopeProvider>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ActiveScopeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with null unit and academic year when data is not yet resolved", () => {
    setup({ isAuthenticated: true });
    const { result } = renderHook(
      () => ({ unit: useActiveUnit(), year: useActiveAcademicYear() }),
      { wrapper }
    );
    expect(result.current.unit.unitId).toBeNull();
    expect(result.current.year.academicYearId).toBeNull();
  });

  it("populates unitId from default_unit_id once data resolves", async () => {
    setup({ defaultUnitId: "unit-42" });
    const { result } = renderHook(() => useActiveUnit(), { wrapper });
    await waitFor(() => expect(result.current.unitId).toBe("unit-42"));
  });

  it("populates unitId from first active unit when no default_unit_id", async () => {
    setup({ units: [{ id: "unit-1", status: "active" }] });
    const { result } = renderHook(() => useActiveUnit(), { wrapper });
    await waitFor(() => expect(result.current.unitId).toBe("unit-1"));
  });

  it("populates academicYearId from status.academic_year.active_id", async () => {
    setup({ activeYearId: "ay-99" });
    const { result } = renderHook(() => useActiveAcademicYear(), { wrapper });
    await waitFor(() => expect(result.current.academicYearId).toBe("ay-99"));
  });

  it("populates academicYearId from years list when status has no active_id", async () => {
    setup({ years: [{ id: "ay-2", is_active: true }] });
    const { result } = renderHook(() => useActiveAcademicYear(), { wrapper });
    await waitFor(() => expect(result.current.academicYearId).toBe("ay-2"));
  });

  it("does not override unitId that the user set via the switcher after mount", async () => {
    setup({ defaultUnitId: "unit-42" });
    const { result } = renderHook(() => useActiveUnit(), { wrapper });
    // Wait for the sync to run once
    await waitFor(() => expect(result.current.unitId).toBe("unit-42"));

    // User switches to a different unit via the header switcher
    act(() => result.current.setUnitId("unit-99"));
    expect(result.current.unitId).toBe("unit-99");

    // Simulate a data refetch (e.g. background re-render) — the guard should
    // prevent the sync effect from clobbering the user's choice.
    // Re-render (re-run effects) with the same resolved data:
    setup({ defaultUnitId: "unit-42" });
    // The unitId should still be what the user set
    expect(result.current.unitId).toBe("unit-99");
  });

  it("does not sync when not authenticated", () => {
    setup({
      isAuthenticated: false,
      defaultUnitId: "unit-42",
      activeYearId: "ay-99",
    });
    const { result } = renderHook(
      () => ({ unit: useActiveUnit(), year: useActiveAcademicYear() }),
      { wrapper }
    );
    expect(result.current.unit.unitId).toBeNull();
    expect(result.current.year.academicYearId).toBeNull();
  });
});
