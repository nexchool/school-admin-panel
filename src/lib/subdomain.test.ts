import { describe, expect, it } from "vitest";
import { getSubdomain, getCurrentSubdomain } from "./subdomain";

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

  it("returns null for www prefix on localhost", () => {
    expect(getSubdomain("www.localhost")).toBeNull();
  });
});

describe("getCurrentSubdomain", () => {
  it("is exported and callable", () => {
    // SSR guard: typeof window === "undefined" → returns null.
    // In jsdom window is always defined, so we just confirm the function is callable.
    expect(typeof getCurrentSubdomain).toBe("function");
  });
});
