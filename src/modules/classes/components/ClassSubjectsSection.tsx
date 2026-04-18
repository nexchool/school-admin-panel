"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  classSubjectsKeys,
  useAssignSubjectTeacher,
  useClassSubjectOfferings,
  useClassSubjectTeachers,
  useCreateClassSubject,
  useRemoveClassSubject,
  useRemoveSubjectTeacher,
  useUpdateClassSubject,
} from "@/hooks/useClassSubjects";
import { subjectsService } from "@/services/subjectsService";
import { classSubjectsService } from "@/services/classSubjectsService";
import { ApiException } from "@/services/api";
import type { ClassSubjectTableRow } from "@/types/classSubject";
import type { Subject } from "@/types/subject";
import { ClassSubjectsTable } from "./ClassSubjectsTable";
import { AddClassSubjectModal } from "./AddClassSubjectModal";
import { EditClassSubjectModal } from "./EditClassSubjectModal";
import { AssignTeacherModal } from "./AssignTeacherModal";
import { BookOpen, Plus } from "lucide-react";

export interface ClassSubjectsSectionProps {
  classId: string;
  onRefresh?: () => void;
}

export function ClassSubjectsSection({ classId, onRefresh }: ClassSubjectsSectionProps) {
  const { hasAnyPermission, isFeatureEnabled } = useAuth();
  const queryClient = useQueryClient();

  const canView = hasAnyPermission([
    "class_subject.read",
    "class_subject.manage",
    "class.manage",
  ]);
  const canManage = hasAnyPermission(["class_subject.manage", "class.manage"]);

  const timetableEnabled = isFeatureEnabled("timetable");
  const subjectTeachersEnabled =
    timetableEnabled &&
    hasAnyPermission(["class_subject.read", "class_subject.manage", "class.manage"]);

  const offeringsQuery = useClassSubjectOfferings(classId);
  const teachersQuery = useClassSubjectTeachers(classId, {
    enabled: !!classId && subjectTeachersEnabled,
  });

  const catalogQuery = useQuery({
    queryKey: ["subjects", "catalog", "include-inactive"],
    queryFn: () => subjectsService.getSubjects({ includeInactive: true }),
    enabled: canView && !!classId,
  });

  const availableTeachersQuery = useQuery({
    queryKey: ["classes", "subject-teacher-candidates", classId],
    queryFn: () => classSubjectsService.listSubjectTeacherCandidates(classId),
    enabled: canManage && !!classId && subjectTeachersEnabled,
  });

  const createMutation = useCreateClassSubject(classId);
  const updateMutation = useUpdateClassSubject(classId);
  const removeMutation = useRemoveClassSubject(classId);
  const assignTeacherMutation = useAssignSubjectTeacher(classId);
  const removeTeacherMutation = useRemoveSubjectTeacher(classId);

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<ClassSubjectTableRow | null>(null);
  const [assignRow, setAssignRow] = useState<ClassSubjectTableRow | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<ClassSubjectTableRow | null>(null);
  const [assigningFor, setAssigningFor] = useState<string | null>(null);

  const catalogById = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of catalogQuery.data ?? []) {
      m.set(s.id, s);
    }
    return m;
  }, [catalogQuery.data]);

  const rows: ClassSubjectTableRow[] = useMemo(() => {
    const items = offeringsQuery.data ?? [];
    const teachers = teachersQuery.data ?? [];
    return items.map((o) => ({
      ...o,
      subject_type: catalogById.get(o.subject_id)?.subject_type ?? "core",
      subject_is_active: catalogById.get(o.subject_id)?.is_active ?? true,
      teachers: teachers.filter((t) => t.class_subject_id === o.id),
    }));
  }, [offeringsQuery.data, teachersQuery.data, catalogById]);

  const assignedSubjectIds = useMemo(
    () => new Set(rows.map((r) => r.subject_id)),
    [rows]
  );

  /** Display order: matches backend default (sort_order, then name). */
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ao = a.sort_order ?? 10_000;
      const bo = b.sort_order ?? 10_000;
      if (ao !== bo) return ao - bo;
      return (a.subject_name ?? "").localeCompare(b.subject_name ?? "");
    });
  }, [rows]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: classSubjectsKeys.list(classId) });
    queryClient.invalidateQueries({ queryKey: classSubjectsKeys.teachers(classId) });
    onRefresh?.();
  }, [classId, onRefresh, queryClient]);

  const handleAddSubmit = async (data: {
    subject_id: string;
    weekly_periods: number;
    is_mandatory: boolean;
    teacher_ids: string[];
  }) => {
    try {
      const created = await createMutation.mutateAsync({
        subject_id: data.subject_id,
        weekly_periods: data.weekly_periods,
        is_mandatory: data.is_mandatory,
      });
      if (subjectTeachersEnabled && data.teacher_ids.length > 0) {
        for (let i = 0; i < data.teacher_ids.length; i++) {
          const tid = data.teacher_ids[i];
          await assignTeacherMutation.mutateAsync({
            class_subject_id: created.id,
            teacher_id: tid,
            role: i === 0 ? "primary" : "assistant",
          });
        }
      }
      toast.success("Subject added to class");
      invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add subject");
      throw e;
    }
  };

  const handleEditSubmit = async (input: {
    weekly_periods: number;
    is_mandatory: boolean;
  }) => {
    if (!editRow) return;
    try {
      await updateMutation.mutateAsync({
        classSubjectId: editRow.id,
        input: {
          weekly_periods: input.weekly_periods,
          is_mandatory: input.is_mandatory,
        },
      });
      toast.success("Subject updated");
      invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      throw e;
    }
  };

  const handleReorder = async (row: ClassSubjectTableRow, direction: "up" | "down") => {
    const idx = sortedRows.findIndex((r) => r.id === row.id);
    const j = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || j < 0 || j >= sortedRows.length) return;
    const a = sortedRows[idx];
    const b = sortedRows[j];
    const va = a.sort_order ?? (idx + 1) * 10;
    const vb = b.sort_order ?? (j + 1) * 10;
    try {
      await updateMutation.mutateAsync({
        classSubjectId: a.id,
        input: { sort_order: vb },
      });
      await updateMutation.mutateAsync({
        classSubjectId: b.id,
        input: { sort_order: va },
      });
      toast.success("Order updated");
      invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder");
    }
  };

  const checkTimetableBlocks = async (classSubjectId: string): Promise<boolean> => {
    if (!timetableEnabled) return false;
    try {
      const t = await classSubjectsService.getTimetableItems(classId);
      return (t.items ?? []).some((e) => e.class_subject_id === classSubjectId);
    } catch {
      return false;
    }
  };

  const handleRemoveRequest = async (row: ClassSubjectTableRow) => {
    const blocked = await checkTimetableBlocks(row.id);
    if (blocked) {
      setBlockDialogOpen(true);
      return;
    }
    setConfirmRemove(row);
  };

  const confirmDelete = async () => {
    if (!confirmRemove) return;
    try {
      await removeMutation.mutateAsync(confirmRemove.id);
      toast.success("Subject removed from class");
      setConfirmRemove(null);
      invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  };

  const handleAssignTeacherQuick = async (
    classSubjectId: string,
    teacherId: string
  ) => {
    const row = rows.find((r) => r.id === classSubjectId);
    const hasPrimary =
      row?.teachers.some((a) => a.role === "primary" && a.is_active) ?? false;
    setAssigningFor(classSubjectId);
    try {
      await assignTeacherMutation.mutateAsync({
        class_subject_id: classSubjectId,
        teacher_id: teacherId,
        role: hasPrimary ? "assistant" : "primary",
      });
      toast.success("Teacher assigned");
      invalidateAll();
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : "Could not assign teacher";
      toast.error(msg);
    } finally {
      setAssigningFor(null);
    }
  };

  const handleAssignModalSubmit = async (data: {
    teacher_id: string;
    role: "primary" | "assistant" | "guest";
  }) => {
    if (!assignRow) return;
    try {
      await assignTeacherMutation.mutateAsync({
        class_subject_id: assignRow.id,
        teacher_id: data.teacher_id,
        role: data.role,
      });
      toast.success("Teacher assigned");
      invalidateAll();
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : "Could not assign teacher";
      toast.error(msg);
      throw e;
    }
  };

  const handleRemoveTeacher = async (assignmentId: string) => {
    try {
      await removeTeacherMutation.mutateAsync(assignmentId);
      toast.success("Teacher unassigned");
      invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  };

  if (!canView) {
    return null;
  }

  const loading =
    offeringsQuery.isLoading ||
    (subjectTeachersEnabled && teachersQuery.isLoading) ||
    catalogQuery.isLoading;

  const error =
    offeringsQuery.error ||
    (subjectTeachersEnabled ? teachersQuery.error : null) ||
    catalogQuery.error;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" />
              Class subjects
            </CardTitle>
            <CardDescription>
              Subjects offered for this class, weekly periods, and assigned
              teachers.
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              Add subject
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load subjects"}
            </p>
          )}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedRows.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No subjects assigned to this class.
              </p>
              {canManage && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1 size-4" />
                  Add subject
                </Button>
              )}
            </div>
          ) : (
            <div className="max-h-[min(480px,70vh)] overflow-auto">
              <ClassSubjectsTable
                rows={sortedRows}
                isLoading={false}
                canManage={canManage}
                subjectTeachersEnabled={subjectTeachersEnabled}
                availableTeachers={availableTeachersQuery.data ?? []}
                onEdit={(r) => setEditRow(r)}
                onRemove={(r) => void handleRemoveRequest(r)}
                onAddTeacher={(r) => setAssignRow(r)}
                onAssignTeacher={(csId, tid) =>
                  void handleAssignTeacherQuick(csId, tid)
                }
                onRemoveTeacher={
                  canManage && subjectTeachersEnabled
                    ? handleRemoveTeacher
                    : undefined
                }
                assigningTeacherFor={assigningFor}
                onMoveUp={(r) => void handleReorder(r, "up")}
                onMoveDown={(r) => void handleReorder(r, "down")}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AddClassSubjectModal
        open={addOpen}
        onOpenChange={setAddOpen}
        subjects={catalogQuery.data ?? []}
        assignedSubjectIds={assignedSubjectIds}
        availableTeachers={availableTeachersQuery.data ?? []}
        subjectTeachersEnabled={subjectTeachersEnabled}
        onSubmit={handleAddSubmit}
      />

      <EditClassSubjectModal
        open={!!editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
        row={editRow}
        onSubmit={handleEditSubmit}
      />

      <AssignTeacherModal
        open={!!assignRow}
        onOpenChange={(o) => !o && setAssignRow(null)}
        row={assignRow}
        availableTeachers={availableTeachersQuery.data ?? []}
        existingTeacherIds={
          new Set(assignRow?.teachers.map((t) => t.teacher_id) ?? [])
        }
        onSubmit={handleAssignModalSubmit}
      />

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot remove this class subject</DialogTitle>
            <DialogDescription>
              It is still linked to one or more periods in this class&apos;s active
              timetable. Open the Timetable tab, remove or reschedule those slots,
              then try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setBlockDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove subject from class?</DialogTitle>
            <DialogDescription>
              This will unassign{" "}
              <strong>{confirmRemove?.subject_name ?? "this subject"}</strong>{" "}
              from the class.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
