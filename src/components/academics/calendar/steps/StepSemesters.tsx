"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateTerm, useDeleteTerm, useTerms, useUpdateTerm } from "@/hooks/useTerms";
import { toastError } from "@/lib/errorToast";
import type { AcademicTerm } from "@/services/academicTermsService";

import { EntityTable } from "../EntityTable";
import { SemesterFormDialog } from "../SemesterFormDialog";
import { formatDisplayDate } from "../calendarOptions";

interface StepSemestersProps {
  academicYearId: string;
}

/** Step 5 — semesters, persisted as academic terms. */
export function StepSemesters({ academicYearId }: StepSemestersProps) {
  const { data: terms = [], isLoading } = useTerms(academicYearId);
  const createTerm = useCreateTerm();
  const updateTerm = useUpdateTerm();
  const deleteTerm = useDeleteTerm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicTerm | null>(null);

  const handleSubmit = async (payload: Partial<AcademicTerm>) => {
    try {
      if (editing) {
        await updateTerm.mutateAsync({ id: editing.id, data: payload });
        toast.success("Semester updated");
      } else {
        await createTerm.mutateAsync(payload);
        toast.success("Semester added");
      }
    } catch (err) {
      toastError(err, "Could not save the semester");
      throw err;
    }
  };

  const handleDelete = async (term: AcademicTerm) => {
    if (!window.confirm(`Delete semester “${term.name}”?`)) return;
    try {
      await deleteTerm.mutateAsync(term.id);
      toast.success("Semester deleted");
    } catch (err) {
      toastError(err, "Could not delete the semester");
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Set Semesters</CardTitle>
          <CardDescription>Define the semester periods for this academic year.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Semester
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <EntityTable
          isLoading={isLoading}
          rows={terms}
          emptyMessage="No semesters added yet."
          columns={[
            { header: "Semester", render: (t) => t.name },
            { header: "Start Date", render: (t) => formatDisplayDate(t.start_date) },
            { header: "End Date", render: (t) => formatDisplayDate(t.end_date) },
          ]}
          onEdit={(t) => {
            setEditing(t);
            setDialogOpen(true);
          }}
          onDelete={handleDelete}
        />
        <p className="rounded-md bg-primary/5 p-3 text-xs text-primary">
          Semesters will be used in exams, reports and academic planning.
        </p>
      </CardContent>

      <SemesterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        academicYearId={academicYearId}
        nextSequence={terms.length + 1}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
