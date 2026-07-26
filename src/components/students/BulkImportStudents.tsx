"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  studentsService,
  type BulkImportPreviewRow,
  type BulkImportResult,
} from "@/services/studentsService";
import { studentsKeys } from "@/hooks/useStudents";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  CircleHelp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiException } from "@/services/api";
import { toast } from "sonner";

type Step = "upload" | "preview" | "importing" | "results";

interface BulkImportStudentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const REQUIRED_COLUMNS = [
  "name",
  "email",
  "branch",
  "programme",
  "class_name",
  "section",
] as const;

// Full template: every column the import understands, required first then
// grouped by section. `branch`/`programme`/`class_name`/`section` together
// identify the class; other columns map straight to the student record.
// Unknown columns are ignored, so schools can trim the ones they don't use.
// All values are fictional.
const SAMPLE_COLUMNS = [
  // Required
  "name",
  "email",
  "branch",
  "programme",
  "class_name",
  "section",
  // Basics
  "roll_number",
  "gender",
  "date_of_birth",
  "phone",
  "address",
  // Father
  "father_name",
  "father_phone",
  "father_email",
  "father_occupation",
  "father_annual_income",
  // Mother
  "mother_name",
  "mother_phone",
  "mother_email",
  "mother_occupation",
  "mother_annual_income",
  // Guardian
  "guardian_name",
  "guardian_relationship",
  "guardian_phone",
  "guardian_email",
  "guardian_address",
  "guardian_occupation",
  "guardian_aadhar_number",
  // Identity
  "aadhar_number",
  "apaar_id",
  "emis_number",
  "udise_student_id",
  "religion",
  "category",
  "caste",
  "nationality",
  "mother_tongue",
  "place_of_birth",
  // Health
  "blood_group",
  "height_cm",
  "weight_kg",
  "medical_allergies",
  "medical_conditions",
  "disability_details",
  "identification_marks",
  // Current address
  "current_address",
  "current_city",
  "current_state",
  "current_pincode",
  // Permanent address
  "permanent_address",
  "permanent_city",
  "permanent_state",
  "permanent_pincode",
  "is_same_as_permanent_address",
  // Commute
  "is_commuting_from_outstation",
  "commute_location",
  "commute_notes",
  // Emergency
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "emergency_contact_alt_phone",
  // Academic / school
  "admission_date",
  "previous_school_name",
  "previous_school_class",
  "last_school_board",
  "tc_number",
  "house_name",
  "student_status",
  "is_transport_opted",
];

const SAMPLE_ROW: Record<string, string | number> = {
  name: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  branch: "Main Campus",
  programme: "CBSE English",
  class_name: "10",
  section: "A",
  roll_number: 12,
  gender: "Male",
  date_of_birth: "2010-06-15",
  phone: "9876543210",
  address: "12, MG Road, Ahmedabad",
  father_name: "Rajesh Sharma",
  father_phone: "9876500001",
  father_email: "rajesh.sharma@example.com",
  father_occupation: "Business",
  father_annual_income: 800000,
  mother_name: "Priya Sharma",
  mother_phone: "9876500002",
  mother_email: "priya.sharma@example.com",
  mother_occupation: "Teacher",
  mother_annual_income: 500000,
  guardian_name: "Rajesh Sharma",
  guardian_relationship: "Father",
  guardian_phone: "9876500001",
  guardian_email: "rajesh.sharma@example.com",
  guardian_address: "12, MG Road, Ahmedabad",
  guardian_occupation: "Business",
  guardian_aadhar_number: "123412341234",
  aadhar_number: "987698769876",
  apaar_id: "APAAR123456",
  emis_number: "EMIS1001",
  udise_student_id: "UDISE20240001",
  religion: "Hindu",
  category: "General",
  caste: "",
  nationality: "Indian",
  mother_tongue: "Gujarati",
  place_of_birth: "Ahmedabad",
  blood_group: "O+",
  height_cm: 150,
  weight_kg: 42.5,
  medical_allergies: "None",
  medical_conditions: "None",
  disability_details: "",
  identification_marks: "Mole on left cheek",
  current_address: "12, MG Road, Ahmedabad",
  current_city: "Ahmedabad",
  current_state: "Gujarat",
  current_pincode: "380001",
  permanent_address: "12, MG Road, Ahmedabad",
  permanent_city: "Ahmedabad",
  permanent_state: "Gujarat",
  permanent_pincode: "380001",
  is_same_as_permanent_address: "true",
  is_commuting_from_outstation: "false",
  commute_location: "",
  commute_notes: "",
  emergency_contact_name: "Suresh Sharma",
  emergency_contact_relationship: "Uncle",
  emergency_contact_phone: "9876500003",
  emergency_contact_alt_phone: "9876500004",
  admission_date: "2026-06-01",
  previous_school_name: "Little Flowers School",
  previous_school_class: "9",
  last_school_board: "CBSE",
  tc_number: "TC-2024-091",
  house_name: "Red",
  student_status: "active",
  is_transport_opted: "false",
};

