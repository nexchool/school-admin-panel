/**
 * The marks register.
 *
 * The assertions that matter are the six states surviving a round trip and the
 * save being one atomic call carrying exactly the changed rows — a screen that
 * silently sent unchanged rows, or split the save per student, would look
 * identical until a teacher's half-saved register disagreed with itself.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import MarksEntryPage from "./[paperId]/page";
import { examinationsService } from "@/services/examinationsService";
import type { MarkingRegister } from "@/types/examination";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "ex-1", paperId: "p-1" }),
}));

vi.mock("@/services/examinationsService", () => ({
  examinationsService: { markingRegister: vi.fn(), recordMarks: vi.fn() },
}));

const permissions = { value: ["assessment.manage"] };

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

/** A realistic register: marked, a genuine zero, absent, exempted, unentered. */
const REGISTER: MarkingRegister = {
  paper: {
    id: "p-1", classId: "cl-a", classSubjectId: "cs-1",
    subjectName: "Mathematics", className: "Grade 10 A",
    componentLabel: null, examDate: "2026-07-06",
    maxMarks: 100, passMarks: 35, marksLocked: false,
  },
  examinationId: "ex-1",
  examinationName: "Grade 10 Half-Yearly",
  examinationStatus: "marks_entry",
  openForMarking: true,
  progress: {
    eligible: 5, recorded: 4, outstanding: 1,
    locked: false, cohortSource: "enrollment",
  },
  students: [
    { studentId: "s-1", admissionNumber: "00123", fullName: "Rahul", rollNumber: 1, status: "present", marksObtained: 78 },
    { studentId: "s-2", admissionNumber: "00124", fullName: "Priya", rollNumber: 2, status: "present", marksObtained: 91 },
    { studentId: "s-3", admissionNumber: "00125", fullName: "Arjun", rollNumber: 3, status: null, marksObtained: null },
    { studentId: "s-4", admissionNumber: "00126", fullName: "Neha", rollNumber: 4, status: "present", marksObtained: 0 },
    { studentId: "s-5", admissionNumber: "00127", fullName: "Dev", rollNumber: 5, status: "absent", marksObtained: null },
  ],
};

const row = (name: string) =>
  screen.getByRole("row", { name: new RegExp(name) });

beforeEach(() => {
  vi.clearAllMocks();
  permissions.value = ["assessment.manage"];
  vi.mocked(examinationsService.markingRegister).mockResolvedValue(REGISTER);
  vi.mocked(examinationsService.recordMarks).mockResolvedValue(REGISTER);
});

