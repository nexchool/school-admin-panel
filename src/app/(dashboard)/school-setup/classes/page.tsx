"use client";

import { Fragment, useMemo, useState } from "react";
import { Copy, Pencil, Plus, Search, Trash2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import { BulkGenerateDialog } from "@/components/school-setup/BulkGenerateDialog";
import { DuplicateStructureDialog } from "@/components/school-setup/DuplicateStructureDialog";
import { ExcelImportDialog } from "@/components/school-setup/ExcelImportDialog";
import {
  ClassFormDialog,
  type ClassFormValues,
} from "@/components/school-setup/forms/ClassFormDialog";
import {
  useClasses,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
} from "@/hooks/useClasses";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import type { ClassItem } from "@/types/class";

const ALL_VALUE = "__all__";

export default function SetupClassesPage() {
  const { data: classes = [], isLoading } = useClasses({ school_unit_id: null });
  const { data: units = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();
  const deleteMutation = useDeleteClass();
  const { academicYearId } = useActiveAcademicYear();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [bulkGenerateOpen, setBulkGenerateOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────
  const [filterUnitId, setFilterUnitId] = useState<string>(ALL_VALUE);
  const [filterProgrammeId, setFilterProgrammeId] = useState<string>(ALL_VALUE);
  const [filterSearch, setFilterSearch] = useState("");

  const handleAddClick = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEditClick = (cls: ClassItem) => {
    setEditTarget(cls);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: ClassFormValues) => {
    if (!academicYearId) {
      toast.error("No active academic year — please set one in Step 4.");
      return;
    }

    const payload = {
      // section = section letter, name = display (grade name or custom)
      name: values.name,
      section: values.name,
      academic_year_id: academicYearId,
      grade_id: values.grade_id || null,
      programme_id: values.programme_id || null,
      school_unit_id: values.school_unit_id || null,
      medium_id: values.medium_id || null,
      stream: values.stream || null,
    };

    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
      toast.success("Class updated");
    } else {
      await createMutation.mutateAsync(payload);
      toast.success("Class added");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Class deleted");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message =
        (err instanceof Error ? err.message : null) ||
        "Failed to delete class";
      toast.error(message);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /** Filtered + grouped classes by grade_name for display. */
  const grouped = useMemo(() => {
    const searchLower = filterSearch.toLowerCase().trim();
    const filtered = classes.filter((cls) => {
      if (filterUnitId !== ALL_VALUE && cls.school_unit_id !== filterUnitId) return false;
      if (filterProgrammeId !== ALL_VALUE && cls.programme_id !== filterProgrammeId) return false;
      if (searchLower) {
        const haystack = [cls.name, cls.grade_name, cls.section].join(" ").toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    const map = new Map<string, ClassItem[]>();
    for (const cls of filtered) {
      const key = cls.grade_name ?? "— No grade —";
      const existing = map.get(key);
      if (existing) {
        existing.push(cls);
      } else {
        map.set(key, [cls]);
      }
    }
    return map;
  }, [classes, filterUnitId, filterProgrammeId, filterSearch]);

  return (
    <>
      <WizardShell
        stepKey="classes"
        canContinue={classes.length > 0}
        onContinue={() => {}}
      >
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Power-tool buttons */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setBulkGenerateOpen(true)}
              aria-label="Bulk Generate"
            >
              <Wand2 className="size-4" />
              Bulk Generate
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setExcelOpen(true)}
              aria-label="Import from Excel"
            >
              <Upload className="size-4" />
              Import from Excel
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setDuplicateOpen(true)}
              aria-label="Duplicate Structure"
            >
              <Copy className="size-4" />
              Duplicate Structure
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            <Button size="sm" onClick={handleAddClick} className="gap-1.5">
              <Plus className="size-4" />
              Add Class
            </Button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search section or grade…"
                className="h-8 pl-8 w-48 text-sm"
              />
            </div>

            <Select value={filterUnitId} onValueChange={setFilterUnitId}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="All units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All units</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterProgrammeId} onValueChange={setFilterProgrammeId}>
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue placeholder="All programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All programmes</SelectItem>
                {programmes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterUnitId !== ALL_VALUE || filterProgrammeId !== ALL_VALUE || filterSearch) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterUnitId(ALL_VALUE);
                  setFilterProgrammeId(ALL_VALUE);
                  setFilterSearch("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Configure class sections for each grade.
          </p>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Section
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Programme
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Students
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No classes yet. Click &ldquo;Add Class&rdquo; to get
                        started.
                      </td>
                    </tr>
                  ) : (
                    Array.from(grouped.entries()).map(([gradeName, rows]) => (
                      <Fragment key={`group-${gradeName}`}>
                        {/* Grade group sub-header */}
                        <tr className="bg-muted/30">
                          <td colSpan={6} className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1 text-sm font-medium">
                              {gradeName}
                              <span className="text-xs font-normal text-muted-foreground">
                                · {rows.length} {rows.length === 1 ? "section" : "sections"}
                              </span>
                            </span>
                          </td>
                        </tr>

                        {rows.map((cls) => (
                          <tr
                            key={cls.id}
                            className="border-b last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-medium">
                              {cls.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {cls.grade_name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {cls.programme_name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {cls.school_unit_name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              {cls.student_count ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(cls)}
                                  aria-label={`Edit ${cls.name}`}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(cls)}
                                  aria-label={`Delete ${cls.name}`}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WizardShell>

      <ClassFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultValues={editTarget}
        onSubmit={handleFormSubmit}
        saving={isSaving}
      />

      <BulkGenerateDialog
        open={bulkGenerateOpen}
        onOpenChange={setBulkGenerateOpen}
      />

      <DuplicateStructureDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />

      {excelOpen && (
        <ExcelImportDialog onClose={() => setExcelOpen(false)} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete class"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