function downloadSampleXlsx() {
  const ws = XLSX.utils.json_to_sheet([SAMPLE_ROW], {
    header: SAMPLE_COLUMNS,
  });
  ws["!cols"] = SAMPLE_COLUMNS.map((c) => ({
    wch: Math.max(c.length + 2, 14),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "student-import-sample.xlsx");
}

function ImportGuidePopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Import guide"
        >
          <CircleHelp className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[380px] p-4">
        <div className="space-y-3.5">
          <div>
            <h4 className="text-sm font-semibold">Preparing your file</h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Single sheet .xlsx — row 1 must be the column headers.</li>
              <li>One student per row. Unknown columns are ignored.</li>
              <li>
                The sample lists every supported column — required first, then
                optional. Delete any optional columns you don&apos;t use.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Required columns</h4>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {REQUIRED_COLUMNS.map((c) => (
                <code
                  key={c}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                >
                  {c}
                </code>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Validations to watch</h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>
                Email must be unique — within the file and across the school.
              </li>
              <li>
                <code className="font-mono">branch</code>,{" "}
                <code className="font-mono">programme</code>,{" "}
                <code className="font-mono">class_name</code> (grade) and{" "}
                <code className="font-mono">section</code> together must match an
                existing class in the selected year — e.g. Main Campus / CBSE
                English / 10 / A. Use the exact branch &amp; programme names from
                Academics.
              </li>
              <li>
                Leave admission_number blank for new students — it is assigned
                automatically. Fill it in to update a student already on record.
              </li>
              <li>
                Re-uploading a sheet does not create duplicates: rows matching an
                existing student by admission number (or email) update that
                record, and blank cells leave existing values untouched.
              </li>
              <li>Dates use YYYY-MM-DD (DD-MM-YYYY / DD/MM/YYYY also work).</li>
              <li>
                Phone numbers need 10–15 digits; invalid ones are skipped with
                a warning.
              </li>
              <li>
                Yes/No columns (e.g. transport, same-address) accept
                true/false, yes/no, or 1/0.
              </li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function exportFailedRowsXlsx(
  failed: BulkImportResult["failed_rows"],
  previewByRow: Map<number, Record<string, unknown>>,
  extraHeaders: string[]
) {
  const rows = failed.map((f) => {
    const base = { ...(previewByRow.get(f.row_number) ?? {}) };
    return {
      ...base,
      errors: f.errors.join("; "),
    };
  });
  const colOrder = new Set<string>(extraHeaders.filter(Boolean));
  rows.forEach((r) => Object.keys(r).forEach((k) => colOrder.add(k)));
  colOrder.delete("errors");
  const ordered = [...colOrder, "errors"];
  const sheetRows = rows.map((r) => {
    const o: Record<string, string> = {};
    ordered.forEach((k) => {
      o[k] = cellStr((r as Record<string, unknown>)[k]);
    });
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Failed rows");
  XLSX.writeFile(
    wb,
    `bulk-import-failed-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function BulkImportStudents({
  open,
  onOpenChange,
}: BulkImportStudentsProps) {
  const queryClient = useQueryClient();
  const { data: academicYears = [], isLoading: ayLoading } =
    useAcademicYears(false);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [academicYearId, setAcademicYearId] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [previewRows, setPreviewRows] = useState<BulkImportPreviewRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [summary, setSummary] = useState<{
    valid: number;
    invalid: number;
    total: number;
    create: number;
    update: number;
  } | null>(null);
  const [confirmUpdates, setConfirmUpdates] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(
    null
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setSummary(null);
    setImportResult(null);
    setPreviewError(null);
    setSendEmail(true);
    setConfirmUpdates(false);
  }, []);

  // Default to the active academic year once years load. "Adjust state during
  // render" (guarded) keeps this lint-clean — no effect needed.
  if (!academicYearId && academicYears.length > 0) {
    const active = academicYears.find((y) => y.is_active) ?? academicYears[0];
    setAcademicYearId(active.id);
  }

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") {
      toast.error("Please upload a .xlsx file only.");
      return;
    }
    setFile(f);
    setPreviewRows([]);
    setSummary(null);
    setPreviewError(null);
  };

  const previewByRow = useMemo(() => {
    const m = new Map<number, Record<string, unknown>>();
    previewRows.forEach((r) => {
      m.set(r.row_number, r.values);
    });
    return m;
  }, [previewRows]);

  const tableColumns = useMemo(() => {
    if (previewHeaders.length > 0) return previewHeaders;
    const keys = new Set<string>();
    previewRows.forEach((r) =>
      Object.keys(r.values ?? {}).forEach((k) => keys.add(k))
    );
    return Array.from(keys);
  }, [previewHeaders, previewRows]);

  const handlePreview = async () => {
    if (!file || !academicYearId) {
      toast.error("Select an academic year and an Excel file.");
      return;
    }
    setPreviewError(null);
    setPreviewRows([]);
    setSummary(null);
    setStep("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("academic_year_id", academicYearId);
      const res = await studentsService.bulkImportPreview(fd);
      setPreviewRows(res.preview ?? []);
      setPreviewHeaders(res.headers ?? []);
      setSummary(res.summary ?? null);
      // A fresh preview is a fresh decision — never carry an acknowledgement
      // over from a sheet the user has since replaced.
      setConfirmUpdates(false);
      setStep("preview");
    } catch (err) {
      const msg =
        err instanceof ApiException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Preview failed";
      setPreviewError(msg);
      toast.error(msg);
      setStep("upload");
    }
  };

  const validCount = summary?.valid ?? previewRows.filter((r) => r.valid).length;
  const updateCount =
    summary?.update ??
    previewRows.filter((r) => r.valid && r.action === "update").length;
  const needsUpdateConfirmation = updateCount > 0 && !confirmUpdates;

  const handleImport = async () => {
    if (!file || !academicYearId || validCount === 0) return;
    if (needsUpdateConfirmation) return;
    setStep("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("academic_year_id", academicYearId);
      fd.append("send_email", sendEmail ? "true" : "false");
      const res = await studentsService.bulkImport(fd);
      setImportResult(res);
      setStep("results");
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      toast.success(
        `Import finished: ${res.created} created, ${res.updated} updated, ${res.failed} failed`
      );
    } catch (err) {
      const msg =
        err instanceof ApiException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Import failed";
      toast.error(msg);
      setStep("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          // Compact while configuring the upload; wide only when the preview /
          // results table actually needs the room.
          step === "preview" || step === "results"
            ? "sm:max-w-5xl"
            : "sm:max-w-lg"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            Bulk import students
            <ImportGuidePopover />
          </DialogTitle>
          <DialogDescription>
            Upload a single-sheet .xlsx file — one student per row. Open the
            guide for column names and validation rules.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Academic year</Label>
              <Select
                value={academicYearId}
                onValueChange={setAcademicYearId}
                disabled={ayLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Excel file (.xlsx)</Label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40",
                  file && "border-primary/40 bg-muted/30"
                )}
              >
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                {file ? (
                  <>
                    <FileSpreadsheet className="size-8 text-primary" />
                    <span className="max-w-full truncate text-sm font-medium">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Click to choose a different file
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Click to choose a file
                    </span>
                    <span className="text-xs text-muted-foreground">
                      .xlsx only · single sheet · headers in row 1
                    </span>
                  </>
                )}
              </label>
              <button
                type="button"
                onClick={downloadSampleXlsx}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download className="size-3.5" />
                Download sample file
              </button>
            </div>
            {previewError && (
              <p className="text-sm text-destructive">{previewError}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!file || !academicYearId || ayLoading}
                className="gap-2"
              >
                <Upload className="size-4" />
                Preview
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Total rows:{" "}
                <strong>{summary?.total ?? previewRows.length}</strong>
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="size-4" />
                Valid: <strong>{summary?.valid ?? validCount}</strong>
              </span>
              {/* Split out so a re-import makes plain how many rows add students
                  and how many only fill in detail on students already on record. */}
              {(summary?.create ?? 0) > 0 && (
                <span>
                  New students: <strong>{summary?.create}</strong>
                </span>
              )}
              {(summary?.update ?? 0) > 0 && (
                <span>
                  Existing (details updated):{" "}
                  <strong>{summary?.update}</strong>
                </span>
              )}
              {(summary?.invalid ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="size-4" />
                  Invalid: <strong>{summary?.invalid}</strong>
                </span>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded border-input"
              />
              Send welcome email (push notification is always sent)
            </label>
            {/* Updating existing students is the one irreversible thing this
                dialog does — a sheet older than the app can overwrite details
                someone corrected by hand. Creates need no such gate, so the
                acknowledgement only appears when the sheet actually touches
                records already on file. */}
            {updateCount > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmUpdates}
                    onChange={(e) => setConfirmUpdates(e.target.checked)}
                    className="mt-0.5 rounded border-input"
                  />
                  <span>
                    <strong>
                      {updateCount} existing student
                      {updateCount === 1 ? "" : "s"} will be updated
                    </strong>{" "}
                    from this sheet. Filled-in cells replace what is currently
                    stored, including details edited in the app; blank cells are
                    left untouched, and no one is moved between classes.
                  </span>
                </label>
              </div>
            )}
            <div className="max-h-[min(420px,50vh)] overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="whitespace-nowrap px-2 py-2 text-left">
                      Row
                    </th>
                    {tableColumns.map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-2 py-2 text-left"
                      >
                        {col}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={row.row_number}
                      className={cn(
                        "border-t border-border",
                        !row.valid && "bg-destructive/10"
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono text-muted-foreground">
                        {row.row_number}
                      </td>
                      {tableColumns.map((col) => (
                        <td
                          key={col}
                          className="max-w-[200px] truncate px-2 py-1.5"
                          title={cellStr(row.values?.[col])}
                        >
                          {cellStr(row.values?.[col]) || "—"}
                        </td>
                      ))}
                      <td
                        className="max-w-[220px] px-2 py-1.5 text-xs"
                        title={
                          row.errors?.join("; ") ||
                          row.warnings?.join("; ") ||
                          ""
                        }
                      >
                        {row.valid ? (
                          <span className="text-green-600">OK</span>
                        ) : (
                          <span className="text-destructive">
                            {row.errors?.join("; ") || "Invalid"}
                          </span>
                        )}
                        {row.valid && row.warnings?.length ? (
                          <span className="ml-1 text-amber-600">
                            ({row.warnings.join("; ")})
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || needsUpdateConfirmation}
                className="gap-2"
              >
                Import valid rows ({validCount})
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-12 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              {previewRows.length > 0
                ? "Importing students…"
                : "Validating spreadsheet…"}
            </p>
          </div>
        )}

        {step === "results" && importResult && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="font-medium">Import finished</h4>
              <div className="mt-2 flex flex-wrap gap-6 text-sm">
                <span>Total: {importResult.total}</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="size-4" />
                  Created: {importResult.created}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="size-4" />
                  Updated: {importResult.updated}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="size-4" />
                  Failed: {importResult.failed}
                </span>
              </div>
            </div>
            {importResult.failed_rows.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Failed rows</h4>
                <div className="max-h-40 overflow-auto rounded border border-border p-2 text-sm">
                  {importResult.failed_rows.map((f, i) => (
                    <div key={i} className="flex gap-2 py-1">
                      <span className="font-mono text-muted-foreground">
                        Row {f.row_number} ({f.email || "—"}):
                      </span>
                      <span className="text-destructive">
                        {f.errors.join("; ")}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    exportFailedRowsXlsx(
                      importResult.failed_rows,
                      previewByRow,
                      previewHeaders.length ? previewHeaders : tableColumns
                    )
                  }
                >
                  <Download className="size-4" />
                  Download failed rows as Excel
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Close</Button>
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                  setStep("upload");
                }}
              >
                Import more
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
