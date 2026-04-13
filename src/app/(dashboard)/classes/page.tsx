"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClasses, useCreateClass, useDeleteClass } from "@/hooks/useClasses";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { classesService } from "@/services/classesService";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import type { ClassItem } from "@/types/class";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function ClassesPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: classes = [], isLoading } = useClasses();
  const { data: academicYears = [] } = useAcademicYears(false);
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string; name: string; employee_id: string }[]>([]);
  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();

  const loadTeachers = async () => {
    try {
      const t = await classesService.getAvailableClassTeachers();
      setAvailableTeachers(t);
    } catch {
      setAvailableTeachers([]);
      toast.error("Could not load teachers for this form");
    }
  };

  const handleCreateOpen = () => {
    loadTeachers();
    setCreateOpen(true);
  };

  const columns: DataTableColumn<ClassItem>[] = [
    { key: "name", header: "Name" },
    { key: "section", header: "Section" },
    { key: "academic_year", header: "Academic Year" },
    { key: "teacher_name", header: "Class Teacher", cell: (r) => r.teacher_name ?? "—" },
    { key: "student_count", header: "Students", cell: (r) => r.student_count ?? 0 },
  ];

  const handleCreate = async (data: { name: string; section: string; academic_year_id: string; teacher_id?: string }) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Class created");
      setCreateOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create class");
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage classes and section assignments.
          </p>
        </div>
        <Button onClick={handleCreateOpen} className="gap-2">
          <Plus className="size-4" />
          Add Class
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class List</CardTitle>
          <CardDescription>
            View and manage all classes. Click a row to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<ClassItem>
            columns={columns}
            data={classes}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No classes found. Add a class to get started."
            onRowClick={(row) => router.push(`/classes/${row.id}`)}
          />
        </CardContent>
      </Card>

      <ClassFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        academicYears={academicYears}
        availableTeachers={availableTeachers}
        onSubmit={handleCreate}
      />
    </div>
  );
}
