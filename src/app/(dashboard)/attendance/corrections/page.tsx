"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveCorrection,
  usePendingCorrections,
  useRejectCorrection,
  type AttendanceCorrection,
} from "@/hooks/useAttendanceCorrections";
import { formatDate } from "@/components/detail";

type Decision = { correction: AttendanceCorrection; approve: boolean };

/** present → absent reads better than two bare words. */
function Change({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="rounded bg-muted px-1.5 py-0.5 capitalize text-muted-foreground line-through">
        {from}
      </span>
      <span aria-hidden>→</span>
      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium capitalize">
        {to}
      </span>
    </span>
  );
}

export default function AttendanceCorrectionsPage() {
  const { data, isLoading, isError } = usePendingCorrections();
  const [deciding, setDeciding] = useState<Decision | null>(null);

  const waiting = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Attendance corrections
        </h1>
        <p className="text-muted-foreground">
          Changes to registers that have already been settled, waiting for a
          decision. Approving one changes the mark and records who decided.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-muted-foreground" />
            <span className="font-medium">
              {isLoading ? "Loading…" : `${waiting.length} waiting`}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              These corrections couldn&apos;t be loaded. You may not have access
              to decide on them.
            </p>
          )}

          {!isLoading && !isError && waiting.length === 0 && (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">
              Nothing is waiting. Corrections appear here when someone asks for
              a settled mark to be changed.
            </p>
          )}

          {waiting.map((correction) => (
            <div
              key={correction.id}
              className="flex flex-col gap-3 border-b border-border px-6 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">
                    {correction.studentName ?? "A student"}
                  </span>
                  {correction.className && (
                    <span className="text-sm text-muted-foreground">
                      {correction.className}
                    </span>
                  )}
                  {correction.sessionDate && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(correction.sessionDate)}
                    </span>
                  )}
                </div>
                <Change from={correction.fromStatus} to={correction.toStatus} />
                <p className="text-sm text-muted-foreground">
                  &ldquo;{correction.reason}&rdquo;
                  {correction.requestedByName && (
                    <span> — {correction.requestedByName}</span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeciding({ correction, approve: false })}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeciding({ correction, approve: true })}
                >
                  <CheckCircle2 className="size-4" />
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {deciding && (
        <DecisionDialog
          decision={deciding}
          onClose={() => setDeciding(null)}
        />
      )}
    </div>
  );
}

function DecisionDialog({
  decision,
  onClose,
}: {
  decision: Decision;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const approve = useApproveCorrection();
  const reject = useRejectCorrection();
  const { correction, approve: isApproving } = decision;
  const pending = approve.isPending || reject.isPending;

  const decide = async () => {
    const input = { id: correction.id, note: note.trim() || undefined };
    try {
      if (isApproving) await approve.mutateAsync(input);
      else await reject.mutateAsync(input);
      onClose();
    } catch {
      // The mutation's toast has already said why; the dialog stays open.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {isApproving ? "Approve this correction" : "Reject this correction"}
          </DialogTitle>
          <DialogDescription>
            {isApproving
              ? "The mark changes, and this decision is recorded against it."
              : "The register stands. The request is kept either way, so what was asked for stays visible."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium">
              {correction.studentName ?? "A student"}
              {correction.className && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {correction.className}
                </span>
              )}
            </p>
            <Change from={correction.fromStatus} to={correction.toStatus} />
            <p className="text-sm text-muted-foreground">
              &ldquo;{correction.reason}&rdquo;
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-note">Note</Label>
            <Textarea
              id="decision-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Recorded with your decision"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={isApproving ? "default" : "destructive"}
            onClick={decide}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isApproving ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
