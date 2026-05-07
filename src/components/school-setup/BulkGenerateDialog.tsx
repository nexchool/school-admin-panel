"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useGrades } from "@/hooks/useGrades";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useBulkGenerate } from "@/hooks/useSchoolSetup";
import { ApiException } from "@/services/api";
import type { BulkGenerateResponse } from "@/services/schoolSetupService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Key for a (unit × programme) column: `{unitId}::{programmeId}` */
type ColKey = string;

function makeColKey(unitId: string, programmeId: string): ColKey {
  return `${unitId}::${programmeId}`;
}

/** Parse a comma-separated section string into a trimmed, non-empty array. */
function parseSections(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function BulkGenerateDialog({ open, onOpenChange }: Props) {
  const { academicYearId } = useActiveAcademicYear();
  const { data: grades = [] } = useGrades();
  const { data: units = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const mutation = useBulkGenerate();

  // cells[gradeId][colKey] = raw comma-separated string
  const [cells, setCells] = useState<Record<string, Record<ColKey, string>>>(
    {},
  );
  const [backendErrors, setBackendErrors] = useState<
    BulkGenerateResponse["data"]["errors"]
  >([]);

  /** Cross-product of units × programmes as column descriptors */
  const columns = useMemo<
    Array<{ key: ColKey; unitId: string; programmeId: string; label: string }>
  >(() => {
    const cols: Array<{
      key: ColKey;
      unitId: string;
      programmeId: string;
      label: string;
    }> = [];
    for (const unit of units) {
      for (const prog of programmes) {
        cols.push({
          key: makeColKey(unit.id, prog.id),
          unitId: unit.id,
          programmeId: prog.id,
          label: `${unit.name} / ${prog.name}`,
        });
      }
    }
    return cols;
  }, [units, programmes]);

  const updateCell = (gradeId: string, colKey: ColKey, value: string) => {
    setCells((prev) => ({
      ...prev,
      [gradeId]: {
        ...(prev[gradeId] ?? {}),
        [colKey]: value,
      },
    }));
  };

  const canGenerate = useMemo(() => {
    for (const gradeMap of Object.values(cells)) {
      for (const raw of Object.values(gradeMap)) {
        if (parseSections(raw).length > 0) return true;
      }
    }
    return false;
  }, [cells]);

  const reset = () => {
    setCells({});
    setBackendErrors([]);
  };

  const handleGenerate = async () => {
    if (!academicYearId) {
      toast.error("No active academic year — please set one in Step 4.");
      return;
    }

    const payload: {
      academic_year_id: string;
      cells: Array<{
        grade_id: string;
        school_unit_id: string;
        programme_id: string;
        sections: string[];
      }>;
    } = {
      academic_year_id: academicYearId,
      cells: [],
    };

    for (const [gradeId, gradeMap] of Object.entries(cells)) {
      for (const [colKey, raw] of Object.entries(gradeMap)) {
        const sections = parseSections(raw);
        if (sections.length === 0) continue;
        const [unitId, programmeId] = colKey.split("::");
        if (!unitId || !programmeId) continue;
        payload.cells.push({
          grade_id: gradeId,
          school_unit_id: unitId,
          programme_id: programmeId,
          sections,
        });
      }
    }

    if (payload.cells.length === 0) {
      toast.error("Fill in at least one cell before generating.");
      return;
    }

    try {
      const result = await mutation.mutateAsync(payload);
      const { created_count, skipped_count, errors } = result.data;

      if (errors && errors.length > 0) {
        setBackendErrors(errors);
        toast.warning(
          `Created ${created_count}; skipped ${skipped_count}. ${errors.length} error(s) — see below.`,
        );
        // Keep dialog open so errors are visible
        return;
      }

      toast.success(`Created ${created_count}; skipped ${skipped_count}.`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Bulk generate failed.",
      );
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const isLoading = !grades.length || !units.length || !programmes.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bulk generate classes</DialogTitle>
          <DialogDescription>
            Enter comma-separated section labels (e.g.{" "}
            <code>A, B, C</code> or <code>Sci-A, Com-A</code>) for each Grade
            × Unit × Programme combination you want to create. Empty cells are
            skipped.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : columns.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No units or programmes defined yet. Complete Steps 1–2 first.
          </p>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[120px] bg-background px-3 py-2 text-left font-medium text-muted-foreground">
                    Grade
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="min-w-[160px] border-l px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr key={grade.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium">
                      {grade.name}
                    </td>
                    {columns.map((col) => {
                      const value =
                        cells[grade.id]?.[col.key] ?? "";
                      return (
                        <td key={col.key} className="border-l px-2 py-1.5">
                          <input
                            type="text"
                            placeholder="A, B, C"
                            value={value}
                            onChange={(e) =>
                              updateCell(grade.id, col.key, e.target.value)
                            }
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                            aria-label={`Sections for ${grade.name} — ${col.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {backendErrors.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="mb-1 text-xs font-semibold text-destructive">
              Errors reported by server:
            </p>
            <ul className="space-y-0.5">
              {backendErrors.map((err, i) => (
                <li
                  key={i}
                  className="text-xs text-destructive"
                >
                  {err.cell !== undefined ? `Cell ${err.cell}` : ""}
                  {err.section ? ` · section "${err.section}"` : ""}
                  {(err.cell !== undefined || err.section) ? " — " : ""}
                  {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="mt-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || mutation.isPending || isLoading}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
