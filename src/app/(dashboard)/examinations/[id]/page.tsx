"use client";

/**
 * One examination: what it is, what is sat, and what has happened to it.
 *
 * Lifecycle actions are shown by what the current status allows, but nothing
 * here re-decides the lifecycle. The server owns the transition table; this
 * only avoids offering a button that would certainly be refused, and reports
 * the refusal plainly when one arrives anyway.
 */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, Loader2, Ban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FieldError } from "@/components/ui/field-error";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks";
import {
  useCancelExamination,
  useExamination,
  useScheduleExamination,
} from "@/hooks/useExaminations";
import {
  EXAMINATION_STATUS_LABEL,
  type ExamPaper,
  type ExaminationStatus,
} from "@/types/examination";

const TONE: Record<ExaminationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  scheduled: "secondary",
  marks_entry: "secondary",
  published: "default",
  cancelled: "destructive",
};

/** What the server's transition table allows from here — mirrored, not owned. */
const CAN_SCHEDULE: ExaminationStatus[] = ["draft"];
const CAN_CANCEL: ExaminationStatus[] = ["draft", "scheduled", "marks_entry"];

export default function ExaminationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const id = params?.id ?? null;

  const { data: examination, isLoading, isError, refetch } = useExamination(id);
  const schedule = useScheduleExamination();
  const cancel = useCancelExamination();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = hasPermission("examination.manage");
  // Marking answers to the assessment keys, never to `examination.manage` —
  // scheduling an examination and marking one are different jobs.
  const canMark =
    hasPermission("assessment.enter") || hasPermission("assessment.manage");

  const papersBySection = useMemo(() => {
    const groups = new Map<string, ExamPaper[]>();
    for (const paper of examination?.papers ?? []) {
      const key = paper.className || paper.classId;
      groups.set(key, [...(groups.get(key) ?? []), paper]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [examination]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p>Couldn&apos;t load this examination.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!examination) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p>Examination not found.</p>
          <Button variant="outline" onClick={() => router.push("/examinations")}>
            Back to examinations
          </Button>
        </CardContent>
      </Card>
    );
  }

  const runSchedule = async () => {
    setActionError(null);
    try {
      await schedule.mutateAsync(examination.id);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Couldn't schedule this examination",
      );
    }
  };

  const runCancel = async () => {
    if (!reason.trim()) {
      setReasonError("Say why this examination is not being held");
      return;
    }
    setReasonError(undefined);
    setActionError(null);
    try {
      await cancel.mutateAsync({ id: examination.id, reason: reason.trim() });
      setCancelOpen(false);
      setReason("");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Couldn't cancel this examination",
      );
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/examinations")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Examinations
      </Button>

      <PageHeader
        title={examination.name}
        description={examination.description ?? undefined}
        actions={
          canManage ? (
            <div className="flex gap-2">
              {CAN_SCHEDULE.includes(examination.status) && (
                <Button onClick={runSchedule} disabled={schedule.isPending}>
                  {schedule.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="mr-1 h-4 w-4" />
                  )}
                  Schedule
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/examinations/${examination.id}/results`)
                }
              >
                Results
              </Button>
              {CAN_CANCEL.includes(examination.status) && (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  <Ban className="mr-1 h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant={TONE[examination.status]}>
              {EXAMINATION_STATUS_LABEL[examination.status]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Papers</p>
            <p className="font-medium">{examination.papers?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sections sitting</p>
            <p className="font-medium">
              {examination.classesSitting?.length ?? 0}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Papers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {papersBySection.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No papers yet. An examination needs at least one before it can be
              scheduled.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="p-2 text-left">Section</th>
                    <th scope="col" className="p-2 text-left">Subject</th>
                    <th scope="col" className="p-2 text-left">Component</th>
                    <th scope="col" className="p-2 text-left">Date</th>
                    <th scope="col" className="p-2 text-right">Max</th>
                    <th scope="col" className="p-2 text-right">Pass</th>
                    <th scope="col" className="p-2 text-right">
                      <span className="sr-only">Marks entry</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {papersBySection.map(([section, papers]) =>
                    papers.map((paper, index) => (
                      <tr key={paper.id} className="border-t">
                        <td className="p-2">{index === 0 ? section : ""}</td>
                        <td className="p-2">
                          {paper.subjectName ?? paper.classSubjectId}
                        </td>
                        <td className="p-2">{paper.componentLabel ?? "—"}</td>
                        <td className="p-2">{paper.examDate ?? "—"}</td>
                        <td className="p-2 text-right">{paper.maxMarks}</td>
                        <td className="p-2 text-right">
                          {paper.passMarks ?? "—"}
                        </td>
                        <td className="p-2 text-right">
                          {paper.marksLocked ? (
                            <Badge variant="outline">Marking closed</Badge>
                          ) : canMark ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/examinations/${examination.id}/papers/${paper.id}`,
                                )
                              }
                            >
                              Enter marks
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {(examination.timeline?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing has happened to this examination yet.
            </p>
          ) : (
            <ol className="space-y-2 text-sm">
              {examination.timeline!.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="text-muted-foreground">
                    {event.occurredOn}
                  </span>
                  <span className="font-medium">{event.eventName}</span>
                  {event.note && (
                    <span className="text-muted-foreground">{event.note}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this examination?</DialogTitle>
            <DialogDescription>
              The papers and anything recorded against them are kept, so a
              school asked later why this examination is missing can answer.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Flooding closed the campus"
            />
            <FieldError message={reasonError} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={runCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Cancel examination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
