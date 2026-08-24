"use client";

/**
 * Marking one paper's register.
 *
 * A local draft, then one save. Every keystroke reaching the server would make
 * a teacher's half-finished row somebody else's truth, and `record_marks` is
 * all-or-nothing anyway — so the screen batches, the server validates, and a
 * refusal keeps the draft on screen for correction rather than discarding it.
 *
 * The six states are the point. "Not entered" is the absence of a mark and is
 * never selectable: a teacher marks somebody *present*, *absent*, *exempted* or
 * for *malpractice*, and a row they have not reached simply has no status.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Save, Upload } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportMarksDialog } from "@/components/examinations/ImportMarksDialog";
import { RequestCorrectionDialog } from "@/components/examinations/RequestCorrectionDialog";
import { useAuth } from "@/hooks";
import { useMarkingRegister, useRecordMarks } from "@/hooks/useExaminations";
import { cn } from "@/lib/utils";
import {
  MARK_STATUS_LABEL,
  STATUS_TAKES_MARKS,
  type MarkEntry,
  type MarkStatus,
  type RegisterStudent,
} from "@/types/examination";

/** The draft a row is in. `null` status means nothing has been recorded. */
type Draft = { status: MarkStatus | null; marks: string };

const NOT_ENTERED = "__none__";

function toDraft(student: RegisterStudent): Draft {
  return {
    status: student.status,
    marks:
      student.marksObtained === null || student.marksObtained === undefined
        ? ""
        : String(student.marksObtained),
  };
}

