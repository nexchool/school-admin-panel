import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWithdrawStudent } from "./useStudentLifecycle";
import { studentLifecycleService } from "@/services/studentLifecycleService";

vi.mock("@/services/studentLifecycleService", () => ({
  studentLifecycleService: {
    withdraw: vi.fn(),
    graduate: vi.fn(),
    reEnroll: vi.fn(),
    transferToSection: vi.fn(),
    transferOut: vi.fn(),
  },
}));

vi.mock("@/lib/errorToast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

const WITHDRAWN = {
  id: "s-1",
  admissionNumber: "ADM-0001",
  fullName: "Aarav Shah",
  status: "withdrawn",
  currentClass: null,
};

function harness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidated: unknown[][] = [];
  const original = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters: { queryKey?: unknown[] }) => {
    if (filters?.queryKey) invalidated.push(filters.queryKey);
    return original(filters);
  }) as typeof queryClient.invalidateQueries;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { Wrapper, invalidated };
}

describe("useWithdrawStudent", () => {
  beforeEach(() => {
    vi.mocked(studentLifecycleService.withdraw).mockReset();
  });

  it("sends the reason and the date the school gave", async () => {
    vi.mocked(studentLifecycleService.withdraw).mockResolvedValue(WITHDRAWN);
    const { Wrapper } = harness();

    const { result } = renderHook(() => useWithdrawStudent(), {
      wrapper: Wrapper,
    });
    await result.current.mutateAsync({
      id: "s-1",
      reason: "Family moved city",
      occurredOn: "2026-07-15",
    });

    // First argument only — TanStack Query passes its own context as a second.
    expect(vi.mocked(studentLifecycleService.withdraw).mock.calls[0][0]).toEqual(
      { id: "s-1", reason: "Family moved city", occurredOn: "2026-07-15" },
    );
  });

  // A withdrawal empties a seat and changes the billable headcount. Patching
  // one cache entry would leave a class showing a student who has left.
  it("refreshes everything the departure changed", async () => {
    vi.mocked(studentLifecycleService.withdraw).mockResolvedValue(WITHDRAWN);
    const { Wrapper, invalidated } = harness();

    const { result } = renderHook(() => useWithdrawStudent(), {
      wrapper: Wrapper,
    });
    await result.current.mutateAsync({ id: "s-1" });

    await waitFor(() => expect(invalidated.length).toBeGreaterThanOrEqual(3));
    expect(invalidated).toContainEqual(["students"]);
    expect(invalidated).toContainEqual(["classes"]);
    expect(invalidated).toContainEqual(["subscription"]);
  });

  // The tenant is the LAST segment of a query key, so invalidating the bare
  // prefix reaches every tenant scope (see query-conventions).
  it("invalidates by prefix rather than by an exact key", async () => {
    vi.mocked(studentLifecycleService.withdraw).mockResolvedValue(WITHDRAWN);
    const { Wrapper, invalidated } = harness();

    const { result } = renderHook(() => useWithdrawStudent(), {
      wrapper: Wrapper,
    });
    await result.current.mutateAsync({ id: "s-1" });

    const studentsKey = invalidated.find((key) => key[0] === "students");
    expect(studentsKey).toEqual(["students"]);
  });

  it("surfaces a refusal instead of reporting success", async () => {
    vi.mocked(studentLifecycleService.withdraw).mockRejectedValue(
      new Error("This student is already recorded as withdrawn"),
    );
    const { Wrapper } = harness();

    const { result } = renderHook(() => useWithdrawStudent(), {
      wrapper: Wrapper,
    });

    await expect(result.current.mutateAsync({ id: "s-1" })).rejects.toThrow(
      "already recorded as withdrawn",
    );
  });
});
