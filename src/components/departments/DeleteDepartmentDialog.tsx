"use client";

import { useState } from "react";
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
import { useDeleteDepartment, useUpdateDepartment } from "@/hooks/useDepartments";
import { ApiException } from "@/services/api";
import type { Department } from "@/types/department";

interface DeleteDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
}

/**
 * Bespoke rather than the shared `ConfirmDialog`: a plain confirm/cancel
 * cannot express what this flow needs. On DEPARTMENT_IN_USE the dialog must
 * *change state* after a failed delete attempt — swap the body to the
 * server's explanation and swap the primary action to "Set to inactive" —
 * which ConfirmDialog's one-shot onConfirm can't do. Built on the same
 * Dialog primitives ConfirmDialog uses rather than inventing a new shell.
 */
export function DeleteDepartmentDialog({
  open,
  onOpenChange,
  department,
}: DeleteDepartmentDialogProps) {
  const deleteDepartment = useDeleteDepartment();
  const updateDepartment = useUpdateDepartment();
  // Server's verbatim in-use sentence, e.g. "Cannot delete this department
  // because it is currently assigned to 12 teachers and 8 classes. Set it to
  // inactive instead to hide it from new assignments." Never composed
  // client-side — rendered exactly as the API sent it.
  const [inUseMessage, setInUseMessage] = useState<string | null>(null);

  // Reset on open, derived during render via an open token rather than a
  // useEffect (the project's "set-state-in-effect"-free pattern — see
  // ResetPasswordDialog.tsx). A fresh open clears any stale conflict from a
  // previous department; closing arms the next open.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setInUseMessage(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const handleDelete = async () => {
    if (!department) return;
    try {
      await deleteDepartment.mutateAsync(department.id);
      onOpenChange(false);
    } catch (error) {
      const body =
        error instanceof ApiException
          ? (error.data as { error?: string } | undefined)
          : undefined;
      if (body?.error === "DEPARTMENT_IN_USE" && error instanceof ApiException) {
        setInUseMessage(error.message);
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete the department"
      );
    }
  };

  const handleSetInactive = async () => {
    if (!department) return;
    try {
      await updateDepartment.mutateAsync({ id: department.id, status: "inactive" });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update the department"
      );
    }
  };

  const busy = deleteDepartment.isPending || updateDepartment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {inUseMessage ? "Can't delete this department" : "Delete department"}
          </DialogTitle>
          <DialogDescription>
            {inUseMessage ??
              `Are you sure you want to delete "${department?.name ?? ""}"? This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          {inUseMessage ? (
            <Button type="button" onClick={handleSetInactive} disabled={busy}>
              {updateDepartment.isPending ? "Please wait…" : "Set to inactive"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {deleteDepartment.isPending ? "Please wait…" : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
