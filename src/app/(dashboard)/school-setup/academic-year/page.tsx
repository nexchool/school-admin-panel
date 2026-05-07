"use client";

import { useState } from "react";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import {
  AcademicYearFormDialog,
  type AcademicYearFormValues,
} from "@/components/school-setup/forms/AcademicYearFormDialog";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useDeleteAcademicYear,
} from "@/hooks/useAcademicYears";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import type { AcademicYear } from "@/services/academicYearsService";

export default function AcademicYearPage() {
  const { data: years = [], isLoading } = useAcademicYears();
  const createMutation = useCreateAcademicYear();
  const updateMutation = useUpdateAcademicYear();
  const deleteMutation = useDeleteAcademicYear();
  const { setAcademicYearId } = useActiveAcademicYear();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);

  const activeYear = years.find((y) => y.is_active) ?? null;
  const otherYears = years.filter((y) => !y.is_active);

  const handleCreateClick = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEditClick = (year: AcademicYear) => {
    setEditTarget(year);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: AcademicYearFormValues) => {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: values });
        toast.success("Academic year updated");
        if (values.is_active) {
          setAcademicYearId(editTarget.id);
        }
      } else {
        const created = await createMutation.mutateAsync(values);
        toast.success("Academic year created");
        if (values.is_active) {
          setAcademicYearId(created.id);
        }
      }
    } catch (err: unknown) {
      const message =
        (err instanceof Error ? err.message : null) ||
        "Failed to save academic year";
      toast.error(message);
      throw err; // re-throw so the dialog stays open
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Academic year deleted");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message =
        (err instanceof Error ? err.message : null) ||
        "Failed to delete academic year";
      toast.error(message);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <WizardShell
        stepKey="academic-year"
        canContinue={years.some((y) => y.is_active)}
        onContinue={() => {}}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Set your school&apos;s active academic year.
            </p>
            <Button
              size="sm"
              onClick={handleCreateClick}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Create Academic Year
            </Button>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <>
              {/* Active year card */}
              {activeYear ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Active Year
                  </p>
                  <Card className="border-primary/40 bg-primary/5">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <CalendarRange className="size-5 text-primary" />
                        <div>
                          <p className="font-semibold">{activeYear.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {activeYear.start_date} — {activeYear.end_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Active</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(activeYear)}
                          aria-label={`Edit ${activeYear.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(activeYear)}
                          aria-label={`Delete ${activeYear.name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <CalendarRange className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No active academic year. Create one to continue.
                  </p>
                </div>
              )}

              {/* Other years list */}
              {otherYears.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Other Years
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Start
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            End
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherYears.map((year) => (
                          <tr
                            key={year.id}
                            className="border-b last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-medium">
                              {year.name}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {year.start_date}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {year.end_date}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">Inactive</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(year)}
                                  aria-label={`Edit ${year.name}`}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(year)}
                                  aria-label={`Delete ${year.name}`}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </WizardShell>

      <AcademicYearFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        saving={isSaving}
        year={editTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete academic year"
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
