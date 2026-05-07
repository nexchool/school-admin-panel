import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  ActiveAcademicYearProvider,
  useActiveAcademicYear,
} from "./ActiveAcademicYearContext";

describe("ActiveAcademicYearContext", () => {
  it("returns null by default", () => {
    const { result } = renderHook(() => useActiveAcademicYear(), {
      wrapper: ({ children }) => (
        <ActiveAcademicYearProvider initialAcademicYearId={null}>
          {children}
        </ActiveAcademicYearProvider>
      ),
    });
    expect(result.current.academicYearId).toBeNull();
  });

  it("uses initial value from provider", () => {
    const { result } = renderHook(() => useActiveAcademicYear(), {
      wrapper: ({ children }) => (
        <ActiveAcademicYearProvider initialAcademicYearId="ay-1">
          {children}
        </ActiveAcademicYearProvider>
      ),
    });
    expect(result.current.academicYearId).toBe("ay-1");
  });

  it("setAcademicYearId updates the value", () => {
    const { result } = renderHook(() => useActiveAcademicYear(), {
      wrapper: ({ children }) => (
        <ActiveAcademicYearProvider initialAcademicYearId="ay-1">
          {children}
        </ActiveAcademicYearProvider>
      ),
    });
    act(() => result.current.setAcademicYearId("ay-2"));
    expect(result.current.academicYearId).toBe("ay-2");
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useActiveAcademicYear())).toThrow(
      /useActiveAcademicYear must be used inside ActiveAcademicYearProvider/,
    );
  });
});
