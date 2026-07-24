"use client";

import { useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

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
import { toastError } from "@/lib/errorToast";
import { triggerDownload } from "@/lib/download";
import {
  academicCalendarService,
  type CalendarImportReport,
  type CalendarImportType,
} from "@/services/academicCalendarService";
import { useImportCalendarData } from "@/hooks/useAcademicCalendar";

const IMPORT_OPTIONS: { value: CalendarImportType; label: string }[] = [
  { value: "public_holidays", label: "Public Holidays" },
  { value: "vacations", label: "Vacations" },
  { value: "exam_windows", label: "Examination Windows" },
  { value: "events", label: "School Events" },
];

interface CalendarImportDialogProps {
  calendarId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Bulk-import calendar data from a CSV template, with a per-row error report. */
export function CalendarImportDialog({
  calendarId,
  open,
  onOpenChange,
}: CalendarImportDialogProps) {
  const [type, setType] = useState<CalendarImportType>("public_holidays");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<CalendarImportReport | null>(null);
  const importMutation = useImportCalendarData();

  const reset = () => {
    setFile(null);
    setReport(null);
  };

  const handleTypeChange = (value: string) => {
    setType(value as CalendarImportType);
    reset();
  };

  const downloadTemplate = async () => {
    try {
      const blob = await academicCalendarService.getImportTemplate(calendarId, type);
      triggerDownload(blob, `import-template-${type}.csv`);
    } catch (e) {
      toastError(e, "Could not download the template");
    }
  };

  const runImport = () => {
    if (!file) return;
    importMutation.mutate(
      { id: calendarId, type, file },
      {
        onSuccess: (result) => {
          setReport(result);
          if (result.imported > 0) {
            toast.success(`Imported ${result.imported} of ${result.total} row(s)`);
          } else {
            toast.warning("No rows were imported — see the report below");
          }
        },
        onError: (e) => toastError(e, "Import failed"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import calendar data</DialogTitle>
          <DialogDescription>
            Download the template, fill it in, and upload it. Valid rows are
            added; invalid rows are reported with their line number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Data type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Download template
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="import-file">CSV file</Label>
            <input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setReport(null);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {report && (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">
                {report.imported} imported · {report.skipped} skipped ·{" "}
                {report.total} total
              </p>
              {report.errors.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="p-1 text-left">Row</th>
                        <th className="p-1 text-left">Field</th>
                        <th className="p-1 text-left">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.errors.map((err, i) => (
                        <tr key={`${err.row}-${err.field}-${i}`} className="border-t border-border/60">
                          <td className="p-1">{err.row}</td>
                          <td className="p-1">{err.field}</td>
                          <td className="p-1 text-destructive">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={runImport} disabled={!file || importMutation.isPending}>
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
