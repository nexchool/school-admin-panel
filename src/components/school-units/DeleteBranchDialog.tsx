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
import { useDeleteSchoolUnit, useUpdateSchoolUnit } from "@/hooks/useSchoolUnits";
import { ApiException } from "@/services/api";
import type { SchoolUnit } from "@/services/schoolUnitsService";

interface DeleteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: SchoolUnit | null;
}

/**
 * Mirrors DeleteDepartmentDialog: a branch that still has classes cannot be
 * deleted, so on SCHOOL_UNIT_IN_USE the dialog swaps its body to the server's
 * explanation and swaps the primary action to "Set to inactive" — the shared
 * ConfirmDialog's one-shot onConfirm can't change state after a failed attempt.
 */
export function DeleteBranchDialog({
  open,
  onOpenChange,
  branch,
}: DeleteBranchDialogProps) {
  const deleteBranch = useDeleteSchoolUnit();
  const updateBranch = useUpdateSchoolUnit();
  // The server's verbatim in-use sentence, including the live class count.
  // Never composed client-side — rendered exactly as the API sent it.
  const [inUseMessage, setInUseMessage] = useState<string | null>(null);

  // Reset on open, derived during render via an open token rather than a
  // useEffect (the project's set-state-in-effect-free pattern). A fresh open
  // clears any stale conflict from a previous branch.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setInUseMessage(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const handleDelete = async () => {
    if (!branch) return;
    try {
      await deleteBranch.mutateAsync(branch.id);
      onOpenChange(false);
    } catch (error) {
      const body =
        error instanceof ApiException
          ? (error.data as { error?: string } | undefined)
          : undefined;
      if (body?.error === "SCHOOL_UNIT_IN_USE" && error instanceof ApiException) {
        setInUseMessage(error.message);
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete the branch"
      );
    }
  };

  const handleSetInactive = async () => {
    if (!branch) return;
    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        data: { status: "inactive" },
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update the branch"
      );
    }
  };

  const busy = deleteBranch.isPending || updateBranch.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {inUseMessage ? "Can't delete this branch" : "Delete branch"}
          </DialogTitle>
          <DialogDescription>
            {inUseMessage ??
              `Are you sure you want to delete "${branch?.name ?? ""}"? This cannot be undone.`}
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
              {updateBranch.isPending ? "Please wait…" : "Set to inactive"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {deleteBranch.isPending ? "Please wait…" : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
