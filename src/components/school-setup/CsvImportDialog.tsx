"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useImportCsv } from "@/hooks/useSchoolSetup";
import { ApiException } from "@/services/api";
import type { ImportCsvResult } from "@/services/schoolSetupService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CSV_HEADER = "unit_code,programme_code,grade,section,subject,periods";

export function CsvImportDialog({ open, onOpenChange }: Props) {
  const { data: years = [] } = useAcademicYears(false);
  const mut = useImportCsv();

  const [file, setFile] = useState<File | null>(null);
  const [academicYearId, setAcademicYearId] = useState("");
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  const submit = () => {
    if (!file) {
      toast.error("Pick a CSV file.");
      return;
    }
    if (!academicYearId) {
      toast.error("Pick an academic year.");
      return;
    }
    setResult(null);
    mut.mutate(
      { file, academicYearId },
      {
        onSuccess: (res) => {
          setResult(res);
          if (res.errors?.length) {
            toast.warning(
              `Imported ${res.classes_created} class(es); ${res.errors.length} row error(s).`,
            );
          } else {
            toast.success(`Imported ${res.classes_created} class(es).`);
          }
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiException
              ? e.message
              : e instanceof Error
                ? e.message
                : "Import failed.",
          ),
      },
    );
  };

  const downloadSample = () => {
    const csv = `${CSV_HEADER}\nMHS,CBSE,10,A,Mathematics,5\nMHS,CBSE,10,B,,\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "school-setup-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setFile(null);
          setResult(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import classes from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code>{CSV_HEADER}</code>. Subject and periods are
            optional. Existing classes are skipped; row errors are reported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Academic year</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="csv-file">CSV file</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="button" variant="link" size="sm" onClick={downloadSample} className="px-0">
            Download sample CSV
          </Button>

          {result ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
              <div className="flex flex-wrap gap-3 font-medium">
                <span>Classes created: {result.classes_created}</span>
                <span>Skipped: {result.classes_skipped}</span>
                <span>Subject links: {result.subject_links_created}</span>
              </div>
              {result.errors.length > 0 ? (
                <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                  {result.errors.slice(0, 25).map((e) => (
                    <li
                      key={`${e.row}-${e.error}`}
                      className="flex items-start gap-1.5 text-red-700"
                    >
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Row {e.row}: {e.error}
                      </span>
                    </li>
                  ))}
                  {result.errors.length > 25 ? (
                    <li className="text-muted-foreground">
                      +{result.errors.length - 25} more errors
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Importing…
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
