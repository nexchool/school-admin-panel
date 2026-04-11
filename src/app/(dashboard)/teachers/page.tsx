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
import { Input } from "@/components/ui/input";
import { useTeachers, useCreateTeacher } from "@/hooks/useTeachers";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { BulkImportTeachers } from "@/components/teachers/BulkImportTeachers";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import type { Teacher } from "@/types/teacher";
import { Plus, Search, Upload } from "lucide-react";

export default function TeachersPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: teachers = [], isLoading } = useTeachers({
    search: search || undefined,
  });
  const createMutation = useCreateTeacher();

  const columns: DataTableColumn<Teacher>[] = [
    { key: "employee_id", header: "Employee ID" },
    { key: "name", header: "Name" },
    { key: "email", header: "Email", cell: (r) => r.email ?? "—" },
    { key: "designation", header: "Designation", cell: (r) => r.designation ?? "—" },
    { key: "status", header: "Status" },
  ];

  const handleCreate = async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
    await createMutation.mutateAsync(data);
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and assignments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2"
          >
            <Upload className="size-4" />
            Bulk import
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher List</CardTitle>
          <CardDescription>
            View and manage all teachers. Click a row to view details.
          </CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={teachers}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No teachers found. Add a teacher to get started."
            onRowClick={(row) => router.push(`/teachers/${row.id}`)}
          />
        </CardContent>
      </Card>

      <TeacherFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <BulkImportTeachers open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
