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
import { VacationFormDialog } from "../VacationFormDialog";
import { formatDisplayDate, labelFor, APPLIES_TO_OPTIONS } from "../calendarOptions";

interface StepVacationsProps {
  academicYearId: string;
}

/** Step 4 — vacation periods / school breaks (range holidays, type "vacation"). */
export function StepVacations({ academicYearId }: StepVacationsProps) {
  const { data: holidays = [], isLoading } = useHolidays({
    academic_year_id: academicYearId,
  });
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);

  const vacations = useMemo(
    () => holidays.filter((h) => !h.is_recurring && h.holiday_type === "vacation"),
    [holidays],
  );

  const handleSubmit = async (payload: CreateHolidayPayload) => {
    try {
      if (editing) {
        await updateHoliday.mutateAsync({ id: editing.id, data: payload });
        toast.success("Vacation updated");
      } else {
        await createHoliday.mutateAsync(payload);
        toast.success("Vacation added");
      }
    } catch (err) {
      toastError(err, "Could not save the vacation");
      throw err;
    }
  };

  const handleDelete = async (vacation: Holiday) => {
    if (!window.confirm(`Delete vacation “${vacation.name}”?`)) return;
    try {
      await deleteHoliday.mutateAsync(vacation.id);
      toast.success("Vacation deleted");
    } catch (err) {
      toastError(err, "Could not delete the vacation");
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Add Vacations</CardTitle>
          <CardDescription>Add vacation periods / school breaks.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Vacation
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <EntityTable
          isLoading={isLoading}
          rows={vacations}
          emptyMessage="No vacations added yet."
          columns={[
            { header: "Vacation Name", render: (h) => h.name },
            { header: "Start Date", render: (h) => formatDisplayDate(h.start_date) },
            { header: "End Date", render: (h) => formatDisplayDate(h.end_date) },
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
          All dates in vacation periods will be marked as vacation days.
        </p>
      </CardContent>

      <VacationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        academicYearId={academicYearId}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
