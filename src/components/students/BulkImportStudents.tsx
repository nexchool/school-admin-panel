"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  } | null>(null);
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
  }, []);

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      const active =
        academicYears.find((y) => y.is_active) ?? academicYears[0];
      setAcademicYearId(active.id);
    }
  }, [academicYears, academicYearId]);

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

  const handleImport = async () => {
    if (!file || !academicYearId || validCount === 0) return;
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
        `Import finished: ${res.success} created, ${res.failed} failed`
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
        className="max-h-[90vh] max-w-5xl overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Bulk import students</DialogTitle>
          <DialogDescription>
            Upload a single-sheet .xlsx file. Row 1 must be headers. Required
            columns: name, email, admission_number, class_name, section. Other
            columns are mapped when they match known fields.
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
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="max-w-md cursor-pointer"
                />
                {file && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileSpreadsheet className="size-4" />
                    {file.name}
                  </span>
                )}
              </div>
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
                disabled={validCount === 0}
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
                  Success: {importResult.success}
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
