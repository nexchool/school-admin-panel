"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks";
import {
  useCreateSchoolUnit,
  useDeleteSchoolUnit,
  useSchoolUnits,
  useUpdateSchoolUnit,
} from "@/hooks/useSchoolUnits";
import { BranchFormDialog } from "@/components/structural/BranchFormDialog";
import { ApiException } from "@/services/api";
import type { SchoolUnit } from "@/services/schoolUnitsService";

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiException || error instanceof Error
    ? error.message
    : fallback;

export function SchoolUnitsList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("school_unit.manage");

  const { data = [], isLoading, isError, refetch } = useSchoolUnits();
  const createMut = useCreateSchoolUnit();
  const updateMut = useUpdateSchoolUnit();
  const deleteMut = useDeleteSchoolUnit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolUnit | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (unit: SchoolUnit) => {
    setEditing(unit);
    setDialogOpen(true);
  };

  // Rejects on failure so BranchFormDialog keeps itself open and shows the error.
  const handleSubmit = async (payload: Partial<SchoolUnit>) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: payload });
      toast.success("Branch updated.");
      return;
    }
    await createMut.mutateAsync(payload);
    toast.success("Branch added.");
  };

  const onDelete = (unit: SchoolUnit) => {
    if (!window.confirm(`Delete branch “${unit.name}”?`)) return;
    deleteMut.mutate(unit.id, {
      onSuccess: () => toast.success("Branch deleted."),
      onError: (error) => toast.error(errorMessage(error, "Delete failed.")),
    });
  };

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button type="button" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
          <CardDescription>
            Add each campus or branch your school operates. One organisation can
            have many branches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : isError ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="text-destructive">
                Couldn&apos;t load branches. Please retry.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No branches yet. Add at least one to get started.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((unit) => (
                <li
                  key={unit.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {unit.name}
                      {unit.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[unit.code, unit.phone, unit.address]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(unit)}
                        aria-label={`Edit ${unit.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(unit)}
                        disabled={deleteMut.isPending}
                        aria-label={`Delete ${unit.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BranchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unit={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
