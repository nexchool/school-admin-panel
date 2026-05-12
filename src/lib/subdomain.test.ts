import { describe, expect, it } from "vitest";
import { getSubdomain } from "./subdomain";

describe("getSubdomain", () => {
  it("extracts subdomain from *.localhost", () => {
    expect(getSubdomain("mts.localhost")).toBe("mts");
  });

  it("extracts subdomain from *.nexchool.in", () => {
    expect(getSubdomain("mts.nexchool.in")).toBe("mts");
  });

  it("returns null for bare localhost", () => {
    expect(getSubdomain("localhost")).toBeNull();
  });

  it("returns null for root domain nexchool.in", () => {
    expect(getSubdomain("nexchool.in")).toBeNull();
  });

  it("returns null for www prefix", () => {
    expect(getSubdomain("www.nexchool.in")).toBeNull();
  });

  it("returns null for api prefix", () => {
    expect(getSubdomain("api.nexchool.in")).toBeNull();
  });

  it("strips port before extracting", () => {
    expect(getSubdomain("mts.localhost:3000")).toBe("mts");
  });
});
