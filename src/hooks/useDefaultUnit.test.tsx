import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateDefaultUnit } from "./useDefaultUnit";
import { usersService } from "@/services/usersService";

vi.mock("@/services/usersService", () => ({
  usersService: {
    updateDefaultUnit: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockRefreshUser = vi.fn();

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    refreshUser: mockRefreshUser,
    tenantName: null as string | null,
  }),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useUpdateDefaultUnit", () => {
  it("calls usersService.updateDefaultUnit with the unit id", async () => {
    vi.mocked(usersService.updateDefaultUnit).mockResolvedValueOnce({
      data: { default_unit_id: "unit-2" },
      message: "ok",
    });
    const { result } = renderHook(() => useUpdateDefaultUnit(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("unit-2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(usersService.updateDefaultUnit).toHaveBeenCalledWith("unit-2");
  });

  it("calls toast.error on failure", async () => {
    const { toast } = await import("sonner");
    vi.mocked(usersService.updateDefaultUnit).mockRejectedValueOnce(
      new Error("boom")
    );
    const { result } = renderHook(() => useUpdateDefaultUnit(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("bad-id");
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Failed to update default unit");
  });
});
