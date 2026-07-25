"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useUpdateHoliday,
} from "@/hooks/useHolidays";
import { toastError } from "@/lib/errorToast";
import type { CreateHolidayPayload, Holiday } from "@/services/holidayService";

import { EntityTable } from "../EntityTable";
import { HolidayFormDialog } from "../HolidayFormDialog";
import { formatDisplayDate, labelFor, APPLIES_TO_OPTIONS } from "../calendarOptions";

const TYPE_LABELS = [
  { value: "national", label: "National Holiday" },
  { value: "public", label: "Public Holiday" },
  { value: "regional", label: "Regional Holiday" },
  { value: "school", label: "School Holiday" },
  { value: "optional", label: "Optional Holiday" },
];

interface StepPublicHolidaysProps {
  academicYearId: string;
}

/** Step 3 — public / national / gazetted holidays (single-day rows). */
export function StepPublicHolidays({ academicYearId }: StepPublicHolidaysProps) {
  const { data: holidays = [], isLoading } = useHolidays({
    academic_year_id: academicYearId,
  });
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);

  const publicHolidays = useMemo(
    () =>
      holidays.filter(
        (h) => !h.is_recurring && h.holiday_type !== "vacation" && h.holiday_type !== "weekly_off",
      ),
    [holidays],
  );

  const handleSubmit = async (payload: CreateHolidayPayload) => {
    try {
      if (editing) {
        await updateHoliday.mutateAsync({ id: editing.id, data: payload });
        toast.success("Holiday updated");
      } else {
        await createHoliday.mutateAsync(payload);
        toast.success("Holiday added");
      }
    } catch (err) {
      toastError(err, "Could not save the holiday");
      throw err;
    }
  };

  const handleDelete = async (holiday: Holiday) => {
    if (!window.confirm(`Delete holiday “${holiday.name}”?`)) return;
    try {
      await deleteHoliday.mutateAsync(holiday.id);
      toast.success("Holiday deleted");
    } catch (err) {
      toastError(err, "Could not delete the holiday");
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Add Public Holidays</CardTitle>
          <CardDescription>Add all public / national / gazetted holidays.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Holiday
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <EntityTable
          isLoading={isLoading}
          rows={publicHolidays}
          emptyMessage="No public holidays added yet."
          columns={[
            { header: "Holiday Name", render: (h) => h.name },
            { header: "Date", render: (h) => formatDisplayDate(h.start_date) },
            { header: "Category", render: (h) => labelFor(TYPE_LABELS, h.holiday_type) },
            {
              header: "Applies To",
              render: (h) => labelFor(APPLIES_TO_OPTIONS, h.applies_to ?? "entire_school"),
            },
          ]}
          onEdit={(h) => {
            setEditing(h);
            setDialogOpen(true);
          }}
          onDelete={handleDelete}
        />
        <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
          These days will be considered as non-working days.
        </p>
      </CardContent>

      <HolidayFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        academicYearId={academicYearId}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
