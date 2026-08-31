import { describe, it, expect } from "vitest";

import { optionalPhone } from "./fields";

/**
 * `optionalPhone` is the shared Indian-mobile rule every form uses for a phone
 * field (Hostel warden phone, Student/Teacher contact …). It is mirrored
 * server-side by `core.validation.phone`, so these cases and the ones in
 * server/tests/test_hostel_schemas.py must stay in step.
 */
describe("optionalPhone", () => {
  const message = "Enter a valid 10-digit mobile number";

  it.each([
    ["a plain 10-digit mobile", "9876543210"],
    ["the lowest valid leading digit", "6012345678"],
    ["a +91 prefix with no separator", "+919876543210"],
    ["a +91 prefix separated by a space", "+91 9876543210"],
    ["a +91 prefix separated by a dash", "+91-9876543210"],
  ])("accepts %s", (_label, value) => {
    expect(optionalPhone.safeParse(value).success).toBe(true);
  });

  it("treats an empty field as no value, since the field is optional", () => {
    expect(optionalPhone.safeParse("").success).toBe(true);
  });

  it.each([
    ["too few digits", "123"],
    ["letters", "abcdefghij"],
    ["a country code with too few digits", "+91 12345"],
    ["too many digits", "999999999999999"],
    ["10 digits starting with 1", "1234567890"],
    ["10 digits starting with 5", "5876543210"],
    ["inner whitespace", "98765 43210"],
    ["a non-Indian country code", "+1 9876543210"],
    ["trailing junk", "9876543210x"],
  ])("rejects %s", (_label, value) => {
    const result = optionalPhone.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(message);
    }
  });
});
