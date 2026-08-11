import { describe, expect, it } from "vitest";

import { classLabel, gradeAtSameLevel, gradeLabel, levelOf } from "./gradeLevel";

describe("gradeLabel", () => {
  it("spells out a bare number, which alone reads as a quantity", () => {
    expect(gradeLabel("1")).toBe("Grade 1");
    expect(gradeLabel("12")).toBe("Grade 12");
  });

  it("leaves the school's own wording alone", () => {
    // Expanding these would produce "Grade Grade 1" and "Grade Std 6".
    expect(gradeLabel("Grade 1")).toBe("Grade 1");
    expect(gradeLabel("Std 6")).toBe("Std 6");
    expect(gradeLabel("LKG")).toBe("LKG");
    expect(gradeLabel("Nursery")).toBe("Nursery");
  });
});

describe("classLabel", () => {
  it("composes grade and section", () => {
    expect(classLabel({ grade_name: "1", section: "A" })).toBe("Grade 1 · A");
    expect(classLabel({ grade_name: "LKG", section: "B" })).toBe("LKG · B");
  });

  it("drops the separator when there is no section", () => {
    expect(classLabel({ grade_name: "1" })).toBe("Grade 1");
  });

  it("falls back to the server's own label when the grade is missing", () => {
    // `name` is a nullable legacy column, so composing from it is what
    // produced classes reading "— A".
    expect(classLabel({ display_name: "1 A", section: "A" })).toBe("1 A");
    expect(classLabel({})).toBe("—");
  });
});

describe("levelOf", () => {
  it("reads the year out of the names a school actually uses", () => {
    expect(levelOf("5")).toBe(5);
    expect(levelOf("Std 5")).toBe(5);
    expect(levelOf("Grade 5")).toBe(5);
    expect(levelOf("Class 5")).toBe(5);
    expect(levelOf("12")).toBe(12);
  });

  it("gives up rather than guessing when there is no number", () => {
    // LKG, UKG and Nursery are real levels we cannot infer a position for.
    // Guessing one would put them silently into the middle of the ladder.
    expect(levelOf("LKG")).toBeNull();
    expect(levelOf("Nursery")).toBeNull();
  });
});

describe("gradeAtSameLevel", () => {
  const grades = [{ name: "5" }, { name: "6" }, { name: "LKG" }];

  it("catches a second spelling of a year the school already teaches", () => {
    // The case this exists for: typing "Std 6" where "6" exists creates a
    // second grade at the same point in the ladder, and nothing refuses it
    // because the names differ.
    expect(gradeAtSameLevel("Std 6", grades)).toEqual({ name: "6" });
    expect(gradeAtSameLevel("Grade 5", grades)).toEqual({ name: "5" });
  });

  it("leaves a genuinely new year alone", () => {
    expect(gradeAtSameLevel("Std 7", grades)).toBeUndefined();
  });

  it("does not pair up two names it cannot place", () => {
    // "UKG" and "LKG" both have no number. Treating them as the same level
    // would warn about a grade that is not a duplicate at all.
    expect(gradeAtSameLevel("UKG", grades)).toBeUndefined();
  });
});
