import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { AuthProvider, useAuth } from "./AuthProvider";

type Auth = ReturnType<typeof useAuth>;

// authService is mocked so we control login + profile payloads. The store is a
// real happy-dom localStorage, so persistence/hydration runs for real.
const loginMock = vi.fn();
const getProfileMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("@/services/authService", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
  getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock("@/lib/subdomain", () => ({
  getCurrentSubdomain: () => null,
}));

function Probe() {
  const { allowedUnitIds, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="allowed">{JSON.stringify(allowedUnitIds)}</span>
    </div>
  );
}

function renderProvider() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return render(<Probe />, { wrapper });
}

/**
 * Render the provider and return a mutable holder whose `.current` always
 * points at the latest auth context. We capture in an effect (not during
 * render) to respect react-hooks/globals lint rules.
 */
function renderWithCapture() {
  const holder: { current: Auth | null } = { current: null };
  function Capture() {
    const auth = useAuth();
    useEffect(() => {
      holder.current = auth;
    });
    return null;
  }
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Capture />
      </AuthProvider>
    </QueryClientProvider>
  );
  return holder;
}

const LOGIN_BASE = {
  access_token: "at",
  refresh_token: "rt",
  tenant_id: "tenant-1",
  user: { id: 1, email: "a@b.com" },
  permissions: [],
  enabled_features: [],
};

beforeEach(() => {
  localStorage.clear();
  loginMock.mockReset();
  getProfileMock.mockReset();
  logoutMock.mockReset();
});

describe("AuthProvider allowedUnitIds plumbing", () => {
  it("threads allowed_unit_ids from login, then overrides from profile", async () => {
    loginMock.mockResolvedValue({
      ...LOGIN_BASE,
      allowed_unit_ids: ["unit-1", "unit-2"],
    });
    // Profile is fetched right after login (refreshUser) — it can refine the set.
    getProfileMock.mockResolvedValue({
      user: { id: 1, email: "a@b.com" },
      roles: [],
      permissions: [],
      enabled_features: [],
      allowed_unit_ids: ["unit-1"],
    });

    const holder = renderWithCapture();
    await waitFor(() => expect(holder.current).not.toBeNull());

    await act(async () => {
      await holder.current!.login("a@b.com", "password123");
    });

    // Final value reflects the profile refinement.
    expect(holder.current!.allowedUnitIds).toEqual(["unit-1"]);
    // And it was persisted for hydration.
    expect(JSON.parse(localStorage.getItem("allowed_unit_ids")!)).toEqual([
      "unit-1",
    ]);
  });

  it("treats absent allowed_unit_ids as unrestricted (null)", async () => {
    loginMock.mockResolvedValue({ ...LOGIN_BASE });
    getProfileMock.mockResolvedValue({
      user: { id: 1, email: "a@b.com" },
      roles: [],
      permissions: [],
      enabled_features: [],
    });

    const holder = renderWithCapture();
    await waitFor(() => expect(holder.current).not.toBeNull());

    await act(async () => {
      await holder.current!.login("a@b.com", "password123");
    });

    expect(holder.current!.allowedUnitIds).toBeNull();
    expect(localStorage.getItem("allowed_unit_ids")).toBe("null");
  });

  it("hydrates persisted allowedUnitIds on a fresh mount", async () => {
    localStorage.setItem("access_token", "at");
    localStorage.setItem("refresh_token", "rt");
    localStorage.setItem("user_data", JSON.stringify({ id: 1, email: "a@b.com" }));
    localStorage.setItem("allowed_unit_ids", JSON.stringify(["unit-9"]));

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("true")
    );
    expect(screen.getByTestId("allowed").textContent).toBe(
      JSON.stringify(["unit-9"])
    );
  });

  it("resets allowedUnitIds to null on logout", async () => {
    loginMock.mockResolvedValue({
      ...LOGIN_BASE,
      allowed_unit_ids: ["unit-1"],
    });
    getProfileMock.mockResolvedValue({
      user: { id: 1, email: "a@b.com" },
      roles: [],
      permissions: [],
      enabled_features: [],
      allowed_unit_ids: ["unit-1"],
    });
    logoutMock.mockResolvedValue(undefined);

    const holder = renderWithCapture();
    await waitFor(() => expect(holder.current).not.toBeNull());

    await act(async () => {
      await holder.current!.login("a@b.com", "password123");
    });
    expect(holder.current!.allowedUnitIds).toEqual(["unit-1"]);

    await act(async () => {
      await holder.current!.logout();
    });
    expect(holder.current!.allowedUnitIds).toBeNull();
    expect(localStorage.getItem("allowed_unit_ids")).toBeNull();
  });
});
