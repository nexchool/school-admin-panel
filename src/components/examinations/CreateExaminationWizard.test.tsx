/**
 * The wizard's job is the fan-out: one subject set across several sections.
 *
 * So the assertions that matter are the arithmetic the user is shown and the
 * variables that reach the server — including the acceptance case, 2 sections
 * × 6 subjects = 12 papers, sent as **one** subject set rather than twelve
 * papers the client built itself.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { CreateExaminationWizard } from "./CreateExaminationWizard";
import { examinationsService } from "@/services/examinationsService";
import type { ClassItem } from "@/types/class";

vi.mock("@/services/examinationsService", () => ({
  examinationsService: {
    create: vi.fn(),
    examTypes: vi.fn(),
  },
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ tenantId: "tenant-1", hasPermission: () => true }),
}));

const SECTIONS = [
  { id: "cl-a", name: "Grade 10 A" },
  { id: "cl-b", name: "Grade 10 B" },
] as unknown as ClassItem[];

const SUBJECTS = [
  { id: "sb-1", name: "Mathematics" },
  { id: "sb-2", name: "Science" },
  { id: "sb-3", name: "English" },
  { id: "sb-4", name: "Social Science" },
  { id: "sb-5", name: "Hindi" },
  { id: "sb-6", name: "Computer" },
];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderWizard(onCreated = vi.fn()) {
  render(
    <CreateExaminationWizard
      open
      onClose={vi.fn()}
      academicCycleId="cy-1"
      sections={SECTIONS}
      subjects={SUBJECTS}
      onCreated={onCreated}
    />,
    { wrapper },
  );
  return { onCreated };
}

const next = () => userEvent.click(screen.getByRole("button", { name: /next/i }));
const back = () => userEvent.click(screen.getByRole("button", { name: /back/i }));

async function pickSections(...labels: string[]) {
  for (const label of labels) {
    await userEvent.click(screen.getByLabelText(label));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(examinationsService.examTypes).mockResolvedValue([
    { id: "et-1", name: "Half Yearly", sequence: 1 },
  ]);
  vi.mocked(examinationsService.create).mockResolvedValue({
    id: "ex-1",
    name: "Half Yearly",
    status: "draft",
    academicCycleId: "cy-1",
    examTypeId: "et-1",
  });
});

describe("create examination wizard", () => {
  it("refuses to move on with no section chosen", async () => {
    renderWizard();
    await next();
    expect(await screen.findByText(/choose at least one section/i)).toBeVisible();
  });

  it("refuses to move on with no subject chosen", async () => {
    renderWizard();
    await pickSections("Grade 10 A");
    await next();
    await next();
    expect(await screen.findByText(/choose at least one subject/i)).toBeVisible();
  });

  it("shows the paper count as sections x subjects", async () => {
    renderWizard();
    await pickSections("Grade 10 A", "Grade 10 B");
    await next();
    await userEvent.click(screen.getByLabelText("Mathematics"));
    await userEvent.click(screen.getByLabelText("Science"));

    expect(screen.getByTestId("paper-count-hint")).toHaveTextContent(
      "2 sections × 2 subjects = 4 papers",
    );
  });

  it("requires a name and a kind before going further", async () => {
    renderWizard();
    await pickSections("Grade 10 A");
    await next();
    await userEvent.click(screen.getByLabelText("Mathematics"));
    await next();
    await next();

    expect(await screen.findByText(/give this examination a name/i)).toBeVisible();
    expect(screen.getByText(/choose what kind of examination/i)).toBeVisible();
  });

  it("keeps what was chosen when stepping backward", async () => {
    renderWizard();
    await pickSections("Grade 10 A", "Grade 10 B");
    await next();
    await userEvent.click(screen.getByLabelText("Mathematics"));
    await back();

    expect(screen.getByLabelText("Grade 10 A")).toBeChecked();
    expect(screen.getByLabelText("Grade 10 B")).toBeChecked();
  });

  it("refuses pass marks above the total", async () => {
    renderWizard();
    await pickSections("Grade 10 A");
    await next();
    await userEvent.click(screen.getByLabelText("Mathematics"));
    await next();
    await userEvent.type(screen.getByLabelText(/name/i), "Half Yearly");
    await userEvent.click(screen.getByLabelText(/kind of examination/i));
    await userEvent.click(await screen.findByRole("option", { name: "Half Yearly" }));
    await next();

    await userEvent.clear(screen.getByLabelText(/total marks/i));
    await userEvent.type(screen.getByLabelText(/total marks/i), "50");
    await userEvent.type(screen.getByLabelText(/pass marks/i), "80");
    await next();

    expect(
      await screen.findByText(/pass marks cannot be above the total/i),
    ).toBeVisible();
  });

  it("the acceptance case: 2 sections x 6 subjects creates 12 papers in one call", async () => {
    const { onCreated } = renderWizard();

    await pickSections("Grade 10 A", "Grade 10 B");
    await next();
    for (const subject of SUBJECTS) {
      await userEvent.click(screen.getByLabelText(subject.name));
    }
    expect(screen.getByTestId("paper-count-hint")).toHaveTextContent(
      "2 sections × 6 subjects = 12 papers",
    );
    await next();

    await userEvent.type(screen.getByLabelText(/name/i), "Grade 10 Half-Yearly");
    await userEvent.click(screen.getByLabelText(/kind of examination/i));
    await userEvent.click(await screen.findByRole("option", { name: "Half Yearly" }));
    await next();

    await userEvent.type(screen.getByLabelText(/^date$/i), "2026-07-06");
    await next();

    // The review states the arithmetic and lists every paper.
    expect(screen.getByTestId("review-paper-count")).toHaveTextContent("12");
    expect(screen.getAllByRole("row")).toHaveLength(13); // 12 papers + header

    await userEvent.click(
      screen.getByRole("button", { name: /create 12 papers/i }),
    );

    await waitFor(() => expect(examinationsService.create).toHaveBeenCalledTimes(1));
    const input = vi.mocked(examinationsService.create).mock.calls[0][0];

    expect(input.academicCycleId).toBe("cy-1");
    expect(input.examTypeId).toBe("et-1");
    expect(input.name).toBe("Grade 10 Half-Yearly");
    // One subject set — not twelve papers the client assembled. The server
    // resolves which offering teaches each (section, subject) pair.
    expect(input.subjectSet?.classIds).toEqual(["cl-a", "cl-b"]);
    expect(input.subjectSet?.subjects).toHaveLength(6);
    expect(input.subjectSet?.subjects[0]).toMatchObject({
      subjectId: "sb-1",
      maxMarks: 100,
      examDate: "2026-07-06",
    });
    expect(onCreated).toHaveBeenCalledWith("ex-1");
  });

  it("a refused creation keeps the wizard state and shows why", async () => {
    vi.mocked(examinationsService.create).mockRejectedValue(
      new Error("Grade 10 Z does not teach one of the chosen subjects"),
    );
    const { onCreated } = renderWizard();

    await pickSections("Grade 10 A");
    await next();
    await userEvent.click(screen.getByLabelText("Mathematics"));
    await next();
    await userEvent.type(screen.getByLabelText(/name/i), "Half Yearly");
    await userEvent.click(screen.getByLabelText(/kind of examination/i));
    await userEvent.click(await screen.findByRole("option", { name: "Half Yearly" }));
    await next();
    await next();

    await userEvent.click(screen.getByRole("button", { name: /create 1 papers/i }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/does not teach one of the chosen subjects/i);
    expect(onCreated).not.toHaveBeenCalled();
    // Still on Review, with the selections intact.
    expect(screen.getByTestId("review-paper-count")).toHaveTextContent("1");
  });
});
