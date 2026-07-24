"use client";

import { toast } from "sonner";

import {
  useDeleteExamWindow,
  useDeleteSchoolEvent,
  useUpdateExamWindow,
  useUpdateSchoolEvent,
} from "@/hooks/useAcademicCalendar";
import { useDeleteHoliday, useUpdateHoliday } from "@/hooks/useHolidays";
import { useDeleteTerm, useUpdateTerm } from "@/hooks/useTerms";
import { toastError } from "@/lib/errorToast";
import type { AcademicTerm } from "@/services/academicTermsService";
import type { ExamWindow, SchoolEvent } from "@/services/academicCalendarService";
import type { CreateHolidayPayload, Holiday } from "@/services/holidayService";

import { ConfirmDialog } from "./ConfirmDialog";
import { ExamWindowFormDialog } from "./ExamWindowFormDialog";
import { HolidayFormDialog } from "./HolidayFormDialog";
import { SchoolEventFormDialog } from "./SchoolEventFormDialog";
import { SemesterFormDialog } from "./SemesterFormDialog";
import { VacationFormDialog } from "./VacationFormDialog";
import type { CalendarEntry } from "./calendarEntries";

interface EntryEditControllerProps {
  academicYearId: string;
  entry: CalendarEntry | null;
  mode: "edit" | "delete" | null;
  onClose: () => void;
}

/** Routes a calendar entry to its matching edit form or delete confirmation. */
export function EntryEditController({
  academicYearId,
  entry,
  mode,
  onClose,
}: EntryEditControllerProps) {
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const updateExam = useUpdateExamWindow();
  const deleteExam = useDeleteExamWindow();
  const updateEvent = useUpdateSchoolEvent();
  const deleteEvent = useDeleteSchoolEvent();
  const updateTerm = useUpdateTerm();
  const deleteTerm = useDeleteTerm();

  if (!entry) return null;
  const editing = mode === "edit";

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const submitHoliday = async (payload: CreateHolidayPayload) => {
    try {
      await updateHoliday.mutateAsync({ id: entry.id, data: payload });
      toast.success(entry.kind === "vacation" ? "Vacation updated" : "Holiday updated");
      onClose();
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const submitExam = async (payload: Partial<ExamWindow>) => {
    try {
      await updateExam.mutateAsync({ id: entry.id, data: payload });
      toast.success("Exam window updated");
      onClose();
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const submitEvent = async (payload: Partial<SchoolEvent>) => {
    try {
      await updateEvent.mutateAsync({ id: entry.id, data: payload });
      toast.success("Event updated");
      onClose();
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const submitSemester = async (payload: Partial<AcademicTerm>) => {
    try {
      await updateTerm.mutateAsync({ id: entry.id, data: payload });
      toast.success("Semester updated");
      onClose();
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      if (entry.kind === "holiday" || entry.kind === "vacation") {
        await deleteHoliday.mutateAsync(entry.id);
      } else if (entry.kind === "exam") {
        await deleteExam.mutateAsync(entry.id);
      } else if (entry.kind === "event") {
        await deleteEvent.mutateAsync(entry.id);
      } else {
        await deleteTerm.mutateAsync(entry.id);
      }
      toast.success(`${entry.name} deleted`);
      onClose();
    } catch (err) {
      toastError(err, "Could not delete");
    }
  };

  const isDeleting =
    deleteHoliday.isPending || deleteExam.isPending ||
    deleteEvent.isPending || deleteTerm.isPending;

  return (
    <>
      <HolidayFormDialog
        open={editing && entry.kind === "holiday"}
        onOpenChange={handleOpenChange}
        academicYearId={academicYearId}
        initialData={entry.kind === "holiday" ? (entry.raw as Holiday) : null}
        onSubmit={submitHoliday}
      />
      <VacationFormDialog
        open={editing && entry.kind === "vacation"}
        onOpenChange={handleOpenChange}
        academicYearId={academicYearId}
        initialData={entry.kind === "vacation" ? (entry.raw as Holiday) : null}
        onSubmit={submitHoliday}
      />
      <ExamWindowFormDialog
        open={editing && entry.kind === "exam"}
        onOpenChange={handleOpenChange}
        academicYearId={academicYearId}
        initialData={entry.kind === "exam" ? (entry.raw as ExamWindow) : null}
        onSubmit={submitExam}
      />
      <SchoolEventFormDialog
        open={editing && entry.kind === "event"}
        onOpenChange={handleOpenChange}
        academicYearId={academicYearId}
        initialData={entry.kind === "event" ? (entry.raw as SchoolEvent) : null}
        onSubmit={submitEvent}
      />
      <SemesterFormDialog
        open={editing && entry.kind === "semester"}
        onOpenChange={handleOpenChange}
        academicYearId={academicYearId}
        nextSequence={1}
        initialData={entry.kind === "semester" ? (entry.raw as AcademicTerm) : null}
        onSubmit={submitSemester}
      />

      <ConfirmDialog
        open={mode === "delete"}
        onOpenChange={handleOpenChange}
        title="Delete Event?"
        description={`"${entry.name}" will be removed from the calendar. This action cannot be undone.`}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  );
}
