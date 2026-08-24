/**
 * Requesting a correction, and deciding on one.
 *
 * The assertion that matters throughout: nothing is applied optimistically. A
 * request must leave the mark alone, and a decision must not be shown as made
 * until the server says it was.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { RequestCorrectionDialog } from "./RequestCorrectionDialog";
import CorrectionsPage from "@/app/(dashboard)/examinations/corrections/page";
import { examinationsService } from "@/services/examinationsService";
import type { MarkCorrection, RegisterStudent } from "@/types/examination";

vi.mock("@/services/examinationsService", () => ({
  examinationsService: {
    requestMarkCorrection: vi.fn(),
    markCorrections: vi.fn(),
    approveMarkCorrection: vi.fn(),
    rejectMarkCorrection: vi.fn(),
  },
}));

const permissions = { value: ["assessment.manage", "assessment.update"] };

// `vi.mock` is hoisted above every const, so the factory has to build the hook
// inline rather than reference a shared one.
vi.mock("@/hooks", () => ({
  useAuth: () => ({
    tenantId: "tenant-1",
    hasPermission: (key: string) => permissions.value.includes(key),
  }),
}));
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    tenantId: "tenant-1",
    hasPermission: (key: string) => permissions.value.includes(key),
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const STUDENT: RegisterStudent = {
  studentId: "s-1",
  markId: "em-1",
  admissionNumber: "00123",
  fullName: "Riya Patel",
  rollNumber: 1,
  status: "present",
  marksObtained: 72,
};

const PENDING: MarkCorrection = {
  id: "mc-1",
  examMarkId: "em-1",
  status: "requested",
  fromStatus: "present",
  toStatus: "present",
  fromMarks: 72,
  toMarks: 75,
  reason: "Question 7 was added up twice",
  admissionNumber: "00123",
  fullName: "Riya Patel",
  className: "Grade 10 A",
  subjectName: "Mathematics",
  examinationName: "Half Yearly",
  maxMarks: 100,
  requestedByName: "Asha Mehta",
  requestedAt: "2026-07-20T10:00:00+00:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  permissions.value = ["assessment.manage", "assessment.update"];
  vi.mocked(examinationsService.markCorrections).mockResolvedValue([PENDING]);
});

function renderRequest(onRequested = vi.fn()) {
  render(
    <RequestCorrectionDialog
      open
      onClose={vi.fn()}
      student={STUDENT}
      examMarkId="em-1"
      paperLabel="Grade 10 A Mathematics"
      maxMarks={100}
      onRequested={onRequested}
    />,
    { wrapper },
  );
  return { onRequested };
}

describe("requesting a correction", () => {
  it("shows what the mark says now and what is being asked for", async () => {
    renderRequest();
    expect(screen.getByTestId("correction-before")).toHaveTextContent("Present · 72");

    await userEvent.clear(screen.getByLabelText(/corrected marks/i));
    await userEvent.type(screen.getByLabelText(/corrected marks/i), "75");
    expect(screen.getByTestId("correction-after")).toHaveTextContent("Present · 75");
  });

  it("requires a reason", async () => {
    renderRequest();
    await userEvent.click(screen.getByRole("button", { name: /request correction/i }));

    expect(await screen.findByText(/say why this mark should change/i)).toBeVisible();
    expect(examinationsService.requestMarkCorrection).not.toHaveBeenCalled();
  });

  it("refuses a mark above the paper's maximum before asking the server", async () => {
    renderRequest();
    await userEvent.clear(screen.getByLabelText(/corrected marks/i));
    await userEvent.type(screen.getByLabelText(/corrected marks/i), "150");
    await userEvent.type(screen.getByLabelText(/reason/i), "typo");
    await userEvent.click(screen.getByRole("button", { name: /request correction/i }));

    expect(await screen.findByText(/more than the paper's 100/i)).toBeVisible();
    expect(examinationsService.requestMarkCorrection).not.toHaveBeenCalled();
  });

  it("clears and disables the mark for a status that takes none", async () => {
    renderRequest();
    await userEvent.click(screen.getByLabelText(/corrected status/i));
    await userEvent.click(await screen.findByRole("option", { name: "Absent" }));

    expect(screen.getByLabelText(/corrected marks/i)).toHaveValue("");
    expect(screen.getByLabelText(/corrected marks/i)).toBeDisabled();
    expect(screen.getByTestId("correction-after")).toHaveTextContent("Absent");
  });

  it("sends the request and reports success without touching the mark", async () => {
    vi.mocked(examinationsService.requestMarkCorrection).mockResolvedValue(PENDING);
    const { onRequested } = renderRequest();

    await userEvent.clear(screen.getByLabelText(/corrected marks/i));
    await userEvent.type(screen.getByLabelText(/corrected marks/i), "75");
    await userEvent.type(screen.getByLabelText(/reason/i), "Re-totalled");
    await userEvent.click(screen.getByRole("button", { name: /request correction/i }));

    await waitFor(() =>
      expect(examinationsService.requestMarkCorrection).toHaveBeenCalledWith({
        examMarkId: "em-1",
        toStatus: "present",
        toMarks: 75,
        reason: "Re-totalled",
      }),
    );
    expect(onRequested).toHaveBeenCalled();
  });

  it("keeps what was typed when the server refuses", async () => {
    vi.mocked(examinationsService.requestMarkCorrection).mockRejectedValue(
      new Error("This paper is still open for marking"),
    );
    const { onRequested } = renderRequest();

    await userEvent.type(screen.getByLabelText(/reason/i), "Re-totalled");
    await userEvent.click(screen.getByRole("button", { name: /request correction/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/still open for marking/i);
    expect(onRequested).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/reason/i)).toHaveValue("Re-totalled");
  });
});

describe("the correction queue", () => {
  it("shows what a reviewer needs without a second screen", async () => {
    render(<CorrectionsPage />, { wrapper });

    expect(await screen.findByText("Riya Patel")).toBeVisible();
    expect(screen.getByText(/Half Yearly · Grade 10 A Mathematics/)).toBeVisible();
    expect(screen.getByText("Present · 72")).toBeVisible();
    expect(screen.getByText("Present · 75")).toBeVisible();
    expect(screen.getByText(/added up twice/)).toBeVisible();
    expect(screen.getByText(/Asha Mehta/)).toBeVisible();
  });

  it("says so when nothing is waiting", async () => {
    vi.mocked(examinationsService.markCorrections).mockResolvedValue([]);
    render(<CorrectionsPage />, { wrapper });
    expect(
      await screen.findByText(/nothing is waiting for a decision/i),
    ).toBeVisible();
  });

  it("offers a retry when the read fails", async () => {
    vi.mocked(examinationsService.markCorrections).mockRejectedValue(
      new Error("boom"),
    );
    render(<CorrectionsPage />, { wrapper });
    expect(await screen.findByText(/couldn't load corrections/i)).toBeVisible();
  });

  it("is closed to somebody without the manage key", async () => {
    permissions.value = ["assessment.update"];
    render(<CorrectionsPage />, { wrapper });
    expect(
      await screen.findByText(/do not have permission to decide/i),
    ).toBeVisible();
    expect(examinationsService.markCorrections).not.toHaveBeenCalled();
  });

  it("approves through a confirmation", async () => {
    vi.mocked(examinationsService.approveMarkCorrection).mockResolvedValue({
      ...PENDING, status: "approved",
    });
    render(<CorrectionsPage />, { wrapper });

    await userEvent.click(await screen.findByRole("button", { name: /approve/i }));
    expect(await screen.findByText(/approve this correction\?/i)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /^Approve$/ }),
    );

    await waitFor(() =>
      expect(examinationsService.approveMarkCorrection).toHaveBeenCalledWith(
        "mc-1",
        null,
      ),
    );
  });

  it("requires a reason before rejecting", async () => {
    render(<CorrectionsPage />, { wrapper });

    await userEvent.click(await screen.findByRole("button", { name: /reject/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Reject$/ }));

    expect(
      await screen.findByText(/say why this correction is being rejected/i),
    ).toBeVisible();
    expect(examinationsService.rejectMarkCorrection).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/reason/i), "Answer sheet agrees");
    vi.mocked(examinationsService.rejectMarkCorrection).mockResolvedValue({
      ...PENDING, status: "rejected",
    });
    await userEvent.click(screen.getByRole("button", { name: /^Reject$/ }));

    await waitFor(() =>
      expect(examinationsService.rejectMarkCorrection).toHaveBeenCalledWith(
        "mc-1",
        "Answer sheet agrees",
      ),
    );
  });

  it("shows a stale-decision conflict without pretending it worked", async () => {
    vi.mocked(examinationsService.approveMarkCorrection).mockRejectedValue(
      new Error("This correction is already approved"),
    );
    render(<CorrectionsPage />, { wrapper });

    await userEvent.click(await screen.findByRole("button", { name: /approve/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /^Approve$/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/already approved/i);
  });

  it("can read decided history instead of the queue", async () => {
    render(<CorrectionsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    await userEvent.click(screen.getByLabelText(/correction status/i));
    await userEvent.click(await screen.findByRole("option", { name: "Approved" }));

    await waitFor(() =>
      expect(examinationsService.markCorrections).toHaveBeenCalledWith("approved"),
    );
  });
});
