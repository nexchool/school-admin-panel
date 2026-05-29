import { describe, expect, it } from "vitest";

import {
  branchModeFromSubAdmin,
  disabledModuleKeys,
  emptyMatrix,
  matrixFromSubAdmin,
  matrixToSelection,
  selectionGrantsAnything,
  validateBranchSelection,
} from "./SubAdminFormModal";
import type {
  SubAdmin,
  SubAdminModuleCatalogEntry,
} from "@/services/subAdminsService";

// One module that declares a `delete` toggle, one that declares none.
const CATALOG: SubAdminModuleCatalogEntry[] = [
  {
    key: "students",
    label: "Students",
    levels: ["view", "edit", "manage"],
    toggles: ["delete"],
    branch_aware: true,
  },
  {
    key: "classes",
    label: "Classes",
    levels: ["view", "manage"],
    toggles: [],
    branch_aware: true,
  },
];

describe("emptyMatrix", () => {
  it("seeds every catalog module to none with all toggles off", () => {
    const matrix = emptyMatrix(CATALOG);
    expect(matrix.students).toEqual({
      level: "none",
      delete: false,
      refund: false,
      manage: false,
    });
    expect(matrix.classes.level).toBe("none");
  });
});

describe("matrixToSelection", () => {
  it("emits nothing when all modules are none", () => {
    expect(matrixToSelection(CATALOG, emptyMatrix(CATALOG))).toEqual([]);
  });

  it("only emits toggles for modules whose catalog entry declares them", () => {
    const matrix = emptyMatrix(CATALOG);
    // delete=true on both, but only `students` declares the delete toggle.
    matrix.students = { level: "edit", delete: true, refund: false, manage: false };
    matrix.classes = { level: "view", delete: true, refund: false, manage: false };

    const selection = matrixToSelection(CATALOG, matrix);
    const students = selection.find((s) => s.key === "students");
    const classes = selection.find((s) => s.key === "classes");

    expect(students).toEqual({ key: "students", level: "edit", delete: true });
    // classes does not declare `delete`, so the toggle is dropped.
    expect(classes).toEqual({ key: "classes", level: "view" });
    expect(classes?.delete).toBeUndefined();
  });

  it("skips modules left at none with no toggles", () => {
    const matrix = emptyMatrix(CATALOG);
    matrix.students = { level: "view", delete: false, refund: false, manage: false };
    const selection = matrixToSelection(CATALOG, matrix);
    expect(selection.map((s) => s.key)).toEqual(["students"]);
  });
});

describe("selectionGrantsAnything", () => {
  it("is false for an all-none selection", () => {
    expect(selectionGrantsAnything([])).toBe(false);
    expect(
      selectionGrantsAnything([{ key: "students", level: "none" }])
    ).toBe(false);
  });

  it("is true once a level is set", () => {
    expect(
      selectionGrantsAnything([{ key: "students", level: "view" }])
    ).toBe(true);
  });

  it("is true once a toggle is set even at level none", () => {
    expect(
      selectionGrantsAnything([
        { key: "students", level: "none", delete: true },
      ])
    ).toBe(true);
  });
});

describe("matrixFromSubAdmin round-trips a summary into matrix state", () => {
  it("hydrates granted modules and leaves the rest at none", () => {
    const subAdmin: SubAdmin = {
      id: "sa-1",
      name: "Sub Admin",
      email: "sa@school.com",
      status: "active",
      branch_unit_ids: [],
      modules: [
        {
          key: "students",
          label: "Students",
          level: "edit",
          delete: true,
          refund: false,
          manage: false,
        },
      ],
    };

    const matrix = matrixFromSubAdmin(CATALOG, subAdmin);
    expect(matrix.students).toEqual({
      level: "edit",
      delete: true,
      refund: false,
      manage: false,
    });
    // Ungranted module stays at none.
    expect(matrix.classes.level).toBe("none");

    // Round-trip: matrix → selection preserves the grant.
    expect(matrixToSelection(CATALOG, matrix)).toEqual([
      { key: "students", level: "edit", delete: true },
    ]);
  });

  it("ignores granted modules absent from the catalog", () => {
    const subAdmin: SubAdmin = {
      id: "sa-2",
      name: "X",
      email: "x@school.com",
      status: "active",
      branch_unit_ids: [],
      modules: [
        {
          key: "ghost",
          label: "Ghost",
          level: "manage",
          delete: false,
          refund: false,
          manage: true,
        },
      ],
    };
    const matrix = matrixFromSubAdmin(CATALOG, subAdmin);
    expect(matrix.ghost).toBeUndefined();
    expect(Object.keys(matrix).sort()).toEqual(["classes", "students"]);
  });
});

