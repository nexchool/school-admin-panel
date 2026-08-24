/**
 * The import dialog.
 *
 * What matters is the boundary between checking and writing: a preview must
 * never write, an invalid sheet must never be importable, and a refusal must
 * leave the file and its report on screen rather than sending the teacher back
 * to the start.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ImportMarksDialog } from "./ImportMarksDialog";
import { examinationsService } from "@/services/examinationsService";
import { triggerDownload } from "@/lib/download";

vi.mock("@/services/examinationsService", () => ({
  examinationsService: {
    previewMarksSheet: vi.fn(),
    importMarksSheet: vi.fn(),
    marksTemplate: vi.fn(),
  },
}));
vi.mock("@/lib/download", () => ({ triggerDownload: vi.fn() }));
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ tenantId: "tenant-1", hasPermission: () => true }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const xlsx = (name = "marks.xlsx") =>
  new File(["binary"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

const GOOD = {
  summary: { valid: 2, invalid: 0, total: 2 },
  preview: [
    { row_number: 2, values: { admission_number: "00123", marks: 78, status: "present" }, errors: [], warnings: [], valid: true },
    { row_number: 3, values: { admission_number: "00124", marks: null, status: "absent" }, errors: [], warnings: [], valid: true },
  ],
};

const BAD = {
  summary: { valid: 1, invalid: 1, total: 2 },
  preview: [
    { row_number: 2, values: { admission_number: "00123", marks: 78, status: "present" }, errors: [], warnings: [], valid: true },
    {
      row_number: 3,
      values: { admission_number: "GHOST", marks: 40, status: "present" },
      errors: ["STUDENT_NOT_ELIGIBLE: no student with this admission number is in the class this paper is set for"],
      warnings: [],
      valid: false,
    },
  ],
};

function renderDialog(onImported = vi.fn()) {
  render(
    <ImportMarksDialog
      open
      onClose={vi.fn()}
      examPaperId="p-1"
      onImported={onImported}
    />,
    { wrapper },
  );
  return { onImported };
}

const upload = async (file = xlsx()) =>
  userEvent.upload(screen.getByLabelText(/marks file/i), file);

beforeEach(() => vi.clearAllMocks());

describe("import marks dialog", () => {
  it("downloads the template", async () => {
    const blob = new Blob(["x"]);
    vi.mocked(examinationsService.marksTemplate).mockResolvedValue(blob);
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /download template/i }));

    await waitFor(() =>
      expect(examinationsService.marksTemplate).toHaveBeenCalledWith("p-1"),
    );
    expect(triggerDownload).toHaveBeenCalledWith(blob, "marks-template.xlsx");
  });

  it("refuses a file that is not .xlsx without calling the server", async () => {
    renderDialog();
    // `accept=".xlsx"` makes the picker itself drop this, so `userEvent.upload`
    // would never reach the handler. Drag-and-drop bypasses `accept`, though,
    // which is exactly the case this guard exists for — so the change is fired
    // the way a browser delivers one.
    fireEvent.change(screen.getByLabelText(/marks file/i), {
      target: { files: [new File(["x"], "marks.csv", { type: "text/csv" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/only \.xlsx/i);
    expect(examinationsService.previewMarksSheet).not.toHaveBeenCalled();
  });

  it("shows the file, then checks it without importing", async () => {
    vi.mocked(examinationsService.previewMarksSheet).mockResolvedValue(GOOD);
    renderDialog();
    await upload();

    expect(screen.getByText("marks.xlsx")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /check sheet/i }));

    await waitFor(() =>
      expect(examinationsService.previewMarksSheet).toHaveBeenCalledWith(
        "p-1",
        expect.any(File),
      ),
    );
    // Checking is not importing.
    expect(examinationsService.importMarksSheet).not.toHaveBeenCalled();
    expect(screen.getByTestId("import-summary")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /import 2 marks/i })).toBeEnabled();
  });

  it("shows each bad row with its domain code and refuses to import", async () => {
    vi.mocked(examinationsService.previewMarksSheet).mockResolvedValue(BAD);
    renderDialog();
    await upload();
    await userEvent.click(screen.getByRole("button", { name: /check sheet/i }));

    expect(await screen.findByText("STUDENT_NOT_ELIGIBLE")).toBeVisible();
    expect(screen.getByText(/1 rows in total|2 rows in total/)).toBeVisible();
    // One bad row stops the whole sheet.
    expect(screen.getByRole("button", { name: /import/i })).toBeDisabled();
    expect(screen.getByText("GHOST")).toBeVisible();
  });

  it("imports a clean sheet and tells the register to refresh", async () => {
    vi.mocked(examinationsService.previewMarksSheet).mockResolvedValue(GOOD);
    vi.mocked(examinationsService.importMarksSheet).mockResolvedValue({
      imported: 2,
      summary: GOOD.summary,
    });
    const { onImported } = renderDialog();

    await upload();
    await userEvent.click(screen.getByRole("button", { name: /check sheet/i }));
    await userEvent.click(
      await screen.findByRole("button", { name: /import 2 marks/i }),
    );

    await waitFor(() =>
      expect(examinationsService.importMarksSheet).toHaveBeenCalledWith(
        "p-1",
        expect.any(File),
      ),
    );
    expect(onImported).toHaveBeenCalled();
  });

  it("keeps the file and the report when the import is refused", async () => {
    vi.mocked(examinationsService.previewMarksSheet).mockResolvedValue(GOOD);
    vi.mocked(examinationsService.importMarksSheet).mockRejectedValue(
      new Error("This paper has been closed for marking."),
    );
    const { onImported } = renderDialog();

    await upload();
    await userEvent.click(screen.getByRole("button", { name: /check sheet/i }));
    await userEvent.click(
      await screen.findByRole("button", { name: /import 2 marks/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/closed for marking/i);
    expect(onImported).not.toHaveBeenCalled();
    // Nothing is thrown away.
    expect(screen.getByText("marks.xlsx")).toBeVisible();
    expect(screen.getByTestId("import-summary")).toBeVisible();
  });

  it("reports a whole-sheet refusal from preview", async () => {
    vi.mocked(examinationsService.previewMarksSheet).mockRejectedValue(
      new Error("The sheet needs a column for admission_number"),
    );
    renderDialog();
    await upload();
    await userEvent.click(screen.getByRole("button", { name: /check sheet/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /needs a column for admission_number/i,
    );
    expect(screen.queryByTestId("import-summary")).not.toBeInTheDocument();
  });

  it("does not submit twice while a check is in flight", async () => {
    let release: (value: typeof GOOD) => void = () => {};
    vi.mocked(examinationsService.previewMarksSheet).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    renderDialog();
    await upload();

    const check = screen.getByRole("button", { name: /check sheet/i });
    await userEvent.click(check);
    expect(check).toBeDisabled();
    release(GOOD);
    await screen.findByTestId("import-summary");
    expect(examinationsService.previewMarksSheet).toHaveBeenCalledTimes(1);
  });

  it("clears the sheet when the file is removed", async () => {
    vi.mocked(examinationsService.previewMarksSheet).mockResolvedValue(GOOD);
    renderDialog();
    await upload();
    await userEvent.click(screen.getByRole("button", { name: /check sheet/i }));
    await screen.findByTestId("import-summary");

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByTestId("import-summary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check sheet/i })).toBeDisabled();
  });
});
