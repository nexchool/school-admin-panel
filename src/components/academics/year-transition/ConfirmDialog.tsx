"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  disabled,
  fromYearName,
  toYearName,
  totalEnrollments,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  disabled: boolean;
  fromYearName: string;
  toYearName: string;
  totalEnrollments: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run promotion?</DialogTitle>
          <DialogDescription>
            This will update enrollments for <strong>{totalEnrollments}</strong>{" "}
            student placement(s), moving them from{" "}
            <strong>{fromYearName}</strong> to <strong>{toYearName}</strong> per
            your class mapping. This cannot be undone from this screen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={disabled || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm promotion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
