/**
 * When a failed action is worth trying again.
 *
 * Found by walking the app as a school administrator: adding a section that
 * already exists showed "That section already exists for this grade, programme
 * and campus in this academic year" — a clear, correct, final answer — next to
 * a Retry button. Pressing it re-sends the identical request and gets the
 * identical refusal, which turns a good explanation into something that looks
 * like a glitch.
 *
 * Every mutation in the app that opts into `retry` had the same problem; it is
 * a property of the toast helper, not of the section form.
 */

import { describe, expect, it } from "vitest";

import { couldSucceedOnRetry } from "./useAppMutation";
import { ApiException } from "@/services/api";

describe("couldSucceedOnRetry", () => {
  it("offers no retry for a business refusal", () => {
    // The exact case that surfaced this: a duplicate section.
    expect(couldSucceedOnRetry(new ApiException("already exists", 400))).toBe(false);
    expect(couldSucceedOnRetry(new ApiException("conflict", 409))).toBe(false);
    expect(couldSucceedOnRetry(new ApiException("not allowed", 403))).toBe(false);
    expect(couldSucceedOnRetry(new ApiException("no such record", 404))).toBe(false);
    expect(couldSucceedOnRetry(new ApiException("unprocessable", 422))).toBe(false);
  });

  it("offers a retry when the server never answered", () => {
    // A dropped connection has no status — the case Retry exists for.
    expect(couldSucceedOnRetry(new Error("Failed to fetch"))).toBe(true);
    expect(couldSucceedOnRetry(undefined)).toBe(true);
    expect(couldSucceedOnRetry(null)).toBe(true);
  });

  it("offers a retry for a server fault", () => {
    expect(couldSucceedOnRetry(new ApiException("boom", 500))).toBe(true);
    expect(couldSucceedOnRetry(new ApiException("bad gateway", 502))).toBe(true);
  });

  it("offers a retry for a timeout or a rate limit", () => {
    // 4xx, but transient by definition — waiting is exactly the remedy.
    expect(couldSucceedOnRetry(new ApiException("timeout", 408))).toBe(true);
    expect(couldSucceedOnRetry(new ApiException("slow down", 429))).toBe(true);
  });

  it("ignores a status that is not a number", () => {
    expect(couldSucceedOnRetry({ status: "500" })).toBe(true);
  });
});
