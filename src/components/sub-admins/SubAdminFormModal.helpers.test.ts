import { describe, expect, it } from "vitest";

import {
  emptyMatrix,
  matrixFromSubAdmin,
  matrixToSelection,
  selectionGrantsAnything,
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
  },
  {
    key: "classes",
    label: "Classes",
    levels: ["view", "manage"],
    toggles: [],
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
