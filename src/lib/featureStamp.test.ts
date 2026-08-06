import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetFeatureStampForTests,
  noteFeatureStamp,
  registerFeatureChangeHandler,
  resetFeatureStamp,
} from "./featureStamp";

describe("featureStamp", () => {
  beforeEach(() => {
    __resetFeatureStampForTests();
  });

  it("treats the first stamp of a session as the baseline, not a change", () => {
    // Otherwise every login would immediately re-fetch the profile it just got.
    const onChange = vi.fn();
    registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("says nothing while the school's modules stay the same", () => {
    const onChange = vi.fn();
    registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");
    noteFeatureStamp("aaaaaaaaaaaa");
    noteFeatureStamp("aaaaaaaaaaaa");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports a module being switched off", () => {
    const onChange = vi.fn();
    registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");
    noteFeatureStamp("bbbbbbbbbbbb");

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("refreshes once when a burst of requests all carry the new stamp", () => {
    // A page load fires a dozen requests at once. They should cost one
    // profile refresh between them, not a dozen.
    const onChange = vi.fn();
    registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");
    noteFeatureStamp("bbbbbbbbbbbb");
    noteFeatureStamp("bbbbbbbbbbbb");
    noteFeatureStamp("bbbbbbbbbbbb");

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores a response with no stamp on it", () => {
    // Pre-auth and non-tenant endpoints answer without one; that is not a
    // change, and must not reset what we know.
    const onChange = vi.fn();
    registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");
    noteFeatureStamp(null);
    noteFeatureStamp("aaaaaaaaaaaa");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("starts clean after logout, so the next school is not a change", () => {
    // Signing in as a different tenant means a different module set. Carrying
    // the previous stamp over would read as a change and refresh a profile
    // that was already fresh.
    const onChange = vi.fn();
    registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");
    resetFeatureStamp();
    noteFeatureStamp("bbbbbbbbbbbb");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops calling a handler that unsubscribed", () => {
    const onChange = vi.fn();
    const unsubscribe = registerFeatureChangeHandler(onChange);

    noteFeatureStamp("aaaaaaaaaaaa");
    unsubscribe();
    noteFeatureStamp("bbbbbbbbbbbb");

    expect(onChange).not.toHaveBeenCalled();
  });
});
