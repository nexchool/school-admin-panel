"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { CredentialSlips } from "@/components/students/CredentialSlips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useBackfillAdmissionIds,
  useBulkIssueStudentCredentials,
} from "@/hooks/useStudentCredentials";
import type { BulkIssueResult } from "@/services/studentCredentialsService";

/** Why a student was passed over, said the way an operator would say it. */
const SKIP_REASONS: Record<string, string> = {
  no_account:
    "no sign-in account — these students need an email address first",
  already_had_credential: "already have a password",
  already_had_identifier: "already sign in with their admission number",
  method_not_enabled: "admission-number sign-in is off for this school",
};

/**
 * Passwords for a set of students the operator has already picked.
 *
 * The safety property that matters is what this does **not** do: students who
 * already have a working password are skipped and reported, not overwritten.
 * An operator can run this on the same class in September and again in
 * November and only the children who need one get a new password.
 *
 * There is no bulk reset here on purpose. Replacing a whole class's working
 * passwords is not an operation a school reaches for by accident, and a reset
 * belongs on the one student it is about.
 */
export function BulkCredentialDialog({
  open,
  onOpenChange,
  studentIds,
  nameFor,
  schoolName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  nameFor?: (studentId: string) => string | undefined;
  schoolName?: string | null;
}) {
  const issue = useBulkIssueStudentCredentials();
  const backfill = useBackfillAdmissionIds();
  const [result, setResult] = useState<BulkIssueResult | null>(null);

  const close = () => {
    setResult(null);
    onOpenChange(false);
  };

  const count = studentIds.length;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" onClose={close}>
        <DialogHeader className="print:hidden">
          <DialogTitle>
            {result
              ? "Passwords created"
              : `Create passwords for ${count} student${count === 1 ? "" : "s"}?`}
          </DialogTitle>
          <DialogDescription>
            {result
              ? `${result.issued} of ${result.requested} got a new password.`
              : "Students who already have a working password are left alone. " +
                "Each student who needs one gets a password and, if the school " +
                "allows it, the ability to sign in with their admission number."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <CredentialSlips
              credentials={result.credentials}
              schoolName={schoolName}
              nameFor={nameFor}
              onDone={close}
            />
            {Object.entries(result.counts_by_skip_reason).length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground print:hidden">
                {Object.entries(result.counts_by_skip_reason).map(
                  ([reason, howMany]) => (
                    <li key={reason}>
                      {howMany} skipped — {SKIP_REASONS[reason] ?? reason}
                    </li>
                  ),
                )}
              </ul>
            )}
            {result.failed > 0 && (
              <p className="text-sm text-destructive print:hidden">
                {result.failed} could not be given a password. The rest were
                unaffected.
              </p>
            )}
          </div>
        ) : (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={backfill.isPending}
              onClick={() => backfill.mutate({ student_ids: studentIds })}
            >
              {backfill.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Only set up admission-number sign-in
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={issue.isPending || count === 0}
                onClick={() =>
                  issue.mutate(
                    { target: { student_ids: studentIds } },
                    { onSuccess: setResult },
                  )
                }
              >
                {issue.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create passwords
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
