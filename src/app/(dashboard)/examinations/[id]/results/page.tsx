"use client";

/**
 * An examination's results.
 *
 * The screen's job is to keep two things apart that look alike: the
 * **official** result, which is what a parent was told, and the **current**
 * one, which is what the school is working on. They are the same until a
 * published mark is corrected; after that they differ until somebody publishes
 * the revision, and a screen that showed only "the result" would quietly show
 * a figure nobody has been given (ADR-020).
 *
 * Nothing is computed here. Percentages, grades and pass/fail all arrive from
 * the server's frozen snapshot, and no action is applied optimistically —
 * publishing is what tells a school something, and it must not appear to have
 * happened before it did.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Download,
  Loader2,
  Send,
} from "lucide-react";

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
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks";
import { triggerDownload } from "@/lib/download";
import { examinationsService } from "@/services/examinationsService";
import { useExaminationResults, useResultAction } from "@/hooks/useExaminations";
import type { ExamResultVersion, StudentResult } from "@/types/examination";

function figure(version?: ExamResultVersion | null): string {
  if (!version) return "—";
  if (version.percentage === null || version.percentage === undefined)
    return version.gradeLabel ?? "—";
  return `${version.percentage}%${version.gradeLabel ? ` · ${version.gradeLabel}` : ""}`;
}

export default function ExaminationResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const examinationId = params?.id ?? null;

  const { data: results, isLoading, isError, refetch } =
    useExaminationResults(examinationId);
  const act = useResultAction(examinationId ?? "");

  const [confirmPublish, setConfirmPublish] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const canPublish = hasPermission("examination.publish");

  const run = async (
    input: Parameters<typeof act.mutateAsync>[0],
    after?: () => void,
  ) => {
    setFailure(null);
    try {
      await act.mutateAsync(input);
      after?.();
    } catch (error) {
      // The screen keeps its state and shows what the server actually said.
      setFailure(
        error instanceof Error ? error.message : "That could not be done",
      );
    }
  };

  /**
   * The marksheet renders the *official* version, which is why the button is
   * offered only where one exists — a student with a calculated but
   * unpublished result has nothing a parent could be handed.
   */
  const downloadMarksheet = async (studentId: string) => {
    setDownloading(studentId);
    setFailure(null);
    try {
      const blob = await examinationsService.marksheet(
        examinationId ?? "",
        studentId,
      );
      triggerDownload(blob, `marksheet-${studentId}.pdf`);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Couldn't build the marksheet",
      );
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p>Couldn&apos;t load results.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
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

  const anyPublished = results.published > 0;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/examinations/${examinationId}`)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> {results.examinationName}
      </Button>

      <PageHeader
        title="Results"
        description="What each student scored, and what the school has issued."
        actions={
          canPublish ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => run({ action: "calculate" })}
                disabled={act.isPending}
              >
                {act.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-1 h-4 w-4" />
                )}
                Calculate
              </Button>
              {!anyPublished && (
                <Button
                  onClick={() => setConfirmPublish(true)}
                  disabled={act.isPending}
                >
                  <Send className="mr-1 h-4 w-4" /> Publish results
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {failure && !confirmPublish && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-wrap gap-6 p-4 text-sm">
          <span>
            <span className="text-muted-foreground">Students </span>
            <strong>{results.cohort}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Calculated </span>
            <strong>{results.calculated}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Published </span>
            <strong data-testid="published-count">{results.published}</strong>
          </span>
          {results.revisionPending > 0 && (
            <span className="text-amber-600" data-testid="pending-count">
              <AlertTriangle className="mr-1 inline h-4 w-4" />
              {results.revisionPending} awaiting a revised publication
            </span>
          )}
          {!results.readyToPublish && !anyPublished && (
            <span className="text-muted-foreground" data-testid="not-ready">
              {results.blocked.length} student(s) not ready to publish
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Results by student</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="p-2 text-left">Admission no.</th>
                  <th scope="col" className="p-2 text-left">Student</th>
                  <th scope="col" className="p-2 text-left">Official</th>
                  <th scope="col" className="p-2 text-left">Current</th>
                  <th scope="col" className="p-2 text-left">Pass</th>
                  <th scope="col" className="p-2 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.students.map((student: StudentResult) => {
                  const blocked = results.blocked.find(
                    (entry) => entry.studentId === student.studentId,
                  );
                  const isOpen = expanded === student.studentId;
                  return (
                    <tr key={student.studentId} className="border-t align-top">
                      <td className="p-2">{student.admissionNumber ?? "—"}</td>
                      <td className="p-2">
                        {student.fullName ?? student.studentId}
                        {student.revisionPending && (
                          <Badge variant="outline" className="ml-2">
                            Revision pending
                          </Badge>
                        )}
                        {blocked && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {blocked.code}
                          </span>
                        )}
                      </td>
                      <td className="p-2" data-testid={`official-${student.studentId}`}>
                        {student.official ? (
                          <>
                            {figure(student.official)}
                            <span className="ml-1 text-xs text-muted-foreground">
                              v{student.official.version}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            Not published
                          </span>
                        )}
                      </td>
                      <td className="p-2" data-testid={`current-${student.studentId}`}>
                        {student.current ? (
                          <>
                            {figure(student.current)}
                            <span className="ml-1 text-xs text-muted-foreground">
                              v{student.current.version}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            Not calculated
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {student.official?.isPass === true
                          ? "Pass"
                          : student.official?.isPass === false
                            ? "Fail"
                            : "—"}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          {student.official && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadMarksheet(student.studentId)}
                              disabled={downloading === student.studentId}
                              aria-label={`Marksheet for ${student.fullName ?? student.studentId}`}
                            >
                              {downloading === student.studentId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-1 h-4 w-4" />
                              )}
                              Marksheet
                            </Button>
                          )}
                          {student.versions.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpanded(isOpen ? null : student.studentId)
                              }
                            >
                              {isOpen ? "Hide history" : "History"}
                            </Button>
                          )}
                          {canPublish && student.revisionPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                run({
                                  action: "revise",
                                  studentId: student.studentId,
                                  reason: "Approved correction",
                                })
                              }
                              disabled={act.isPending}
                            >
                              Revise
                            </Button>
                          )}
                          {canPublish &&
                            !student.revisionPending &&
                            student.current &&
                            !student.current.publishedAt &&
                            student.official && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  run({
                                    action: "publishRevision",
                                    studentId: student.studentId,
                                  })
                                }
                                disabled={act.isPending}
                              >
                                Publish revision
                              </Button>
                            )}
                        </div>
                        {isOpen && (
                          <ol
                            className="mt-2 space-y-1 text-left text-xs"
                            data-testid={`history-${student.studentId}`}
                          >
                            {student.versions.map((version) => (
                              <li key={version.id}>
                                <strong>v{version.version}</strong>{" "}
                                {figure(version)}{" "}
                                {version.publishedAt ? (
                                  <span className="text-muted-foreground">
                                    published {version.publishedAt.slice(0, 10)}
                                  </span>
                                ) : (
                                  <span className="text-amber-600">
                                    not published
                                  </span>
                                )}
                                {version.revisionReason && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    — {version.revisionReason}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {results.students.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No student sits this examination.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish these results?</DialogTitle>
            <DialogDescription>
              This makes them the school&apos;s word. A published result is
              never edited — a later change is a revision, which is issued
              separately.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Students</dt>
              <dd className="font-medium">{results.cohort}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Calculated</dt>
              <dd className="font-medium">{results.calculated}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Not ready</dt>
              <dd className="font-medium">{results.blocked.length}</dd>
            </div>
          </dl>
          {results.blocked.length > 0 && (
            <p className="text-sm text-destructive">
              {results.blocked.length} student(s) are not ready. The server will
              refuse until every one of them is.
            </p>
          )}
          {/* The refusal belongs *inside* the dialog: while it is open the rest
              of the page is aria-hidden, so an alert behind it is one the
              person who pressed Publish never sees. */}
          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmPublish(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                run({ action: "publish" }, () => setConfirmPublish(false))
              }
              disabled={act.isPending}
            >
              {act.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
