"use client";

import { useRef, useState } from "react";
import { AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useImportExcel, useParseImportHeaders } from "@/hooks/useSchoolSetup";
import { fuzzyMatchHeader } from "@/lib/fuzzyMatchHeader";
import { ApiException } from "@/services/api";
import type { ImportCsvResult } from "@/services/schoolSetupService";

// ── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "preview" | "importing" | "result";

interface ExpectedField {
  key: string;
  label: string;
  required: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPECTED_FIELDS: ExpectedField[] = [
  { key: "unit_code", label: "Unit Code", required: true },
  { key: "programme_code", label: "Programme Code", required: true },
  { key: "grade", label: "Grade", required: true },
  { key: "section", label: "Section", required: true },
  { key: "subject", label: "Subject", required: false },
  { key: "periods", label: "Periods", required: false },
];

const NONE_VALUE = "__none__";

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExcelImportDialog({ onClose }: Props) {
  const { academicYearId } = useActiveAcademicYear();
  const parseHeaders = useParseImportHeaders();
  const importExcel = useImportExcel();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  /** mapping[expectedField.key] = selected excel column header or NONE_VALUE */
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function buildInitialMapping(detectedHeaders: string[]): Record<string, string> {
    const m: Record<string, string> = {};
    for (const field of EXPECTED_FIELDS) {
      const matched = fuzzyMatchHeader(field.key, detectedHeaders);
      m[field.key] = matched ?? NONE_VALUE;
    }
    return m;
  }

  function requiredFieldsMapped(m: Record<string, string>): boolean {
    return EXPECTED_FIELDS.filter((f) => f.required).every(
      (f) => m[f.key] && m[f.key] !== NONE_VALUE,
    );
  }

  function buildMappingPayload(m: Record<string, string>): Record<string, string> {
    const payload: Record<string, string> = {};
    for (const field of EXPECTED_FIELDS) {
      if (m[field.key] && m[field.key] !== NONE_VALUE) {
        payload[field.key] = m[field.key];
      }
    }
    return payload;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleClose() {
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;
    setFile(selected);
    try {
      const res = await parseHeaders.mutateAsync(selected);
      const detectedHeaders = res.headers;
      setHeaders(detectedHeaders);
      setMapping(buildInitialMapping(detectedHeaders));
      setStep("map");
    } catch (err) {
      toast.error(
        err instanceof ApiException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to read headers from file.",
      );
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
    }
  }

  async function handleImport() {
    if (!file || !academicYearId) {
      toast.error("No active academic year. Please set one before importing.");
      return;
    }
    setStep("importing");
    try {
      const res = await importExcel.mutateAsync({
        file,
        academicYearId,
        mapping: buildMappingPayload(mapping),
      });
      setResult(res);
      setStep("result");
      if (res.errors?.length) {
        toast.warning(
          `Import complete: ${res.classes_created} created, ${res.errors.length} error(s).`,
        );
      } else {
        toast.success(`Import complete: ${res.classes_created} class(es) created.`);
      }
    } catch (err) {
      setStep("preview");
      toast.error(
        err instanceof ApiException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Import failed.",
      );
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <>
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 px-6 py-10 text-center">
            <FileSpreadsheet className="size-10 text-muted-foreground/60" />
            <div>
              <p className="text-sm font-medium">Select an Excel file to import</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Accepts .xlsx files. Headers will be detected automatically.
              </p>
            </div>
            <Label
              htmlFor="excel-file-input"
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {parseHeaders.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Reading headers…
                </span>
              ) : (
                "Choose file"
              )}
            </Label>
            <input
              id="excel-file-input"
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={handleFileChange}
              disabled={parseHeaders.isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title="Template download coming soon"
              className="opacity-60"
            >
              Download Excel template
            </Button>
            <span className="text-xs text-muted-foreground">
              Template download coming soon
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderMap() {
    const canContinue = requiredFieldsMapped(mapping);
    return (
      <>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Map each expected field to a column detected in your file. Required
            fields must be mapped to continue.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Expected field
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Excel column
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXPECTED_FIELDS.map((field) => (
                  <tr key={field.key} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{field.label}</span>
                      {field.required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={mapping[field.key] ?? NONE_VALUE}
                        onValueChange={(val) =>
                          setMapping((prev) => ({ ...prev, [field.key]: val }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            <span className="text-muted-foreground">
                              — not mapped —
                            </span>
                          </SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!canContinue && (
            <p className="text-xs text-destructive">
              All required fields (*) must be mapped before continuing.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStep("upload");
              setFile(null);
              setHeaders([]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep("preview")}
          >
            Continue
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderPreview() {
    return (
      <>
        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium">Ready to import</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click <strong>Import</strong> to upload the file with the column
              mapping configured in the previous step. Rows that already exist
              will be skipped; failed rows will be returned in the response.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Column mapping
            </p>
            <div className="rounded-md border divide-y text-xs">
              {EXPECTED_FIELDS.map((field) => {
                const col = mapping[field.key];
                const isMapped = col && col !== NONE_VALUE;
                return (
                  <div
                    key={field.key}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span className="w-32 font-medium shrink-0">{field.label}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={isMapped ? "" : "text-muted-foreground italic"}>
                      {isMapped ? col : "not mapped"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("map")}
          >
            Back
          </Button>
          <Button type="button" onClick={handleImport}>
            Import
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderImporting() {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Importing… please wait.</p>
      </div>
    );
  }

  function renderResult() {
    if (!result) return null;
    return (
      <>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold tabular-nums">{result.classes_created}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Created</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold tabular-nums">{result.classes_skipped}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold tabular-nums">{result.errors?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-destructive">
                Errors ({result.errors.length})
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 50).map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {e.row}
                        </td>
                        <td className="px-3 py-2 flex items-start gap-1.5 text-destructive">
                          <AlertCircle className="mt-0.5 size-3 shrink-0" />
                          {e.error}
                        </td>
                      </tr>
                    ))}
                    {result.errors.length > 50 && (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-3 py-2 text-center text-muted-foreground"
                        >
                          +{result.errors.length - 50} more errors
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Step titles ───────────────────────────────────────────────────────────

  const STEP_TITLES: Record<Step, string> = {
    upload: "Import from Excel",
    map: "Map columns",
    preview: "Preview import",
    importing: "Importing…",
    result: "Import complete",
  };

  const STEP_DESCRIPTIONS: Record<Step, string> = {
    upload: "Upload an .xlsx file to import class sections in bulk.",
    map: "Match each expected field to a column in your file.",
    preview: "Review the mapping before uploading.",
    importing: "Sending data to the server…",
    result: "The import has finished.",
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
          <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        {step === "upload" && renderUpload()}
        {step === "map" && renderMap()}
        {step === "preview" && renderPreview()}
        {step === "importing" && renderImporting()}
        {step === "result" && renderResult()}
      </DialogContent>
    </Dialog>
  );
}
