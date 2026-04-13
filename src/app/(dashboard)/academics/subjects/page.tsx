"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from "@/hooks/useSubjects";
import { SubjectFormModal } from "@/components/subjects/SubjectFormModal";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import type { Subject } from "@/types/subject";
import { useAuth } from "@/hooks";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SubjectsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("subject.manage");

  const [formOpen, setFormOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");
  const { data: subjects = [], isLoading } = useSubjects();
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subjects, search]);

  const columns: DataTableColumn<Subject>[] = [
    { key: "name", header: "Name" },
    { key: "code", header: "Code", cell: (r) => r.code ?? "—" },
    { key: "description", header: "Description", cell: (r) => r.description ?? "—" },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: Subject) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); setEditSubject(r); setFormOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteSubject(r); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<Subject>,
        ]
      : []),
  ];

  const handleFormSubmit = async (
    data: Parameters<typeof createMutation.mutateAsync>[0]
  ) => {
    try {
      if (editSubject) {
        await updateMutation.mutateAsync({ id: editSubject.id, input: data });
        toast.success("Subject updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Subject created");
      }
      setFormOpen(false);
      setEditSubject(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save subject");
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteSubject) return;
    try {
      await deleteMutation.mutateAsync(deleteSubject.id);
      toast.success("Subject deleted");
      setDeleteSubject(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete subject");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/academics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Subject catalog</h1>
            <p className="text-sm text-muted-foreground">
              Master list of subjects. Assign them to classes from each class&apos;s Subjects tab.
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => { setEditSubject(null); setFormOpen(true); }} className="gap-2">
            <Plus className="size-4" />
            Add subject
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No subjects yet. Add one to get started."
          />
        </CardContent>
      </Card>

      <SubjectFormModal
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditSubject(null); }}
        initialData={editSubject ?? undefined}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={!!deleteSubject} onOpenChange={(o) => !o && setDeleteSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete subject</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &quot;{deleteSubject?.name}&quot;? This cannot be undone and will remove it from all class assignments.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
