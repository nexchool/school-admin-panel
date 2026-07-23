import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

vi.mock("@/lib/errorToast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

import { toastSuccess, toastError } from "@/lib/errorToast";
import { useAppMutation } from "@/hooks/useAppMutation";

const mockSuccess = vi.mocked(toastSuccess);
const mockError = vi.mocked(toastError);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAppMutation", () => {
  it("fires a success toast and still runs the caller's onSuccess", async () => {
    const callerOnSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useAppMutation(
          {
            mutationFn: async (n: number) => n * 2,
            onSuccess: callerOnSuccess,
          },
          { success: "Saved" },
        ),
      { wrapper },
    );

    await result.current.mutateAsync(3);

    expect(mockSuccess).toHaveBeenCalledWith("Saved", undefined);
    expect(callerOnSuccess).toHaveBeenCalledTimes(1);
  });

  it("builds a dynamic success message from data and variables", async () => {
    const { result } = renderHook(
      () =>
        useAppMutation(
          { mutationFn: async (n: number) => ({ count: n }) },
          { success: (data, vars) => `did ${data.count} for ${vars}` },
        ),
      { wrapper },
    );

    await result.current.mutateAsync(5);
    expect(mockSuccess).toHaveBeenCalledWith("did 5 for 5", undefined);
  });

  it("fires an error toast with a working Retry that re-runs the mutation", async () => {
    const mutationFn = vi.fn(async (n: number) => {
      throw new Error(`nope ${n}`);
    });
    const { result } = renderHook(
      () =>
        useAppMutation(
          { mutationFn },
          { error: "Couldn't save", retry: true },
        ),
      { wrapper },
    );

    await expect(result.current.mutateAsync(7)).rejects.toThrow("nope");
    await waitFor(() => expect(mockError).toHaveBeenCalledTimes(1));

    const [, fallback, opts] = mockError.mock.calls[0];
    expect(fallback).toBe("Couldn't save");
    expect(typeof opts?.onRetry).toBe("function");

    // Retry re-fires the mutation with the same variables. (react-query passes
    // a second context arg to mutationFn, so assert on the first arg only.)
    opts!.onRetry!();
    await waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(2));
    expect(mutationFn.mock.calls[1][0]).toBe(7);
  });

  it("stays silent when no toast config is given", async () => {
    const { result } = renderHook(
      () => useAppMutation({ mutationFn: async (n: number) => n }),
      { wrapper },
    );
    await result.current.mutateAsync(1);
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });
});
