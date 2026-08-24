/**
 * The list and detail screens.
 *
 * The lifecycle assertions here check only that a button which would certainly
 * be refused is not offered — the server owns the transition table, and these
 * tests deliberately do not restate it.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ExaminationsPage from "./page";
import ExaminationDetailPage from "./[id]/page";
import { examinationsService } from "@/services/examinationsService";
import type { Examination } from "@/types/examination";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "ex-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/examinationsService", () => ({
  examinationsService: {
    list: vi.fn(),
    get: vi.fn(),
    examTypes: vi.fn().mockResolvedValue([]),
    schedule: vi.fn(),
    cancel: vi.fn(),
    create: vi.fn(),
    addPapers: vi.fn(),
  },
}));

const permissions = { value: ["examination.read", "examination.manage"] };

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    tenantId: "tenant-1",
    hasPermission: (key: string) => permissions.value.includes(key),
  }),
}));

vi.mock("@/hooks", () => ({
  useAuth: () => ({
    tenantId: "tenant-1",
    hasPermission: (key: string) => permissions.value.includes(key),
  }),
}));

vi.mock("@/hooks/useAcademicCycles", () => ({
  useAcademicCycles: () => ({
    data: [{ id: "cy-1", name: "Main 2026-27" }],
  }),
}));

vi.mock("@/hooks/useClasses", () => ({
  useClassesList: () => ({ data: { items: [] } }),
}));

vi.mock("@/hooks/useSubjects", () => ({
  useSubjects: () => ({ data: [] }),
}));

vi.mock("@/contexts/ActiveAcademicYearContext", () => ({
  useActiveAcademicYear: () => ({ academicYearId: "ay-1" }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const EXAM: Examination = {
  id: "ex-1",
  name: "Grade 10 Half-Yearly",
  status: "draft",
  academicCycleId: "cy-1",
  examTypeId: "et-1",
  classesSitting: ["cl-a", "cl-b"],
  papers: [
    {
      id: "p-1", classId: "cl-a", classSubjectId: "cs-1",
      subjectName: "Mathematics", className: "Grade 10 A",
      examDate: "2026-07-06", maxMarks: 100, passMarks: 35, marksLocked: false,
    },
    {
      id: "p-2", classId: "cl-b", classSubjectId: "cs-2",
      subjectName: "Mathematics", className: "Grade 10 B",
      examDate: "2026-07-06", maxMarks: 100, passMarks: 35, marksLocked: false,
    },
  ],
  timeline: [
    { id: "e-1", eventName: "ExaminationScheduled", occurredOn: "2026-07-01", note: "draft → scheduled" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  permissions.value = ["examination.read", "examination.manage"];
});

describe("examination list", () => {
  it("renders the examinations it is given", async () => {
    vi.mocked(examinationsService.list).mockResolvedValue({
      nodes: [EXAM], hasNextPage: false, totalCount: 1,
    });
    render(<ExaminationsPage />, { wrapper });

    expect(await screen.findByText("Grade 10 Half-Yearly")).toBeVisible();
    expect(screen.getByText("Draft")).toBeVisible();
  });

  it("says so when there are none", async () => {
    vi.mocked(examinationsService.list).mockResolvedValue({
      nodes: [], hasNextPage: false, totalCount: 0,
    });
    render(<ExaminationsPage />, { wrapper });
    expect(await screen.findByText(/no examinations found/i)).toBeVisible();
  });

  it("offers a retry when the read fails", async () => {
    vi.mocked(examinationsService.list).mockRejectedValue(new Error("boom"));
    render(<ExaminationsPage />, { wrapper });
    expect(await screen.findByText(/couldn't load examinations/i)).toBeVisible();
  });

  it("filters by status through the API, not in the browser", async () => {
    vi.mocked(examinationsService.list).mockResolvedValue({
      nodes: [], hasNextPage: false, totalCount: 0,
    });
    render(<ExaminationsPage />, { wrapper });
    await screen.findByText(/no examinations found/i);

    await userEvent.click(screen.getByLabelText(/status/i));
    await userEvent.click(await screen.findByRole("option", { name: "Scheduled" }));

    await waitFor(() =>
      expect(examinationsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "scheduled", offset: 0 }),
      ),
    );
  });

  it("opens the detail page when a row is clicked", async () => {
    vi.mocked(examinationsService.list).mockResolvedValue({
      nodes: [EXAM], hasNextPage: false, totalCount: 1,
    });
    render(<ExaminationsPage />, { wrapper });
    await userEvent.click(await screen.findByText("Grade 10 Half-Yearly"));
    expect(push).toHaveBeenCalledWith("/examinations/ex-1");
  });

  it("hides the create action from somebody who may only read", async () => {
    permissions.value = ["examination.read"];
    vi.mocked(examinationsService.list).mockResolvedValue({
      nodes: [], hasNextPage: false, totalCount: 0,
    });
    render(<ExaminationsPage />, { wrapper });
    await screen.findByText(/no examinations found/i);

    expect(
      screen.queryByRole("button", { name: /create examination/i }),
    ).not.toBeInTheDocument();
  });
});

describe("examination detail", () => {
  it("renders the papers grouped by section, and the history", async () => {
    vi.mocked(examinationsService.get).mockResolvedValue(EXAM);
    render(<ExaminationDetailPage />, { wrapper });

    expect(await screen.findByText("Grade 10 Half-Yearly")).toBeVisible();
    expect(screen.getByText("Grade 10 A")).toBeVisible();
    expect(screen.getByText("Grade 10 B")).toBeVisible();
    expect(screen.getAllByText("Mathematics")).toHaveLength(2);
    expect(screen.getByText("ExaminationScheduled")).toBeVisible();
  });

  it("says so when the examination is not this school's", async () => {
    vi.mocked(examinationsService.get).mockResolvedValue(null);
    render(<ExaminationDetailPage />, { wrapper });
    expect(await screen.findByText(/examination not found/i)).toBeVisible();
  });

  it("offers schedule and cancel on a draft", async () => {
    vi.mocked(examinationsService.get).mockResolvedValue(EXAM);
    render(<ExaminationDetailPage />, { wrapper });

    expect(await screen.findByRole("button", { name: /schedule/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeVisible();
  });

  it("offers neither on a published examination", async () => {
    vi.mocked(examinationsService.get).mockResolvedValue({
      ...EXAM, status: "published",
    });
    render(<ExaminationDetailPage />, { wrapper });
    await screen.findByText("Grade 10 Half-Yearly");

    expect(screen.queryByRole("button", { name: /schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument();
  });

  it("offers no lifecycle action to somebody who may only read", async () => {
    permissions.value = ["examination.read"];
    vi.mocked(examinationsService.get).mockResolvedValue(EXAM);
    render(<ExaminationDetailPage />, { wrapper });
    await screen.findByText("Grade 10 Half-Yearly");

    expect(screen.queryByRole("button", { name: /schedule/i })).not.toBeInTheDocument();
  });

  it("shows the server's refusal when scheduling fails", async () => {
    vi.mocked(examinationsService.get).mockResolvedValue(EXAM);
    vi.mocked(examinationsService.schedule).mockRejectedValue(
      new Error("2 paper(s) have no date yet"),
    );
    render(<ExaminationDetailPage />, { wrapper });

    await userEvent.click(await screen.findByRole("button", { name: /schedule/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /2 paper\(s\) have no date yet/i,
    );
  });

  it("requires a reason before cancelling, then sends it", async () => {
    vi.mocked(examinationsService.get).mockResolvedValue(EXAM);
    vi.mocked(examinationsService.cancel).mockResolvedValue({
      ...EXAM, status: "cancelled",
    });
    render(<ExaminationDetailPage />, { wrapper });

    await userEvent.click(await screen.findByRole("button", { name: /^cancel$/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /cancel examination/i }),
    );
    expect(await screen.findByText(/say why this examination is not being held/i))
      .toBeVisible();
    expect(examinationsService.cancel).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/reason/i), "Flooding");
    await userEvent.click(
      screen.getByRole("button", { name: /cancel examination/i }),
    );

    await waitFor(() =>
      expect(examinationsService.cancel).toHaveBeenCalledWith("ex-1", "Flooding"),
    );
  });
});
