import { describe, it, expect } from "vitest";
import { setPasswordSchema } from "./passwordSchema";

describe("setPasswordSchema", () => {
  it("passes for a valid matching password with 8+ chars and a digit", () => {
    const result = setPasswordSchema.safeParse({
      new_password: "abcdefg1",
      confirm_password: "abcdefg1",
    });
    expect(result.success).toBe(true);
  });

  it("fails when the confirmation does not match", () => {
    const result = setPasswordSchema.safeParse({
      new_password: "abcdefg1",
      confirm_password: "abcdefg2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirm_password"))).toBe(true);
    }
  });

  it("fails when the password is shorter than 8 characters", () => {
    const result = setPasswordSchema.safeParse({
      new_password: "abc123",
      confirm_password: "abc123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("new_password"))).toBe(true);
    }
  });

  it("fails when the password has no digit", () => {
    const result = setPasswordSchema.safeParse({
      new_password: "abcdefgh",
      confirm_password: "abcdefgh",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("new_password"))).toBe(true);
    }
  });
});
