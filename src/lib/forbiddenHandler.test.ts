import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MIN_REFRESH_INTERVAL_MS,
  notifyForbidden,
  registerForbiddenHandler,
  __resetForbiddenHandlerForTests,
} from "./forbiddenHandler";

afterEach(() => {
  __resetForbiddenHandlerForTests();
});

describe("forbiddenHandler registry", () => {
  it("invokes the registered handler on a 403 notification", () => {
    const handler = vi.fn();
    registerForbiddenHandler(handler);

    notifyForbidden(1000);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when no handler is registered", () => {
    // Nothing registered (after reset) — must not throw.
    expect(() => notifyForbidden(1000)).not.toThrow();
  });

  it("throttles a burst of 403s to a single refresh within the window", () => {
    const handler = vi.fn();
    registerForbiddenHandler(handler);

    // Two rapid 403s inside MIN_REFRESH_INTERVAL_MS → one refresh.
    notifyForbidden(1000);
    notifyForbidden(1000 + MIN_REFRESH_INTERVAL_MS - 1);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("allows a new refresh once the throttle window has elapsed", () => {
    const handler = vi.fn();
    registerForbiddenHandler(handler);

    notifyForbidden(1000);
    notifyForbidden(1000 + MIN_REFRESH_INTERVAL_MS);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops further invocations", () => {
    const handler = vi.fn();
    const unsubscribe = registerForbiddenHandler(handler);

    unsubscribe();
    notifyForbidden(1000);

    expect(handler).not.toHaveBeenCalled();
  });

  it("registering a second handler replaces the first", () => {
    const first = vi.fn();
    const second = vi.fn();
    registerForbiddenHandler(first);
    registerForbiddenHandler(second);

    notifyForbidden(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
