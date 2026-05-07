import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSetupStepStatus } from "./useSetupStepStatus";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/school-setup/units"),
}));

vi.mock("@/hooks/useSchoolSetup", () => ({
  useSetupStatus: vi.fn(),
}));

import { useSetupStatus } from "@/hooks/useSchoolSetup";
import { usePathname } from "next/navigation";

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useSetupStepStatus", () => {
  it("returns 'now' when the route matches the step", () => {
    vi.mocked(usePathname).mockReturnValue("/school-setup/units");
    vi.mocked(useSetupStatus).mockReturnValue({ data: undefined } as any);
    const { result } = renderHook(() => useSetupStepStatus("units"), { wrapper });
    expect(result.current).toBe("now");
  });

  it("returns 'done' when module ready is true and route doesn't match", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useSetupStatus).mockReturnValue({
      data: { units: { ready: true } },
    } as any);
    const { result } = renderHook(() => useSetupStepStatus("units"), { wrapper });
    expect(result.current).toBe("done");
  });

  it("returns 'pending' when module ready is false", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useSetupStatus).mockReturnValue({
      data: { units: { ready: false } },
    } as any);
    const { result } = renderHook(() => useSetupStepStatus("units"), { wrapper });
    expect(result.current).toBe("pending");
  });

  it("returns 'optional' for terms when optional is true", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useSetupStatus).mockReturnValue({
      data: { terms: { ready: false, optional: true } },
    } as any);
    const { result } = renderHook(() => useSetupStepStatus("terms"), { wrapper });
    expect(result.current).toBe("optional");
  });

  it("returns 'pending' when data is loading", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useSetupStatus).mockReturnValue({ data: undefined } as any);
    const { result } = renderHook(() => useSetupStepStatus("units"), { wrapper });
    expect(result.current).toBe("pending");
  });

  it("returns 'done' for complete step when overall.is_setup_complete is true", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useSetupStatus).mockReturnValue({
      data: { overall: { is_setup_complete: true } },
    } as any);
    const { result } = renderHook(() => useSetupStepStatus("complete"), { wrapper });
    expect(result.current).toBe("done");
  });
});
