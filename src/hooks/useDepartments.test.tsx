import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDepartments, departmentsKeys } from "@/hooks/useDepartments";
import { departmentsService } from "@/services/departmentsService";
import { useAuth } from "@/components/providers/AuthProvider";

vi.mock("@/services/departmentsService", () => ({
  departmentsService: {
    list: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0,
    }),
  },
}));

// The hook gates on tenant context; provide a controllable tenant without the
// full AuthProvider (which would require a live session). Each test sets the
// return value it needs via vi.mocked(useAuth).mockReturnValue(...).
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useDepartments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch until a tenant is known", async () => {
    vi.mocked(useAuth).mockReturnValue({ tenantId: null } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useDepartments({}), {
      wrapper: createWrapper(),
    });

    // enabled: false means the query never leaves "pending"/idle — give it a
    // tick to prove it stays that way rather than asserting on a snapshot.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchStatus).toBe("idle");
    expect(departmentsService.list).not.toHaveBeenCalled();
  });

  it("fetches independently per tenant instead of reusing another tenant's cached entry", async () => {
    // Deliberately share ONE QueryClient across both renders. If tenantId were
    // missing from the query key (or not last), the second render would reuse
    // tenant A's cache entry and departmentsService.list would still show a
    // single call.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(qc);

    vi.mocked(useAuth).mockReturnValue({ tenantId: "tenant-a" } as ReturnType<typeof useAuth>);
    const { result: resultA } = renderHook(() => useDepartments({}), { wrapper });
    await waitFor(() => expect(resultA.current.isSuccess).toBe(true));
    expect(departmentsService.list).toHaveBeenCalledTimes(1);

    vi.mocked(useAuth).mockReturnValue({ tenantId: "tenant-b" } as ReturnType<typeof useAuth>);
    const { result: resultB } = renderHook(() => useDepartments({}), { wrapper });
    await waitFor(() => expect(resultB.current.isSuccess).toBe(true));
    expect(departmentsService.list).toHaveBeenCalledTimes(2);
  });

  it("puts tenantId as the last segment of the actual query key used at runtime", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(useAuth).mockReturnValue({ tenantId: "tenant-a" } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useDepartments({}), {
      wrapper: createWrapper(qc),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Inspect the query actually registered in the cache, not a key built by
    // hand from departmentsKeys — that would only test the key builder, not
    // what the hook wired up.
    const queries = qc.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    const key = queries[0].queryKey;
    expect(key[key.length - 1]).toBe("tenant-a");

    // departmentsKeys.list(params) must be a strict prefix of that key so
    // mutation-side prefix invalidation (departmentsKeys.all) matches it
    // regardless of which tenant is active.
    const prefix = departmentsKeys.list({});
    expect(key.slice(0, prefix.length)).toEqual(prefix);
  });
});
