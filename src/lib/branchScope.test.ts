import { describe, expect, it } from "vitest";

import {
  isLockedToSingleBranch,
  resolveDefaultUnitId,
  type BranchUnitLike,
} from "./branchScope";

const unit = (id: string, status: "active" | "inactive" = "active"): BranchUnitLike => ({
  id,
  status,
});

describe("isLockedToSingleBranch", () => {
  it("never locks an unrestricted user (allowedUnitIds null)", () => {
    expect(isLockedToSingleBranch(null, [unit("a")])).toBe(false);
    expect(isLockedToSingleBranch(null, [unit("a"), unit("b")])).toBe(false);
  });

  it("locks when restricted to exactly one allowed unit", () => {
    expect(isLockedToSingleBranch(["a"], [unit("a"), unit("b")])).toBe(true);
  });

  it("locks when restricted and only one unit is visible", () => {
    expect(isLockedToSingleBranch(["a", "b"], [unit("a")])).toBe(true);
  });

  it("does not lock when restricted user has multiple visible units", () => {
    expect(isLockedToSingleBranch(["a", "b"], [unit("a"), unit("b")])).toBe(
      false
    );
  });
});

describe("resolveDefaultUnitId", () => {
  it("returns null with no units", () => {
    expect(resolveDefaultUnitId(null, [])).toBeNull();
  });

  it("prefers default_unit_id when within the pool", () => {
    expect(
      resolveDefaultUnitId(null, [unit("a"), unit("b")], "b")
    ).toBe("b");
  });

  it("falls back to the first active unit when default is outside the pool", () => {
    expect(
      resolveDefaultUnitId(["a", "b"], [unit("a", "inactive"), unit("b")], "z")
    ).toBe("b");
  });

  it("ignores a default that is not in the restricted allow-list", () => {
    // 'c' is visible but not allowed; default 'c' must be dropped.
    expect(
      resolveDefaultUnitId(["a"], [unit("a"), unit("c")], "c")
    ).toBe("a");
  });

  it("falls back to first unit when none are active", () => {
    expect(
      resolveDefaultUnitId(null, [unit("a", "inactive"), unit("b", "inactive")])
    ).toBe("a");
  });
});
