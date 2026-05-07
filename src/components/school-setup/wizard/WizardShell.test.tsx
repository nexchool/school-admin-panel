import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardShell } from "./WizardShell";
import type { ReactNode } from "react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: vi.fn(() => "/school-setup/units"),
}));

vi.mock("@/hooks/useSetupStepStatus", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    useSetupStepStatus: vi.fn(() => "now"),
  };
});

import { useSetupStepStatus } from "@/hooks/useSetupStepStatus";

function renderShell(overrides: Partial<React.ComponentProps<typeof WizardShell>> = {}) {
  const defaults = {
    stepKey: "units" as const,
    canContinue: true,
    onContinue: vi.fn(),
    children: <div>step body</div>,
  };
  return render(<WizardShell {...defaults} {...overrides} />);
}

describe("WizardShell", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(useSetupStepStatus).mockReturnValue("now");
  });

  it("renders the step title and description", () => {
    renderShell();
    expect(screen.getByText("School Units")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/)).toBeInTheDocument();
  });

  it("renders status badge from useSetupStepStatus", () => {
    vi.mocked(useSetupStepStatus).mockReturnValueOnce("done");
    renderShell();
    expect(screen.getByText("COMPLETE")).toBeInTheDocument();
  });

  it("disables the continue button when canContinue is false", () => {
    renderShell({ canContinue: false });
    expect(screen.getByRole("button", { name: /Save & Continue/i })).toBeDisabled();
  });

  it("disables back button on first step", () => {
    renderShell({ stepKey: "units" });
    expect(screen.getByRole("button", { name: /Back/i })).toBeDisabled();
  });

  it("does not render Skip on terms (now required)", () => {
    renderShell({ stepKey: "terms" });
    expect(screen.queryByRole("button", { name: /^Skip$/ })).not.toBeInTheDocument();
  });

  it("does not render Skip on required steps", () => {
    renderShell({ stepKey: "units" });
    expect(screen.queryByRole("button", { name: /^Skip$/ })).not.toBeInTheDocument();
  });

  it("uses 'Save changes' label when step is already done", () => {
    vi.mocked(useSetupStepStatus).mockReturnValue("done");
    renderShell({ stepKey: "units" });
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeInTheDocument();
  });

  it("calls onContinue and navigates to next step when not done", async () => {
    const onContinue = vi.fn();
    vi.mocked(useSetupStepStatus).mockReturnValue("now");
    renderShell({ stepKey: "units", onContinue });
    fireEvent.click(screen.getByRole("button", { name: /Save & Continue/i }));
    await vi.waitFor(() => expect(onContinue).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/school-setup/programmes"),
    );
  });

  it("does NOT auto-navigate when step is already done", async () => {
    const onContinue = vi.fn();
    vi.mocked(useSetupStepStatus).mockReturnValue("done");
    renderShell({ stepKey: "units", onContinue });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    await vi.waitFor(() => expect(onContinue).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
