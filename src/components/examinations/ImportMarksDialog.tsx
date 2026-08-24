"use client";

/**
 * Importing a register from a spreadsheet.
 *
 * Two steps and no ambiguity between them: **preview** validates the whole
 * file and writes nothing, **import** writes all of it or none. A sheet with
 * one bad row cannot be imported at all, which is why the button stays
 * disabled rather than importing what it can — a teacher left with 38 of 40
 * marks cannot tell which two are missing.
 *
 * Nothing here decides what a valid mark is. Every row in the table below is
 * the server's own verdict, re-checked at import.
 */

import { useRef, useState } from "react";
import { AlertTriangle, Check, Download, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { triggerDownload } from "@/lib/download";
import { examinationsService } from "@/services/examinationsService";
import {
  useImportMarksSheet,
  usePreviewMarksSheet,
} from "@/hooks/useExaminations";
import { cn } from "@/lib/utils";
import type { ImportPreviewRow, MarksImportPreview } from "@/types/examination";

interface Props {
  open: boolean;
  onClose: () => void;
  examPaperId: string;
  onImported: () => void;
}

/** The server sends `CODE: sentence`. The code is what a teacher scans for. */
function splitError(message: string): { code: string; text: string } {
  const at = message.indexOf(":");
  if (at === -1) return { code: "", text: message };
  return { code: message.slice(0, at), text: message.slice(at + 1).trim() };
}

export function ImportMarksDialog({
  open,
  onClose,
  examPaperId,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MarksImportPreview | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewSheet = usePreviewMarksSheet(examPaperId);
  const importSheet = useImportMarksSheet(examPaperId);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setFailure(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const choose = (chosen: File | null) => {
    setPreview(null);
    setFailure(null);
    if (chosen && !chosen.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setFailure("Only .xlsx files can be imported.");
      return;
    }
    setFile(chosen);
  };

  const download = async () => {
    setDownloading(true);
    setFailure(null);
    try {
      const blob = await examinationsService.marksTemplate(examPaperId);
      triggerDownload(blob, "marks-template.xlsx");
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Couldn't download the template",
      );
    } finally {
      setDownloading(false);
    }
  };

  const runPreview = async () => {
    if (!file) return;
    setFailure(null);
    try {
      setPreview(await previewSheet.mutateAsync(file));
    } catch (error) {
      // A refused *preview* is a whole-sheet problem — a locked paper, a
      // missing column — and carries no rows.
      setFailure(
        error instanceof Error ? error.message : "The sheet could not be read",
      );
    }
  };

  const runImport = async () => {
    if (!file) return;
    setFailure(null);
    try {
      await importSheet.mutateAsync(file);
      reset();
      onImported();
    } catch (error) {
      // The file and its preview are kept: the teacher fixes the sheet and
      // uploads again, rather than starting over.
      setFailure(
        error instanceof Error ? error.message : "Nothing was imported",
      );
    }
  };

  const summary = preview?.summary;
  const canImport = !!summary && summary.invalid === 0 && summary.valid > 0;
  const busy = previewSheet.isPending || importSheet.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import marks from a spreadsheet</DialogTitle>
          <DialogDescription>
            The sheet is checked before anything is saved. A single bad row
            stops the whole import, and marks already recorded are never
            overwritten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={download}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Download template
            </Button>
            <span className="text-xs text-muted-foreground">
              Columns: admission_number, marks, status
            </span>
          </div>

          <div>
            <label
              htmlFor="marks-sheet"
              className="mb-1 block text-sm font-medium"
            >
              Marks file (.xlsx)
            </label>
            <input
              id="marks-sheet"
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="block w-full text-sm"
              onChange={(event) => choose(event.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">
                  {Math.max(1, Math.round(file.size / 1024))} KB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reset();
                  }}
                >
                  <X className="mr-1 h-3 w-3" /> Remove
                </Button>
              </p>
            )}
          </div>

          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}

          {summary && (
            <div
              className="flex flex-wrap gap-4 rounded-md border p-3 text-sm"
              data-testid="import-summary"
            >
              <span>
                <strong>{summary.valid}</strong> valid
              </span>
              <span className={cn(summary.invalid > 0 && "text-destructive")}>
                <strong>{summary.invalid}</strong> invalid
              </span>
              <span className="text-muted-foreground">
                {summary.total} rows in total
              </span>
            </div>
          )}

          {preview && (
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <caption className="sr-only">Rows found in the sheet</caption>
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="p-2 text-left">Row</th>
                    <th scope="col" className="p-2 text-left">Admission no.</th>
                    <th scope="col" className="p-2 text-left">Marks</th>
                    <th scope="col" className="p-2 text-left">Status</th>
                    <th scope="col" className="p-2 text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row: ImportPreviewRow) => (
                    <tr
                      key={row.row_number}
                      className={cn("border-t", !row.valid && "bg-destructive/5")}
                    >
                      <td className="p-2">{row.row_number}</td>
                      <td className="p-2">
                        {row.values.admission_number ?? "—"}
                      </td>
                      <td className="p-2">{row.values.marks ?? "—"}</td>
                      <td className="p-2">{row.values.status ?? "—"}</td>
                      <td className="p-2">
                        {row.valid ? (
                          // Not colour alone: the word and the icon both say it.
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Check className="h-3 w-3" /> Ready
                          </span>
                        ) : (
                          <ul className="space-y-1">
                            {row.errors.map((error) => {
                              const { code, text } = splitError(error);
                              return (
                                <li
                                  key={error}
                                  className="flex items-start gap-1 text-destructive"
                                >
                                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                  <span>
                                    {code && (
                                      <strong className="mr-1">{code}</strong>
                                    )}
                                    {text}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          {preview ? (
            <Button type="button" onClick={runImport} disabled={!canImport || busy}>
              {importSheet.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Import {summary?.valid ?? 0} marks
            </Button>
          ) : (
            <Button type="button" onClick={runPreview} disabled={!file || busy}>
              {previewSheet.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Check sheet
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
