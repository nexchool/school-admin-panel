import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ActiveUnitProvider, useActiveUnit } from "./ActiveUnitContext";

describe("ActiveUnitContext", () => {
  it("returns null unitId by default", () => {
    const { result } = renderHook(() => useActiveUnit(), {
      wrapper: ({ children }) => (
        <ActiveUnitProvider initialUnitId={null}>{children}</ActiveUnitProvider>
      ),
    });
    expect(result.current.unitId).toBeNull();
  });

  it("uses initialUnitId from provider", () => {
    const { result } = renderHook(() => useActiveUnit(), {
      wrapper: ({ children }) => (
        <ActiveUnitProvider initialUnitId="unit-1">{children}</ActiveUnitProvider>
      ),
    });
    expect(result.current.unitId).toBe("unit-1");
  });

  it("setUnitId updates the value", () => {
    const { result } = renderHook(() => useActiveUnit(), {
      wrapper: ({ children }) => (
        <ActiveUnitProvider initialUnitId="unit-1">{children}</ActiveUnitProvider>
      ),
    });
    act(() => result.current.setUnitId("unit-2"));
    expect(result.current.unitId).toBe("unit-2");
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useActiveUnit())).toThrow(
      /useActiveUnit must be used inside ActiveUnitProvider/,
    );
  });
});
