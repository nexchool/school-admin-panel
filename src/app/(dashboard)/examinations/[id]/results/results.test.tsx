/**
 * The results screen.
 *
 * Its one job that no other screen has is keeping **official** apart from
 * **current**, so most of these assert exactly that: what a parent was told
 * stays on screen while a revision is being worked on, and nothing is shown as
 * published before the server says it is.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ExaminationResultsPage from "./page";
import { examinationsService } from "@/services/examinationsService";
import type { ExaminationResults } from "@/types/examination";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "ex-1" }),
}));

vi.mock("@/services/examinationsService", () => ({
  examinationsService: {
    examinationResults: vi.fn(),
    calculateResults: vi.fn(),
    publishResults: vi.fn(),
    reviseStudentResult: vi.fn(),
    publishStudentRevision: vi.fn(),
    marksheet: vi.fn(),
  },
}));
vi.mock("@/lib/download", () => ({ triggerDownload: vi.fn() }));

const permissions = { value: ["examination.read", "examination.publish"] };
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

const v = (over: Partial<ExaminationResults["students"][0]["official"]> = {}) => ({
  id: `r-${over?.version ?? 1}`,
  version: 1,
  isCurrent: true,
  publishedAt: null,
  publishedByUserId: null,
  revisionReason: null,
  totalMax: 100,
  totalObtained: 88,
  percentage: 88,
  gradeLabel: "A",
  isPass: true,
  complete: true,
  warnings: [],
  ...over,
});

const CALCULATED: ExaminationResults = {
  examinationId: "ex-1",
  examinationName: "Half Yearly",
  examinationStatus: "marks_entry",
  readyToPublish: true,
  cohort: 1,
  calculated: 1,
  published: 0,
  revisionPending: 0,
  blocked: [],
  students: [
    {
      studentId: "s-1",
      admissionNumber: "00123",
      fullName: "Riya Patel",
      hasResult: true,
      revisionPending: false,
      official: null,
      current: v(),
      versions: [v()],
    },
  ],
};

/** Published v1, then a correction: official v1, current v2, unpublished. */
const PENDING: ExaminationResults = {
  ...CALCULATED,
  examinationStatus: "published",
  published: 1,
  revisionPending: 1,
  students: [
    {
      ...CALCULATED.students[0],
      revisionPending: true,
      official: v({ version: 1, publishedAt: "2026-07-20T10:00:00+00:00", isCurrent: false }),
      current: v({ version: 2, percentage: 95, gradeLabel: "A", publishedAt: null }),
      versions: [
        v({ version: 1, publishedAt: "2026-07-20T10:00:00+00:00", isCurrent: false }),
        v({ version: 2, percentage: 95, publishedAt: null, revisionReason: "Correction approved" }),
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  permissions.value = ["examination.read", "examination.publish"];
  vi.mocked(examinationsService.examinationResults).mockResolvedValue(CALCULATED);
});

describe("examination results", () => {
  it("shows a calculated result as current and not yet official", async () => {
    render(<ExaminationResultsPage />, { wrapper });

    expect(await screen.findByText("Riya Patel")).toBeVisible();
    expect(screen.getByTestId("current-s-1")).toHaveTextContent("88%");
    expect(screen.getByTestId("official-s-1")).toHaveTextContent("Not published");
    expect(screen.getByTestId("published-count")).toHaveTextContent("0");
  });

  it("reports the read failing", async () => {
    vi.mocked(examinationsService.examinationResults).mockRejectedValue(
      new Error("boom"),
    );
    render(<ExaminationResultsPage />, { wrapper });
    expect(await screen.findByText(/couldn't load results/i)).toBeVisible();
  });

  it("says so when the examination is not this school's", async () => {
    vi.mocked(examinationsService.examinationResults).mockResolvedValue(null);
    render(<ExaminationResultsPage />, { wrapper });
    expect(await screen.findByText(/examination not found/i)).toBeVisible();
  });

  it("hides every action from somebody who may only read", async () => {
    permissions.value = ["examination.read"];
    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    expect(screen.queryByRole("button", { name: /publish results/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /calculate/i })).not.toBeInTheDocument();
  });

  it("publishes through a dialog that summarises what is about to happen", async () => {
    vi.mocked(examinationsService.publishResults).mockResolvedValue({
      ...CALCULATED, published: 1, examinationStatus: "published",
    });
    render(<ExaminationResultsPage />, { wrapper });

    await userEvent.click(
      await screen.findByRole("button", { name: /publish results/i }),
    );
    // Not `window.confirm` — the product's dialog, with the counts.
    expect(await screen.findByText(/publish these results\?/i)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /^Publish$/ }));

    await waitFor(() =>
      expect(examinationsService.publishResults).toHaveBeenCalledWith("ex-1"),
    );
  });

  it("warns in the dialog when students are not ready", async () => {
    vi.mocked(examinationsService.examinationResults).mockResolvedValue({
      ...CALCULATED,
      readyToPublish: false,
      blocked: [{ studentId: "s-1", code: "RESULT_INCOMPLETE" }],
    });
    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    expect(screen.getByTestId("not-ready")).toHaveTextContent("1 student");
    expect(screen.getByText("RESULT_INCOMPLETE")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /publish results/i }));
    expect(
      await screen.findByText(/the server will refuse until every one of them is/i),
    ).toBeVisible();
  });

  it("shows the server's refusal and publishes nothing", async () => {
    vi.mocked(examinationsService.publishResults).mockRejectedValue(
      new Error("Student s-1 has papers with no mark recorded yet."),
    );
    render(<ExaminationResultsPage />, { wrapper });

    await userEvent.click(
      await screen.findByRole("button", { name: /publish results/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /^Publish$/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no mark recorded yet/i,
    );
    // Nothing was fabricated as published.
    expect(screen.getByTestId("published-count")).toHaveTextContent("0");
  });

  it("keeps the official result visible while a revision is pending", async () => {
    vi.mocked(examinationsService.examinationResults).mockResolvedValue(PENDING);
    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    expect(screen.getByText("Revision pending")).toBeVisible();
    expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    // What the parent was told is still there…
    expect(screen.getByTestId("official-s-1")).toHaveTextContent("88%");
    expect(screen.getByTestId("official-s-1")).toHaveTextContent("v1");
    // …and the working figure is shown separately.
    expect(screen.getByTestId("current-s-1")).toHaveTextContent("95%");
    expect(screen.getByTestId("current-s-1")).toHaveTextContent("v2");
  });

  it("publishes a revision as its own explicit action", async () => {
    const revised: ExaminationResults = {
      ...PENDING,
      revisionPending: 0,
      students: [{ ...PENDING.students[0], revisionPending: false }],
    };
    vi.mocked(examinationsService.examinationResults).mockResolvedValue(revised);
    vi.mocked(examinationsService.publishStudentRevision).mockResolvedValue(revised);
    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    await userEvent.click(
      screen.getByRole("button", { name: /publish revision/i }),
    );
    await waitFor(() =>
      expect(examinationsService.publishStudentRevision).toHaveBeenCalledWith(
        "ex-1",
        "s-1",
      ),
    );
  });

  it("shows every version, read-only, with which were published", async () => {
    vi.mocked(examinationsService.examinationResults).mockResolvedValue(PENDING);
    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    await userEvent.click(screen.getByRole("button", { name: /history/i }));
    const history = screen.getByTestId("history-s-1");
    expect(within(history).getByText(/v1/)).toBeVisible();
    expect(within(history).getByText(/published 2026-07-20/)).toBeVisible();
    expect(within(history).getByText(/not published/)).toBeVisible();
    expect(within(history).getByText(/Correction approved/)).toBeVisible();
    // History is a record, not a control surface.
    expect(within(history).queryByRole("button")).not.toBeInTheDocument();
  });

  it("calculates without publishing", async () => {
    vi.mocked(examinationsService.calculateResults).mockResolvedValue(CALCULATED);
    render(<ExaminationResultsPage />, { wrapper });

    await userEvent.click(await screen.findByRole("button", { name: /calculate/i }));
    await waitFor(() =>
      expect(examinationsService.calculateResults).toHaveBeenCalledWith("ex-1"),
    );
    expect(examinationsService.publishResults).not.toHaveBeenCalled();
  });
});


describe("the marksheet (EX-09)", () => {
  it("is offered only where an official result exists", async () => {
    // CALCULATED has a current result and no official one — nothing a parent
    // could be handed, so no download.
    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");
    expect(
      screen.queryByRole("button", { name: /marksheet for/i }),
    ).not.toBeInTheDocument();
  });

  it("downloads the official version, not the pending revision", async () => {
    const { triggerDownload } = await import("@/lib/download");
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    vi.mocked(examinationsService.examinationResults).mockResolvedValue(PENDING);
    vi.mocked(examinationsService.marksheet).mockResolvedValue(blob);

    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");

    await userEvent.click(
      screen.getByRole("button", { name: /marksheet for Riya Patel/i }),
    );

    await waitFor(() =>
      // No version argument: the server resolves the official one, so a screen
      // cannot accidentally ask for the unpublished v2 it can see.
      expect(examinationsService.marksheet).toHaveBeenCalledWith("ex-1", "s-1"),
    );
    expect(triggerDownload).toHaveBeenCalledWith(blob, "marksheet-s-1.pdf");
  });

  it("reports a refused download without pretending it worked", async () => {
    const { triggerDownload } = await import("@/lib/download");
    vi.mocked(examinationsService.examinationResults).mockResolvedValue(PENDING);
    vi.mocked(examinationsService.marksheet).mockRejectedValue(
      new Error("This student has no published result for this examination"),
    );

    render(<ExaminationResultsPage />, { wrapper });
    await screen.findByText("Riya Patel");
    await userEvent.click(
      screen.getByRole("button", { name: /marksheet for Riya Patel/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no published result/i,
    );
    expect(triggerDownload).not.toHaveBeenCalled();
  });
});
