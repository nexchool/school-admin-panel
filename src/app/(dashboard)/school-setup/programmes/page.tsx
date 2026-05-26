"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { data: programmes = [], isLoading } = useProgrammes();

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
    await deleteMutation.mutateAsync(deleteTarget.id);
    toast.success("Programme deleted");
    setDeleteTarget(null);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
                      Board
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Medium
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Code
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
                  {programmes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No programmes yet. Click &ldquo;Add Programme&rdquo; to
                        get started.
                      </td>
                    </tr>
                  ) : (
                    programmes.map((programme) => (
                      <tr
                        key={programme.id}
                        className="border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium">
                          {programme.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {programme.board}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {programme.medium ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {programme.code}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              programme.status === "active"
                                ? "default"
                                : "outline"
                            }
                          >
                            {programme.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(programme)}
                              aria-label={`Edit ${programme.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(programme)}
                              aria-label={`Delete ${programme.name}`}
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
