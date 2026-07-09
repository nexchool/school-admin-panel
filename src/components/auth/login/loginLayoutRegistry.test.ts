import { describe, it, expect } from "vitest";
import { resolveLoginLayout } from "./loginLayoutRegistry";
import { DefaultLoginLayout } from "./DefaultLoginLayout";

describe("resolveLoginLayout", () => {
  it("returns the default layout for the 'default' variant", () => {
    expect(resolveLoginLayout("default")).toBe(DefaultLoginLayout);
  });

  it("falls back to the default layout for an unknown variant", () => {
    expect(resolveLoginLayout("greenwood-special")).toBe(DefaultLoginLayout);
  });

  it("falls back to the default layout when the variant is undefined", () => {
    expect(resolveLoginLayout(undefined)).toBe(DefaultLoginLayout);
  });

  it("falls back to the default layout for an empty string", () => {
    expect(resolveLoginLayout("")).toBe(DefaultLoginLayout);
  });
});
