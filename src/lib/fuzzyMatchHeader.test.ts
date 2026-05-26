import { describe, expect, it } from "vitest";
import { fuzzyMatchHeader } from "./fuzzyMatchHeader";

describe("fuzzyMatchHeader", () => {
  it("matches exact header case-insensitively", () => {
    expect(
      fuzzyMatchHeader("Unit Code", ["unit code", "grade", "section"]),
    ).toBe("unit code");
  });

  it("matches across separator differences (underscores vs spaces)", () => {
    expect(fuzzyMatchHeader("unit_code", ["Unit Code", "Section"])).toBe(
      "Unit Code",
    );
  });

  it("returns null when there is no close match", () => {
    expect(fuzzyMatchHeader("unrelated", ["foo", "bar"])).toBeNull();
  });
});
