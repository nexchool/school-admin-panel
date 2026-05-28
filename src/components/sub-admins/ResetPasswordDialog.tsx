"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/services/subAdminsService";

const schema = z
  .object({
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      ),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ResetPasswordValues = z.infer<typeof schema>;

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display name / email of the sub-admin being reset. */
  subAdminName?: string;
  saving?: boolean;
  onSubmit: (password: string) => Promise<void>;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  subAdminName,
  saving,
  onSubmit,
}: ResetPasswordDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form + clear errors whenever the dialog opens — derived during
  // render via an open token (the project's "set-state-in-effect"-free pattern,
  // see SubAdminFormModal). A fresh open reseeds; closing arms the next open.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    reset({ password: "", confirmPassword: "" });
    setFormError(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {subAdminName
              ? `Set a new password for ${subAdminName}. They will be signed out of all sessions and emailed the new credentials.`
              : "Set a new password. The sub-admin will be signed out of all sessions."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (values) => {
            // The dialog stays open on failure so the user sees inline
            // feedback; the caller closes it on success.
            setFormError(null);
            try {
              await onSubmit(values.password);
            } catch (err) {
              setFormError(
                err instanceof Error ? err.message : "Failed to reset password"
              );
            }
          })}
          className="space-y-4"
        >
          {formError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reset-confirm">Confirm password</Label>
            <Input
              id="reset-confirm"
              type="password"
              placeholder="Re-enter password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
