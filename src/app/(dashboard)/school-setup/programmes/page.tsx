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
  ProgrammeFormDialog,
  type ProgrammeFormValues,
} from "@/components/school-setup/forms/ProgrammeFormDialog";
import {
  useProgrammes,
  useCreateProgramme,
  useUpdateProgramme,
  useDeleteProgramme,
} from "@/hooks/useProgrammes";
import type { AcademicProgramme } from "@/services/programmesService";

export default function ProgrammesPage() {
  const { data: programmes = [], isLoading, isError, refetch } = useProgrammes();

  const createMutation = useCreateProgramme();
  const updateMutation = useUpdateProgramme();
  const deleteMutation = useDeleteProgramme();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicProgramme | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicProgramme | null>(
    null
  );

  const handleAddClick = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEditClick = (programme: AcademicProgramme) => {
    setEditTarget(programme);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: ProgrammeFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, data: values });
      toast.success("Programme updated");
    } else {
      await createMutation.mutateAsync(values);
      toast.success("Programme added");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Programme deleted");
      setDeleteTarget(null);
    } catch (err: unknown) {
      // e.g. 409 "Programme is referenced by existing classes" — surface it
      // instead of silently failing (ConfirmDialog swallows the rejection).
      toast.error(
        (err instanceof Error ? err.message : null) || "Failed to delete programme",
      );
      throw err; // re-throw so the dialog stays open
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns: DataTableColumn<AcademicProgramme>[] = [
    { key: "name", header: "Name", cell: (p) => <span className="font-medium">{p.name}</span> },
    { key: "board", header: "Board", className: "text-muted-foreground", cell: (p) => p.board },
    { key: "medium", header: "Medium", className: "text-muted-foreground", cell: (p) => p.medium ?? "—" },
    { key: "code", header: "Code", className: "font-mono text-xs text-muted-foreground", cell: (p) => p.code },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <Badge variant={p.status === "active" ? "default" : "outline"} className="capitalize">
          {p.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEditClick(p)} aria-label={`Edit ${p.name}`}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)} aria-label={`Delete ${p.name}`}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <WizardShell
        stepKey="programmes"
        canContinue={programmes.length > 0}
        onContinue={() => {}}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define the boards and mediums you offer at your school.
            </p>
            <Button size="sm" onClick={handleAddClick} className="gap-1.5">
              <Plus className="size-4" />
              Add Programme
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={programmes}
            getRowId={(p) => p.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            errorMessage="Couldn't load programmes. Please retry."
            emptyMessage={'No programmes yet. Click "Add Programme" to get started.'}
          />
        </div>
      </WizardShell>

      <ProgrammeFormDialog
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
        title="Delete programme"
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
