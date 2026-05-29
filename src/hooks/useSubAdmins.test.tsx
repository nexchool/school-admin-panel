import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  subAdminsKeys,
  useSubAdmins,
  useCreateSubAdmin,
  useDeleteSubAdmin,
} from "./useSubAdmins";
import { subAdminsService } from "@/services/subAdminsService";

// Tenant context is mocked so we can flip tenantId per test (drives the
// tenant-scoping + enabled gating that useTenantQuery applies).
let mockTenantId: string | null = "tenant-1";

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ tenantId: mockTenantId }),
}));

vi.mock("@/services/subAdminsService", () => ({
  subAdminsService: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

const emptyResult = {
  items: [],
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 1,
    has_prev: false,
    has_next: false,
  },
};

beforeEach(() => {
  mockTenantId = "tenant-1";
  vi.clearAllMocks();
  vi.mocked(subAdminsService.list).mockResolvedValue(emptyResult);
});

describe("useSubAdmins reads are tenant-scoped", () => {
  it("appends tenantId as the last query-key segment", async () => {
    const { qc, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSubAdmins(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = qc
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    const subAdminKey = keys.find((k) => k[0] === "sub-admins");
    expect(subAdminKey).toBeDefined();
    // useTenantQuery appends tenantId as the LAST segment.
    expect(subAdminKey?.[subAdminKey.length - 1]).toBe("tenant-1");
  });

  it("does NOT fire when there is no tenant", async () => {
    mockTenantId = null;
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSubAdmins(), { wrapper });
    // Gated off: query stays disabled, service is never called.
    expect(result.current.fetchStatus).toBe("idle");
    expect(subAdminsService.list).not.toHaveBeenCalled();
  });

  it("does NOT fire when enabled=false (permission-gated case)", async () => {
    const { result } = renderHook(() => useSubAdmins(undefined, false), {
      wrapper: makeWrapper().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(subAdminsService.list).not.toHaveBeenCalled();
  });
});

describe("useSubAdmins mutations invalidate the tenant-agnostic prefix", () => {
  it("create invalidates subAdminsKeys.all without a tenantId segment", async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(subAdminsService.create).mockResolvedValue({} as never);

    const { result } = renderHook(() => useCreateSubAdmin(), { wrapper });
    result.current.mutate({
      name: "A",
      email: "a@b.com",
      password: "password123",
      modules: [],
      branch_unit_ids: [],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subAdminsKeys.all });
    // The invalidation key must be the bare prefix — no tenantId — so prefix
    // matching covers every tenant scope.
    expect(subAdminsKeys.all).toEqual(["sub-admins"]);
  });

  it("delete invalidates subAdminsKeys.all", async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(subAdminsService.remove).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteSubAdmin(), { wrapper });
    result.current.mutate("sa-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subAdminsKeys.all });
  });
});
