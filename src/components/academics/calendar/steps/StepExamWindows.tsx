"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreateExamWindow,
  useDeleteExamWindow,
  useExamWindows,
  useUpdateExamWindow,
} from "@/hooks/useAcademicCalendar";
import { useClasses } from "@/hooks/useClasses";
import { toastError } from "@/lib/errorToast";
import type { ExamWindow } from "@/services/academicCalendarService";

import { EntityTable } from "../EntityTable";
import { ExamWindowFormDialog } from "../ExamWindowFormDialog";
import { formatDisplayDate, labelFor, EXAM_TYPE_OPTIONS } from "../calendarOptions";

interface StepExamWindowsProps {
  academicYearId: string;
}

/** Step 6 — examination windows reserved on the calendar. */
export function StepExamWindows({ academicYearId }: StepExamWindowsProps) {
  const { data: windows = [], isLoading } = useExamWindows(academicYearId);
  const { data: classes = [] } = useClasses({ academic_year_id: academicYearId });
  const createWindow = useCreateExamWindow();
  const updateWindow = useUpdateExamWindow();
  const deleteWindow = useDeleteExamWindow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamWindow | null>(null);

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name || c.section || c.id])),
    [classes],
  );

  const describeClasses = (window: ExamWindow) => {
    if (!window.applicable_class_ids.length) return "All classes";
    return window.applicable_class_ids
      .map((id) => classNameById.get(id) ?? "…")
      .join(", ");
  };

  const handleSubmit = async (payload: Partial<ExamWindow>) => {
    try {
      if (editing) {
        await updateWindow.mutateAsync({ id: editing.id, data: payload });
        toast.success("Exam window updated");
      } else {
        await createWindow.mutateAsync(payload);
        toast.success("Exam window added");
      }
    } catch (err) {
      toastError(err, "Could not save the exam window");
      throw err;
    }
  };

  const handleDelete = async (window_: ExamWindow) => {
    if (!window.confirm(`Delete exam window “${window_.name}”?`)) return;
    try {
      await deleteWindow.mutateAsync(window_.id);
      toast.success("Exam window deleted");
    } catch (err) {
      toastError(err, "Could not delete the exam window");
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Set Examination Windows</CardTitle>
          <CardDescription>Reserve date ranges for examinations.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Exam Window
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <EntityTable
          isLoading={isLoading}
          rows={windows}
          emptyMessage="No exam windows added yet."
          columns={[
            { header: "Exam Window", render: (w) => w.name },
            { header: "Type", render: (w) => labelFor(EXAM_TYPE_OPTIONS, w.exam_type) },
            { header: "Start Date", render: (w) => formatDisplayDate(w.start_date) },
            { header: "End Date", render: (w) => formatDisplayDate(w.end_date) },
            { header: "Applies To", render: describeClasses },
          ]}
          onEdit={(w) => {
            setEditing(w);
            setDialogOpen(true);
          }}
          onDelete={handleDelete}
        />
        <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
          These dates will be reserved for exams. Timetable will avoid these days.
        </p>
      </CardContent>

      <ExamWindowFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        academicYearId={academicYearId}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
