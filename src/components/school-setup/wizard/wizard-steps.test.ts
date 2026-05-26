import { describe, expect, it } from "vitest";
import { WIZARD_STEPS, getStep, getNextStep, getPrevStep } from "./wizard-steps";

describe("wizard-steps registry", () => {
  it("contains exactly 8 steps in numerical order", () => {
    expect(WIZARD_STEPS).toHaveLength(8);
    WIZARD_STEPS.forEach((s, i) => expect(s.number).toBe(i + 1));
  });

  it("has one optional step (terms)", () => {
    const optional = WIZARD_STEPS.filter((s) => s.optional);
    expect(optional).toHaveLength(1);
    expect(optional[0].key).toBe("terms");
  });

  it("marks the terms step as optional", () => {
    const terms = getStep("terms");
    expect(terms.optional).toBe(true);
  });

  it("getStep returns the right step", () => {
    expect(getStep("classes").number).toBe(5);
  });

  it("getStep throws for unknown key", () => {
    expect(() => getStep("nope" as never)).toThrow(/Unknown wizard step/);
  });

  it("getNextStep returns next step", () => {
    expect(getNextStep("units")?.key).toBe("programmes");
  });

  it("getNextStep returns null after the last step", () => {
    expect(getNextStep("complete")).toBeNull();
  });

  it("getPrevStep returns previous step", () => {
    expect(getPrevStep("classes")?.key).toBe("academic-year");
  });

  it("getPrevStep returns null on the first step", () => {
    expect(getPrevStep("units")).toBeNull();
  });
});
