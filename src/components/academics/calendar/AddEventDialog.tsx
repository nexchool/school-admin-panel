"use client";

import { useState } from "react";
import { BookOpenCheck, CalendarHeart, Flag, PartyPopper } from "lucide-react";
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
import { toastError } from "@/lib/errorToast";
import type { CreateHolidayPayload } from "@/services/holidayService";
import type { ExamWindow, SchoolEvent } from "@/services/academicCalendarService";

import { HolidayFormDialog } from "./HolidayFormDialog";
import { VacationFormDialog } from "./VacationFormDialog";
import { ExamWindowFormDialog } from "./ExamWindowFormDialog";
import { SchoolEventFormDialog } from "./SchoolEventFormDialog";

type EventKind = "holiday" | "exam" | "event" | "vacation";

const EVENT_KINDS: { kind: EventKind; label: string; icon: typeof Flag }[] = [
  { kind: "holiday", label: "Public Holiday", icon: Flag },
  { kind: "exam", label: "Examination", icon: BookOpenCheck },
  { kind: "event", label: "School Event", icon: PartyPopper },
  { kind: "vacation", label: "Vacation", icon: CalendarHeart },
];

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string;
}

/** "Add Event" flow on the calendar dashboard — pick a type, then fill the
 * matching form. Reuses the wizard step dialogs. */
export function AddEventDialog({ open, onOpenChange, academicYearId }: AddEventDialogProps) {
  const [kind, setKind] = useState<EventKind | null>(null);

  const createHoliday = useCreateHoliday();
  const createExamWindow = useCreateExamWindow();
  const createEvent = useCreateSchoolEvent();

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
                className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-sm transition-colors hover:border-primary hover:bg-primary/5"
              >
                <k.icon className="h-6 w-6 text-primary" />
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
        open={open && kind === "event"}
        onOpenChange={closeAll}
        academicYearId={academicYearId}
        onSubmit={submitEvent}
      />
    </>
  );
}
