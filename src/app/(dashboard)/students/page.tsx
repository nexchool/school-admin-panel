"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudents } from "@/hooks/useStudents";
import { useCreateStudent } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { BulkImportStudents } from "@/components/students/BulkImportStudents";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import type { Student } from "@/types/student";
import { Upload, Plus, Search } from "lucide-react";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: students = [], isLoading } = useStudents({ search: search || undefined });
  const { data: classes = [] } = useClasses();
  const createMutation = useCreateStudent();

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return students.slice(start, start + PAGE_SIZE);
  }, [students, page]);

  const columns: DataTableColumn<Student>[] = [
    { key: "admission_number", header: "Admission #" },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "class_name",
      header: "Class",
      cell: (row) => row.class_name ?? row.class_id ?? "—",
    },
    { key: "guardian_phone", header: "Guardian Phone" },
  ];

  const handleCreate = async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
    await createMutation.mutateAsync(data);
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage student records and enrollment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add Student
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="size-4" />
            Bulk Import
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            View and manage all students. Click a row to view details.
          </CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, admission #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedData}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No students found. Add a student or use Bulk Import."
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total: students.length,
              onPageChange: setPage,
            }}
            onRowClick={(row) => router.push(`/students/${row.id}`)}
          />
        </CardContent>
      </Card>

      <BulkImportStudents open={importOpen} onOpenChange={setImportOpen} />

      <StudentFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        classes={classes}
        onSubmit={handleCreate}
      />
    </div>
  );
}