// ---------------------------------------------------------------------------
// Branch-access helpers
// ---------------------------------------------------------------------------

// Mixed catalog: two branch-aware modules + two non-branch-aware ones.
const MIXED_CATALOG: SubAdminModuleCatalogEntry[] = [
  {
    key: "students",
    label: "Students",
    levels: ["view", "edit"],
    toggles: ["delete"],
    branch_aware: true,
  },
  {
    key: "classes",
    label: "Classes",
    levels: ["view", "manage"],
    toggles: [],
    branch_aware: true,
  },
  {
    key: "teachers",
    label: "Teachers",
    levels: ["view", "edit"],
    toggles: ["delete"],
    branch_aware: false,
  },
  {
    key: "transport",
    label: "Transport",
    levels: ["view", "manage"],
    toggles: [],
    branch_aware: false,
  },
];

describe("disabledModuleKeys", () => {
  it("disables exactly the non-branch-aware modules in specific mode", () => {
    expect(disabledModuleKeys(MIXED_CATALOG, "specific")).toEqual(
      new Set(["teachers", "transport"])
    );
  });

  it("disables nothing in all-branches mode", () => {
    expect(disabledModuleKeys(MIXED_CATALOG, "all").size).toBe(0);
  });
});

describe("validateBranchSelection", () => {
  it("rejects specific mode with zero branches", () => {
    const error = validateBranchSelection(
      MIXED_CATALOG,
      "specific",
      [],
      [{ key: "students", level: "view" }]
    );
    expect(error).toMatch(/at least one branch/i);
  });

  it("rejects granting a non-branch-aware module in specific mode", () => {
    const error = validateBranchSelection(
      MIXED_CATALOG,
      "specific",
      ["unit-1"],
      [{ key: "teachers", level: "view" }]
    );
    expect(error).toMatch(/branch-scoped/i);
    expect(error).toMatch(/Teachers/);
  });

  it("accepts specific mode with branches + only branch-aware modules", () => {
    expect(
      validateBranchSelection(
        MIXED_CATALOG,
        "specific",
        ["unit-1"],
        [{ key: "students", level: "edit" }]
      )
    ).toBeNull();
  });

  it("accepts any module in all-branches mode and ignores branches", () => {
    expect(
      validateBranchSelection(
        MIXED_CATALOG,
        "all",
        [],
        [{ key: "teachers", level: "edit" }]
      )
    ).toBeNull();
  });
});

describe("branchModeFromSubAdmin", () => {
  const base: Omit<SubAdmin, "branch_unit_ids"> = {
    id: "sa",
    name: "N",
    email: "n@s.com",
    status: "active",
    modules: [],
  };

  it("is 'all' when no sub-admin (create mode)", () => {
    expect(branchModeFromSubAdmin(null)).toBe("all");
  });

  it("is 'all' when branch_unit_ids is empty (unrestricted)", () => {
    expect(branchModeFromSubAdmin({ ...base, branch_unit_ids: [] })).toBe(
      "all"
    );
  });

  it("is 'specific' when branch_unit_ids is non-empty", () => {
    expect(
      branchModeFromSubAdmin({ ...base, branch_unit_ids: ["u1"] })
    ).toBe("specific");
  });
});
