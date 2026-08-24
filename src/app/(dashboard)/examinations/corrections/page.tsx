"use client";

/**
 * Deciding on mark corrections.
 *
 * Its own route rather than a section of one examination, because a correction
 * belongs to a *mark* and a reviewer works through a backlog that spans papers
 * and examinations. `/attendance/corrections` is the same shape for the same
 * reason, so this follows it rather than inventing a second arrangement.
 *
 * Every decision is the server's: this shows what was asked for, takes a note,
 * and reports what came back. Nothing is optimistically applied — an approved
 * correction moves a real mark, and a screen that showed it moved before the
 * server agreed would be lying at exactly the wrong moment.
 */

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks";
import {
  useDecideMarkCorrection,
  useMarkCorrections,
} from "@/hooks/useExaminations";
import {
  CORRECTION_STATUS_LABEL,
  MARK_STATUS_LABEL,
  STATUS_TAKES_MARKS,
  type CorrectionStatus,
  type MarkCorrection,
  type MarkStatus,
} from "@/types/examination";

const TONE: Record<CorrectionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  requested: "secondary",
  approved: "default",
  rejected: "destructive",
};

function describe(status: MarkStatus, marks?: number | null): string {
  if (!STATUS_TAKES_MARKS[status]) return MARK_STATUS_LABEL[status];
  return `${MARK_STATUS_LABEL[status]} · ${marks ?? "—"}`;
}

export default function CorrectionsPage() {
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState<CorrectionStatus>("requested");
  const [deciding, setDeciding] = useState<
    { correction: MarkCorrection; approve: boolean } | null
  >(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);

  const canDecide = hasPermission("assessment.manage");
  const { data: corrections = [], isLoading, isError, refetch } =
    useMarkCorrections(status, { enabled: canDecide });
  const decide = useDecideMarkCorrection();

  if (!canDecide) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          You do not have permission to decide on mark corrections.
        </CardContent>
      </Card>
    );
  }

  const close = () => {
    setDeciding(null);
    setNote("");
    setNoteError(undefined);
    setFailure(null);
  };

  const submit = async () => {
    if (!deciding) return;
    // A rejection without a reason is a decision nobody can account for later.
    if (!deciding.approve && !note.trim()) {
      setNoteError("Say why this correction is being rejected");
      return;
    }
    setNoteError(undefined);
    setFailure(null);
    try {
      await decide.mutateAsync({
        correctionId: deciding.correction.id,
        approve: deciding.approve,
        note: note.trim() || null,
      });
      close();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "The decision was not recorded",
      );
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mark corrections"
        description="Changes requested to marks on closed papers."
        actions={
          <Select
            value={status}
            onValueChange={(next) => setStatus(next as CorrectionStatus)}
          >
            <SelectTrigger className="w-48" aria-label="Correction status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.keys(CORRECTION_STATUS_LABEL) as CorrectionStatus[]
              ).map((value) => (
                <SelectItem key={value} value={value}>
                  {CORRECTION_STATUS_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading && <Skeleton className="h-40 w-full" />}

      {isError && (
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p>Couldn&apos;t load corrections.</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && corrections.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {status === "requested"
              ? "Nothing is waiting for a decision."
              : `No ${CORRECTION_STATUS_LABEL[status].toLowerCase()} corrections.`}
          </CardContent>
        </Card>
      )}

      {corrections.map((correction) => (
        <Card key={correction.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {correction.fullName}{" "}
                  <span className="text-muted-foreground">
                    · {correction.admissionNumber}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {correction.examinationName} · {correction.className}{" "}
                  {correction.subjectName}
                </p>
              </div>
              <Badge variant={TONE[correction.status]}>
                {CORRECTION_STATUS_LABEL[correction.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded border px-2 py-1">
                {describe(correction.fromStatus, correction.fromMarks)}
              </span>
              <span aria-hidden>→</span>
              <span className="rounded border border-primary px-2 py-1 font-medium">
                {describe(correction.toStatus, correction.toMarks)}
              </span>
              {correction.maxMarks != null && (
                <span className="text-muted-foreground">
                  out of {correction.maxMarks}
                </span>
              )}
            </div>

            <p className="text-sm">
              <span className="text-muted-foreground">Reason: </span>
              {correction.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              Requested by {correction.requestedByName ?? "—"}
              {correction.requestedAt
                ? ` on ${correction.requestedAt.slice(0, 10)}`
                : ""}
              {correction.decidedByName &&
                ` · decided by ${correction.decidedByName}`}
              {correction.decisionNote && ` — ${correction.decisionNote}`}
            </p>

            {correction.status === "requested" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setDeciding({ correction, approve: true })}
                >
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeciding({ correction, approve: false })}
                >
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!deciding} onOpenChange={(next) => (next ? null : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deciding?.approve ? "Approve this correction?" : "Reject this correction?"}
            </DialogTitle>
            <DialogDescription>
              {deciding?.approve
                ? "The mark changes to the corrected value, and the request is kept as approved history."
                : "The mark stays as it is. The request is kept, so it remains answerable later."}
            </DialogDescription>
          </DialogHeader>

          {deciding && (
            <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <span>
                {describe(deciding.correction.fromStatus, deciding.correction.fromMarks)}
              </span>
              <span aria-hidden>→</span>
              <span className="font-medium">
                {describe(deciding.correction.toStatus, deciding.correction.toMarks)}
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="decision-note">
              {deciding?.approve ? "Note (optional)" : "Reason"}
            </Label>
            <Textarea
              id="decision-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <FieldError message={noteError} />
          </div>

          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={close} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button
              variant={deciding?.approve ? "default" : "destructive"}
              onClick={submit}
              disabled={decide.isPending}
            >
              {decide.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              {deciding?.approve ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