describe("marks register", () => {
  it("renders the paper and every student", async () => {
    render(<MarksEntryPage />, { wrapper });
    expect(await screen.findByText(/Grade 10 A Mathematics/)).toBeVisible();
    expect(screen.getByText(/Out of 100/)).toBeVisible();
    for (const name of ["Rahul", "Priya", "Arjun", "Neha", "Dev"]) {
      expect(screen.getByText(name)).toBeVisible();
    }
  });

  it("keeps the six states distinct", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    // A recorded mark.
    expect(screen.getByLabelText("Marks for Rahul")).toHaveValue("78");
    // A genuine zero is present with 0 — not absent, not empty.
    expect(screen.getByLabelText("Marks for Neha")).toHaveValue("0");
    expect(within(row("Neha")).getByText("Present")).toBeVisible();
    // Absent carries no mark, and its field is disabled.
    expect(screen.getByLabelText("Marks for Dev")).toBeDisabled();
    expect(screen.getByLabelText("Marks for Dev")).toHaveValue("");
    expect(within(row("Dev")).getByText("Absent")).toBeVisible();
    // Not entered is neither: no status, empty mark.
    expect(within(row("Arjun")).getByText("Not entered")).toBeVisible();
    expect(screen.getByLabelText("Marks for Arjun")).toHaveValue("");
  });

  it("shows the backend's progress rather than counting rows itself", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");
    expect(screen.getByText(/Recorded/)).toBeVisible();
    expect(screen.getByText(/of 5/)).toBeVisible();
    expect(screen.getByTestId("outstanding")).toHaveTextContent("1");
  });

  it("refuses a mark above the paper's maximum", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    await userEvent.clear(screen.getByLabelText("Marks for Rahul"));
    await userEvent.type(screen.getByLabelText("Marks for Rahul"), "120");

    expect(await screen.findByText(/more than the paper's 100/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("refuses a negative mark", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");
    await userEvent.clear(screen.getByLabelText("Marks for Rahul"));
    await userEvent.type(screen.getByLabelText("Marks for Rahul"), "-5");
    expect(await screen.findByText(/cannot be negative/i)).toBeVisible();
  });

  it("refuses a value Number() would turn into Infinity", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");
    await userEvent.clear(screen.getByLabelText("Marks for Rahul"));
    await userEvent.type(screen.getByLabelText("Marks for Rahul"), "1e999");
    expect(await screen.findByText(/ordinary number/i)).toBeVisible();
  });

  it("accepts a genuine zero", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Arjun");
    await userEvent.type(screen.getByLabelText("Marks for Arjun"), "0");

    expect(screen.queryByText(/cannot be negative/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("clears and disables the mark when a status takes none", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    await userEvent.click(screen.getByLabelText("Status for Rahul"));
    await userEvent.click(await screen.findByRole("option", { name: "Exempted" }));

    expect(screen.getByLabelText("Marks for Rahul")).toHaveValue("");
    expect(screen.getByLabelText("Marks for Rahul")).toBeDisabled();
  });

  it("marks the draft dirty and counts what changed", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");
    expect(screen.queryByTestId("dirty-flag")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Marks for Arjun"), "55");
    expect(screen.getByTestId("dirty-flag")).toHaveTextContent("1 unsaved");
  });

  it("saves only the changed rows, in one call", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    await userEvent.type(screen.getByLabelText("Marks for Arjun"), "55");
    await userEvent.click(screen.getByLabelText("Status for Dev"));
    await userEvent.click(await screen.findByRole("option", { name: "Malpractice" }));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(examinationsService.recordMarks).toHaveBeenCalledTimes(1),
    );
    const [paperId, rows] = vi.mocked(examinationsService.recordMarks).mock.calls[0];
    expect(paperId).toBe("p-1");
    // Only the two that moved — Rahul, Priya and Neha are untouched.
    expect(rows).toEqual([
      { studentId: "s-3", status: "present", marksObtained: 55 },
      { studentId: "s-5", status: "malpractice", marksObtained: null },
    ]);
  });

  it("keeps the draft and shows the refusal when a save fails", async () => {
    vi.mocked(examinationsService.recordMarks).mockRejectedValue(
      new Error("This paper has been closed for marking."),
    );
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    await userEvent.type(screen.getByLabelText("Marks for Arjun"), "55");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/closed for marking/i);
    // The work is still on screen.
    expect(screen.getByLabelText("Marks for Arjun")).toHaveValue("55");
    expect(screen.getByTestId("dirty-flag")).toBeVisible();
  });

  it("is read-only when the paper is locked", async () => {
    vi.mocked(examinationsService.markingRegister).mockResolvedValue({
      ...REGISTER,
      openForMarking: false,
      progress: { ...REGISTER.progress, locked: true, outstanding: null },
    });
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    expect(screen.getByText(/marking closed/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Marks for Rahul")).toBeDisabled();
    // Outstanding is unanswerable on a closed paper, not zero.
    expect(screen.getByTestId("outstanding")).toHaveTextContent("—");
  });

  it("is read-only for somebody who may only read marks", async () => {
    permissions.value = ["assessment.read.class"];
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Marks for Rahul")).toBeDisabled();
  });

  it("warns before leaving with unsaved marks, and can be kept", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");

    await userEvent.type(screen.getByLabelText("Marks for Arjun"), "55");
    await userEvent.click(
      screen.getByRole("button", { name: /Grade 10 Half-Yearly/ }),
    );

    expect(await screen.findByText(/leave without saving/i)).toBeVisible();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /keep editing/i }));
    expect(screen.getByLabelText("Marks for Arjun")).toHaveValue("55");
  });

  it("leaves without a prompt when nothing has changed", async () => {
    render(<MarksEntryPage />, { wrapper });
    await screen.findByText("Rahul");
    await userEvent.click(
      screen.getByRole("button", { name: /Grade 10 Half-Yearly/ }),
    );
    expect(push).toHaveBeenCalledWith("/examinations/ex-1");
  });

  it("says so when the paper is not this school's", async () => {
    vi.mocked(examinationsService.markingRegister).mockResolvedValue(null);
    render(<MarksEntryPage />, { wrapper });
    expect(await screen.findByText(/paper not found/i)).toBeVisible();
  });

  it("shows the server's register after a save, not its own guess", async () => {
    const saved: MarkingRegister = {
      ...REGISTER,
      progress: { ...REGISTER.progress, recorded: 5, outstanding: 0 },
      students: REGISTER.students.map((student) =>
        student.studentId === "s-3"
          ? { ...student, status: "present", marksObtained: 55 }
          : student,
      ),
    };
    vi.mocked(examinationsService.recordMarks).mockResolvedValue(saved);

    render(<MarksEntryPage />, { wrapper });
    // The screen re-reads the register after saving rather than trusting its
    // own draft, so the refetch must answer with the server's new view.
    vi.mocked(examinationsService.markingRegister).mockResolvedValue(saved);
    await screen.findByText("Rahul");
    await userEvent.type(screen.getByLabelText("Marks for Arjun"), "55");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByTestId("outstanding")).toHaveTextContent("0"),
    );
    expect(screen.queryByTestId("dirty-flag")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Marks for Arjun")).toHaveValue("55");
  });
});
