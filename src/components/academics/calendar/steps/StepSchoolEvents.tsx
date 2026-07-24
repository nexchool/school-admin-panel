"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreateSchoolEvent,
  useDeleteSchoolEvent,
  useSchoolEvents,
  useUpdateSchoolEvent,
} from "@/hooks/useAcademicCalendar";
import { toastError } from "@/lib/errorToast";
import type { SchoolEvent } from "@/services/academicCalendarService";

import { EntityTable } from "../EntityTable";
import { SchoolEventFormDialog } from "../SchoolEventFormDialog";
import {
  formatDisplayDate,
  labelFor,
  APPLIES_TO_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from "../calendarOptions";

interface StepSchoolEventsProps {
  academicYearId: string;
}

/** Step 7 — school events, celebrations and activities. */
export function StepSchoolEvents({ academicYearId }: StepSchoolEventsProps) {
  const { data: events = [], isLoading } = useSchoolEvents(academicYearId);
  const createEvent = useCreateSchoolEvent();
  const updateEvent = useUpdateSchoolEvent();
  const deleteEvent = useDeleteSchoolEvent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | null>(null);

  const handleSubmit = async (payload: Partial<SchoolEvent>) => {
    try {
      if (editing) {
        await updateEvent.mutateAsync({ id: editing.id, data: payload });
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Event added");
      }
    } catch (err) {
      toastError(err, "Could not save the event");
      throw err;
    }
  };

  const handleDelete = async (event: SchoolEvent) => {
    if (!window.confirm(`Delete event “${event.name}”?`)) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Event deleted");
    } catch (err) {
      toastError(err, "Could not delete the event");
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Add School Events</CardTitle>
          <CardDescription>Add important events, celebrations and activities.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Event
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <EntityTable
          isLoading={isLoading}
          rows={events}
          emptyMessage="No events added yet."
          columns={[
            { header: "Event Name", render: (e) => e.name },
            { header: "Date", render: (e) => formatDisplayDate(e.event_date) },
            { header: "Type", render: (e) => labelFor(EVENT_TYPE_OPTIONS, e.event_type) },
            {
              header: "Applies To",
              render: (e) => labelFor(APPLIES_TO_OPTIONS, e.applies_to),
            },
          ]}
          onEdit={(e) => {
            setEditing(e);
            setDialogOpen(true);
          }}
          onDelete={handleDelete}
        />
        <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
          Events will be visible on the calendar for students, teachers and parents.
        </p>
      </CardContent>

      <SchoolEventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        academicYearId={academicYearId}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
