"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
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
  const { data: units = [], isLoading, isError, refetch } = useSchoolUnits();

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
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Branch deleted");
      setDeleteTarget(null);
    } catch (err: unknown) {
      // e.g. 409 "School unit is referenced by existing classes" — surface it.
      toast.error(
        (err instanceof Error ? err.message : null) || "Failed to delete branch",
      );
      throw err; // re-throw so the dialog stays open
    }
  };

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  const columns: DataTableColumn<SchoolUnit>[] = [
    { key: "name", header: "Name", cell: (u) => <span className="font-medium">{u.name}</span> },
    { key: "code", header: "Code", className: "text-muted-foreground", cell: (u) => u.code },
    { key: "dise", header: "U-DISE", className: "text-muted-foreground", cell: (u) => u.dise_no ?? "—" },
    {
      key: "gr",
      header: "GR Scheme",
      className: "font-mono text-xs text-muted-foreground",
      cell: (u) => u.gr_number_scheme ?? "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge variant={u.status === "active" ? "default" : "outline"} className="capitalize">
          {u.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEditClick(u)} aria-label={`Edit ${u.name}`}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(u)} aria-label={`Delete ${u.name}`}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

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

          <DataTable
            columns={columns}
            data={units}
            getRowId={(u) => u.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            errorMessage="Couldn't load branches. Please retry."
            emptyMessage={'No branches yet. Click "Add Branch" to get started.'}
          />
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
