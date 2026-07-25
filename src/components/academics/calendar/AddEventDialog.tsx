"use client";

import { useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  CalendarHeart,
  Flag,
  MoreHorizontal,
  PartyPopper,
  Presentation,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateHoliday } from "@/hooks/useHolidays";
import {
  useCreateExamWindow,
  useCreateSchoolEvent,
} from "@/hooks/useAcademicCalendar";
import { useCreateTerm, useTerms } from "@/hooks/useTerms";
import { toastError } from "@/lib/errorToast";
import type { CreateHolidayPayload } from "@/services/holidayService";
import type {
  ExamWindow,
  SchoolEvent,
  SchoolEventType,
} from "@/services/academicCalendarService";
import type { AcademicTerm } from "@/services/academicTermsService";

import { HolidayFormDialog } from "./HolidayFormDialog";
import { VacationFormDialog } from "./VacationFormDialog";
import { ExamWindowFormDialog } from "./ExamWindowFormDialog";
import { SchoolEventFormDialog } from "./SchoolEventFormDialog";
import { SemesterFormDialog } from "./SemesterFormDialog";

type EventKind =
  | "holiday"
  | "exam"
  | "event"
  | "vacation"
  | "semester"
  | "training"
  | "meeting"
  | "other";

// Icon colors follow the calendar legend so each type reads consistently.
const EVENT_KINDS: { kind: EventKind; label: string; icon: typeof Flag; color: string }[] = [
  { kind: "holiday", label: "Public Holiday", icon: Flag, color: "text-red-500" },
  { kind: "exam", label: "Examination", icon: BookOpenCheck, color: "text-blue-500" },
  { kind: "event", label: "School Event", icon: PartyPopper, color: "text-amber-500" },
  { kind: "vacation", label: "Vacation", icon: CalendarHeart, color: "text-violet-500" },
  { kind: "semester", label: "Semester", icon: BookOpen, color: "text-emerald-600" },
  { kind: "training", label: "Teacher Training", icon: Presentation, color: "text-yellow-600" },
  { kind: "meeting", label: "Parent Meeting", icon: UsersRound, color: "text-pink-500" },
  { kind: "other", label: "Other", icon: MoreHorizontal, color: "text-muted-foreground" },
];

/** Event kinds that reuse the school-event form with a preselected type. */
const EVENT_TYPE_BY_KIND: Partial<Record<EventKind, SchoolEventType>> = {
  event: "event",
  training: "training",
  meeting: "meeting",
  other: "other",
};

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
}

/** "Add Event" flow on the calendar dashboard — pick a type, then fill the
 * matching form. Reuses the wizard dialogs. */
export function AddEventDialog({ open, onOpenChange, academicYearId }: AddEventDialogProps) {
  const [kind, setKind] = useState<EventKind | null>(null);

  const createHoliday = useCreateHoliday();
  const createExamWindow = useCreateExamWindow();
  const createEvent = useCreateSchoolEvent();
  const createTerm = useCreateTerm();
  const { data: terms = [] } = useTerms(academicYearId);

  const closeAll = (o: boolean) => {
    if (!o) setKind(null);
    onOpenChange(o);
  };

  const submitHoliday = async (payload: CreateHolidayPayload) => {
    try {
      await createHoliday.mutateAsync(payload);
      toast.success(payload.holiday_type === "vacation" ? "Vacation added" : "Holiday added");
      closeAll(false);
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const submitExam = async (payload: Partial<ExamWindow>) => {
    try {
      await createExamWindow.mutateAsync(payload);
      toast.success("Exam window added");
      closeAll(false);
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const submitEvent = async (payload: Partial<SchoolEvent>) => {
    try {
      await createEvent.mutateAsync(payload);
      toast.success("Event added");
      closeAll(false);
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const submitSemester = async (payload: Partial<AcademicTerm>) => {
    try {
      await createTerm.mutateAsync(payload);
      toast.success("Semester added");
      closeAll(false);
    } catch (err) {
      toastError(err, "Could not save");
      throw err;
    }
  };

  const eventFormKind = kind && kind in EVENT_TYPE_BY_KIND ? kind : null;

  return (
    <>
      <Dialog open={open && kind === null} onOpenChange={closeAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription>What do you want to add?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EVENT_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setKind(k.kind)}
                className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-center text-sm transition-colors hover:border-primary hover:bg-primary/5"
              >
                <k.icon className={`h-6 w-6 ${k.color}`} />
                {k.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <HolidayFormDialog
        open={open && kind === "holiday"}
        onOpenChange={closeAll}
        academicYearId={academicYearId}
        onSubmit={submitHoliday}
      />
      <VacationFormDialog
        open={open && kind === "vacation"}
        onOpenChange={closeAll}
        academicYearId={academicYearId}
        onSubmit={submitHoliday}
      />
      <ExamWindowFormDialog
        open={open && kind === "exam"}
        onOpenChange={closeAll}
        academicYearId={academicYearId}
        onSubmit={submitExam}
      />
      <SchoolEventFormDialog
        open={open && eventFormKind !== null}
        onOpenChange={closeAll}
        academicYearId={academicYearId}
        initialType={eventFormKind ? EVENT_TYPE_BY_KIND[eventFormKind] : undefined}
        onSubmit={submitEvent}
      />
      <SemesterFormDialog
        open={open && kind === "semester"}
        onOpenChange={closeAll}
        academicYearId={academicYearId}
        nextSequence={terms.length + 1}
        onSubmit={submitSemester}
      />
    </>
  );
}