export default function MarksEntryPage() {
  const params = useParams<{ id: string; paperId: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const paperId = params?.paperId ?? null;
  const examinationId = params?.id ?? null;

  const { data: register, isLoading, isError, refetch } =
    useMarkingRegister(paperId);
  const record = useRecordMarks(paperId ?? "");

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [correcting, setCorrecting] = useState<RegisterStudent | null>(null);

  const canEnter =
    hasPermission("assessment.enter") || hasPermission("assessment.manage");
  // Correcting a closed mark is a different act from entering one, and answers
  // to a different key. ADR-014 standing is checked by the server.
  const canCorrect =
    hasPermission("assessment.update") || hasPermission("assessment.manage");

  // Reset the draft whenever the authoritative register changes — including
  // after a save, which returns the server's own view.
  useEffect(() => {
    if (!register) return;
    setDrafts(
      Object.fromEntries(
        register.students.map((student) => [student.studentId, toDraft(student)]),
      ),
    );
  }, [register]);

  const editable = !!register?.openForMarking && canEnter;

  const changed = useMemo(() => {
    if (!register) return [] as RegisterStudent[];
    return register.students.filter((student) => {
      const draft = drafts[student.studentId];
      if (!draft) return false;
      const original = toDraft(student);
      return draft.status !== original.status || draft.marks !== original.marks;
    });
  }, [register, drafts]);

  const isDirty = changed.length > 0;

  // The repository's standard guard against losing work on a hard navigation.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const goBack = () => router.push(`/examinations/${examinationId}`);

  /** Unsaved work is confirmed through the product's own dialog, not a
   *  browser prompt — the same pattern cancelling an examination uses. */
  const leave = () => {
    if (isDirty) {
      setConfirmLeave(true);
      return;
    }
    goBack();
  };

  const setDraft = (studentId: string, next: Partial<Draft>) => {
    setDrafts((all) => ({
      ...all,
      [studentId]: { ...all[studentId], ...next },
    }));
  };

  /**
   * What is obviously wrong before the server sees it. Deliberately not a copy
   * of `_validate_outcome` — the server stays authoritative, and this only
   * spares a round trip for mistakes a teacher can see.
   */
  const rowError = (student: RegisterStudent): string | undefined => {
    const draft = drafts[student.studentId];
    if (!draft || !draft.status) return undefined;
    if (!STATUS_TAKES_MARKS[draft.status]) return undefined;
    if (!draft.marks.trim()) return "Enter a mark, or record why they did not sit it";
    const value = Number(draft.marks);
    // `Number("")` is 0 and `Number("1e999")` is Infinity, so neither
    // `Number()` alone nor a NaN check is enough.
    if (!Number.isFinite(value)) return "Marks must be an ordinary number";
    if (value < 0) return "Marks cannot be negative";
    const max = register?.paper.maxMarks ?? 0;
    if (value > max) return `More than the paper's ${max}`;
    return undefined;
  };

  const errors = useMemo(() => {
    const found: Record<string, string> = {};
    for (const student of register?.students ?? []) {
      const message = rowError(student);
      if (message) found[student.studentId] = message;
    }
    return found;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, drafts]);

  const save = async () => {
    setFailure(null);
    const rows: MarkEntry[] = changed
      .map((student): MarkEntry | null => {
        const draft = drafts[student.studentId];
        if (!draft.status) return null;
        return {
          studentId: student.studentId,
          status: draft.status,
          marksObtained: STATUS_TAKES_MARKS[draft.status]
            ? Number(draft.marks)
            : null,
        };
      })
      .filter((row): row is MarkEntry => row !== null);

    if (rows.length === 0) return;
    try {
      await record.mutateAsync(rows);
    } catch (error) {
      // The draft is kept: a teacher who mistyped one row should not re-enter
      // thirty-nine.
      setFailure(
        error instanceof Error ? error.message : "The marks were not saved",
      );
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
          <p>Couldn&apos;t load this register.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!register) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p>Paper not found.</p>
          <Button variant="outline" onClick={leave}>
            Back to examination
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { paper, progress } = register;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={leave}>
        <ArrowLeft className="mr-1 h-4 w-4" /> {register.examinationName}
      </Button>

      <PageHeader
        title={`${paper.className ?? ""} ${paper.subjectName ?? ""}`.trim()}
        description={
          [
            paper.componentLabel,
            paper.examDate,
            `Out of ${paper.maxMarks}`,
            paper.passMarks != null ? `Pass ${paper.passMarks}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
        actions={
          editable ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1 h-4 w-4" /> Import XLSX
              </Button>
            <Button
              onClick={save}
              disabled={!isDirty || hasErrors || record.isPending}
            >
              {record.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save {changed.length > 0 ? `${changed.length} ` : ""}marks
            </Button>
            </div>
          ) : null
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-4 text-sm">
          <div>
            {register.openForMarking ? (
              <Badge variant="secondary">Open for marking</Badge>
            ) : (
              <Badge variant="outline">
                <Lock className="mr-1 h-3 w-3" /> Marking closed
              </Badge>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Recorded </span>
            <strong>{progress.recorded}</strong>
            <span className="text-muted-foreground"> of {progress.eligible}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Outstanding </span>
            <strong data-testid="outstanding">
              {progress.outstanding === null ? "—" : progress.outstanding}
            </strong>
          </div>
          {isDirty && (
            <span className="text-amber-600" data-testid="dirty-flag">
              {changed.length} unsaved
            </span>
          )}
        </CardContent>
      </Card>

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Marks register</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="p-2 text-left">Roll</th>
                  <th scope="col" className="p-2 text-left">Admission no.</th>
                  <th scope="col" className="p-2 text-left">Student</th>
                  <th scope="col" className="p-2 text-left">Status</th>
                  <th scope="col" className="p-2 text-left">Marks</th>
                </tr>
              </thead>
              <tbody>
                {register.students.map((student) => {
                  const draft = drafts[student.studentId] ?? {
                    status: null,
                    marks: "",
                  };
                  // A student with no status yet must be typeable — typing a
                  // mark is how a teacher records them present. Only a status
                  // that explicitly takes no number disables the field.
                  const takesMarks =
                    draft.status === null || STATUS_TAKES_MARKS[draft.status];
                  const error = errors[student.studentId];
                  const name = student.fullName ?? student.studentId;
                  return (
                    <tr key={student.studentId} className="border-t align-top">
                      <td className="p-2">{student.rollNumber ?? "—"}</td>
                      <td className="p-2">{student.admissionNumber ?? "—"}</td>
                      <td className="p-2">{name}</td>
                      <td className="p-2">
                        <Select
                          value={draft.status ?? NOT_ENTERED}
                          disabled={!editable}
                          onValueChange={(next) =>
                            setDraft(student.studentId, {
                              status: next === NOT_ENTERED ? null : (next as MarkStatus),
                              // A status that takes no mark clears the number,
                              // which is what the server requires.
                              marks:
                                next !== "present" ? "" : drafts[student.studentId]?.marks ?? "",
                            })
                          }
                        >
                          <SelectTrigger
                            className="w-40"
                            aria-label={`Status for ${name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Not selectable: it is the absence of a mark. */}
                            <SelectItem value={NOT_ENTERED} disabled>
                              Not entered
                            </SelectItem>
                            {(
                              Object.keys(MARK_STATUS_LABEL) as MarkStatus[]
                            ).map((status) => (
                              <SelectItem key={status} value={status}>
                                {MARK_STATUS_LABEL[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          aria-label={`Marks for ${name}`}
                          className={cn("w-28", error && "border-destructive")}
                          inputMode="decimal"
                          value={draft.marks}
                          disabled={!editable || !takesMarks}
                          placeholder={takesMarks ? "—" : ""}
                          onChange={(event) =>
                            setDraft(student.studentId, {
                              marks: event.target.value,
                              // Typing a mark means present, unless a status
                              // was already chosen deliberately.
                              status: draft.status ?? "present",
                            })
                          }
                        />
                        {error && (
                          <p className="mt-1 text-xs text-destructive">{error}</p>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {/* Only a closed paper takes corrections — an open one
                            is edited directly, which the server also enforces. */}
                        {!register.openForMarking &&
                          student.markId &&
                          canCorrect && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCorrecting(student)}
                            >
                              Request correction
                            </Button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {register.students.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No students sit this paper.
            </p>
          )}
        </CardContent>
      </Card>

      {correcting?.markId && (
        <RequestCorrectionDialog
          open
          onClose={() => setCorrecting(null)}
          student={correcting}
          examMarkId={correcting.markId}
          paperLabel={`${paper.className ?? ""} ${paper.subjectName ?? ""}`.trim()}
          maxMarks={paper.maxMarks}
          onRequested={() => setCorrecting(null)}
        />
      )}

      {importOpen && paperId && (
        <ImportMarksDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          examPaperId={paperId}
          onImported={() => setImportOpen(false)}
        />
      )}

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>
              {changed.length} mark(s) have not been saved. Leaving now discards
              them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={goBack}>
              Discard and leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
