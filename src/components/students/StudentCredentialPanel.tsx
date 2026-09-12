"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CredentialSlips } from "@/components/students/CredentialSlips";
import { DetailTable, SectionCard } from "@/components/detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useForceStudentPasswordChange,
  useForceStudentPinChange,
  useIssueStudentCredential,
  useIssueStudentPin,
  useStudentCredentialStatus,
} from "@/hooks/useStudentCredentials";
import type { IssuedCredential } from "@/services/studentCredentialsService";
import { formatDateTime } from "@/lib/datetime";

/**
 * How this student signs in, and the two things an operator can do about it.
 *
 * The panel shows status only. A password appears exactly once, in the slip
 * below, immediately after the operation that generated it — there is no
 * endpoint that can produce one later and nothing here caches it.
 *
 * The two actions are deliberately different sizes. Creating a password fills
 * a gap. **Resetting takes a working password away and signs the child out
 * everywhere**, so it asks first and says what it will do.
 */
export function StudentCredentialPanel({
  studentId,
  studentName,
  schoolName,
}: {
  studentId: string;
  studentName?: string;
  schoolName?: string | null;
}) {
  const { data: status, isLoading } = useStudentCredentialStatus(studentId);
  const issue = useIssueStudentCredential();
  const forceChange = useForceStudentPasswordChange();

  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The PIN is a second credential, not a second view of the first. It has its
  // own issue, its own reset and its own must-change, and none of them touches
  // the password.
  const issuePin = useIssueStudentPin();
  const forcePinChange = useForceStudentPinChange();
  const [issuedPin, setIssuedPin] = useState<string | null>(null);
  const [confirmingPinReset, setConfirmingPinReset] = useState(false);

  const runPin = (reset: boolean) =>
    issuePin.mutate(
      { studentId, reset },
      {
        onSuccess: (result) => {
          setIssuedPin(result.pin);
          setConfirmingPinReset(false);
        },
      },
    );

  const run = (reset: boolean) =>
    issue.mutate(
      { studentId, reset },
      {
        onSuccess: (result) => {
          setIssued(result);
          setConfirmingReset(false);
        },
      },
    );

  if (isLoading) {
    return (
      <SectionCard title="Sign-in" description="How this student signs in" icon={KeyRound}>
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      </SectionCard>
    );
  }

  if (!status?.has_account) {
    return (
      <SectionCard title="Sign-in" description="How this student signs in" icon={KeyRound}>
        <p className="py-4 text-sm text-muted-foreground">
          This student has no sign-in account. An account needs an email
          address — add one to the student to give them a way in.
        </p>
      </SectionCard>
    );
  }

  const admissionIdentifier = status.identifiers.find(
    (identifier) => identifier.type === "admission_id",
  );
  const hasPassword = status.credential !== null;

  return (
    <SectionCard
      title="Sign-in"
      description="How this student signs in"
      icon={KeyRound}
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={hasPassword ? "outline" : "default"}
            disabled={issue.isPending}
            onClick={() =>
              hasPassword ? setConfirmingReset(true) : run(false)
            }
          >
            {hasPassword ? "Reset password" : "Create password"}
          </Button>
          {hasPassword && !status.must_change_password && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={forceChange.isPending}
              onClick={() => forceChange.mutate(studentId)}
            >
              Ask for a new one
            </Button>
          )}
        </div>
      }
    >
      <DetailTable
        rows={[
          ["Email", status.email ?? undefined],
          [
            "Admission number sign-in",
            admissionIdentifier ? (
              <span key="adm" className="font-mono">
                {admissionIdentifier.value}
              </span>
            ) : (
              "Not set up"
            ),
          ],
          [
            "Password",
            hasPassword ? (
              <Badge key="pw" variant={status.credential?.is_provisional ? "secondary" : "default"}>
                {status.credential?.is_provisional
                  ? "Issued by the school"
                  : "Chosen by the student"}
              </Badge>
            ) : (
              "Not set"
            ),
          ],
          [
            "Must change at next sign-in",
            status.must_change_password ? "Yes" : "No",
          ],
          [
            "PIN sign-in",
            status.pin?.issued ? (
              <Badge key="pin" variant={status.pin.is_provisional ? "secondary" : "default"}>
                {status.pin.is_provisional
                  ? `${status.pin.length}-digit PIN issued by the school`
                  : `${status.pin.length}-digit PIN chosen by the student`}
              </Badge>
            ) : (
              "Not set"
            ),
          ],
          [
            "Last signed in",
            status.last_login_at
              ? formatDateTime(status.last_login_at)
              : "Never",
          ],
        ]}
      />

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          type="button"
          size="sm"
          variant={status.pin?.issued ? "outline" : "default"}
          disabled={issuePin.isPending}
          onClick={() => (status.pin?.issued ? setConfirmingPinReset(true) : runPin(false))}
        >
          {status.pin?.issued ? "Reset PIN" : "Create a PIN"}
        </Button>
        {status.pin?.issued && !status.pin.must_change && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={forcePinChange.isPending}
            onClick={() => forcePinChange.mutate(studentId)}
          >
            Ask for a new PIN
          </Button>
        )}
      </div>

      {issuedPin && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
            Write this PIN down now — it cannot be shown again.
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.3em]">
            {issuedPin}
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => setIssuedPin(null)}
          >
            Done
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingPinReset}
        onOpenChange={setConfirmingPinReset}
        title="Reset this student's PIN?"
        description={
          `${studentName ?? "This student"} will be signed out everywhere and ` +
          "their current PIN will stop working. Their password is not affected."
        }
        confirmLabel="Reset PIN"
        variant="destructive"
        loading={issuePin.isPending}
        onConfirm={() => runPin(true)}
      />

      {issued && (
        <div className="mt-4 border-t border-border pt-4">
          <CredentialSlips
            credentials={[issued]}
            schoolName={schoolName}
            nameFor={() => studentName}
            onDone={() => setIssued(null)}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="Reset this student's password?"
        description={
          `${studentName ?? "This student"} will be signed out everywhere and ` +
          "their current password will stop working. You'll get a new one to " +
          "hand over — it can't be shown again afterwards."
        }
        confirmLabel="Reset password"
        variant="destructive"
        loading={issue.isPending}
        onConfirm={() => run(true)}
      />
    </SectionCard>
  );
}
