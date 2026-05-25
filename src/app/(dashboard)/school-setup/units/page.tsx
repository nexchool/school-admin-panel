"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import {
  UnitFormDialog,
  type UnitFormValues,
} from "@/components/school-setup/forms/UnitFormDialog";
import {
  useSchoolUnits,
  useCreateSchoolUnit,
  useUpdateSchoolUnit,
  useDeleteSchoolUnit,
} from "@/hooks/useSchoolUnits";
import type { SchoolUnit } from "@/services/schoolUnitsService";

export default function UnitsPage() {
  const { data: units = [], isLoading } = useSchoolUnits();

  const createMutation = useCreateSchoolUnit();
  const updateMutation = useUpdateSchoolUnit();
  const deleteMutation = useDeleteSchoolUnit();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SchoolUnit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolUnit | null>(null);

  const handleAddClick = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEditClick = (unit: SchoolUnit) => {
    setEditTarget(unit);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: UnitFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, data: values });
      toast.success("Branch updated");
    } else {
      await createMutation.mutateAsync(values);
      toast.success("Branch added");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    toast.success("Branch deleted");
    setDeleteTarget(null);
  };

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <WizardShell
        stepKey="units"
        canContinue={units.length > 0}
        onContinue={() => {}}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Add at least one branch (campus or location) for your school.
            </p>
            <Button size="sm" onClick={handleAddClick} className="gap-1.5">
              <Plus className="size-4" />
              Add Branch
            </Button>
          </div>

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
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      U-DISE
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      GR Scheme
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
                  {units.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No branches yet. Click &ldquo;Add Branch&rdquo; to get
                        started.
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr
                        key={unit.id}
                        className="border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium">{unit.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {unit.code}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {unit.dise_no ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {unit.gr_number_scheme ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              unit.status === "active" ? "default" : "outline"
                            }
                          >
                            {unit.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(unit)}
                              aria-label={`Edit ${unit.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(unit)}
                              aria-label={`Delete ${unit.name}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WizardShell>

      <UnitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultValues={editTarget}
        onSubmit={handleFormSubmit}
        saving={isSaving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete branch"
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
