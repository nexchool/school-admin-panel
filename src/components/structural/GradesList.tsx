"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks";
import { useClasses } from "@/hooks/useClasses";
import { useDeleteGrade, useGrades, useUpdateGrade } from "@/hooks/useGrades";
import { gradeLabel } from "@/lib/gradeLevel";
import { ApiException } from "@/services/api";
import type { Grade } from "@/services/gradesService";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiException
    ? error.message
    : error instanceof Error
      ? error.message
      : fallback;

export function GradesList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("grade.manage");

  const { data = [], isLoading, isError, refetch } = useGrades();
  // The classes already loaded for the pickers, counted per grade. No new
  // query: this is the same list the section form reads, scoped by the header
  // to the campus and year the administrator is looking at — so the number
  // answers "how many classes does this grade run right now", not "ever".
  const { data: classes = [] } = useClasses();
  const classCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of classes) {
      if (!row.grade_id) continue;
      counts.set(row.grade_id, (counts.get(row.grade_id) ?? 0) + 1);
    }
    return counts;
  }, [classes]);
  const updateMut = useUpdateGrade();
  const deleteMut = useDeleteGrade();

  const [renaming, setRenaming] = useState<Grade | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Grade | null>(null);

  const sortedGrades = useMemo(
    () => [...data].sort((a, b) => a.sequence - b.sequence),
    [data],
  );
  const openRename = (grade: Grade) => {
    setRenaming(grade);
    setRenameValue(grade.name);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming) return;
    const value = renameValue.trim();
    if (!value) {
      toast.error("A grade needs a name.");
      return;
    }
    if (value === renaming.name) {
      setRenaming(null);
      return;
    }
    updateMut.mutate(
      { id: renaming.id, name: value },
      {
        onSuccess: () => {
          toast.success("Grade renamed.");
          setRenaming(null);
        },
        onError: (e) => toast.error(errorMessage(e, "Could not rename.")),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMut.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Grade removed.");
        setDeleting(null);
      },
      // Left open on failure: a grade a class is in is refused, and that
      // refusal is the answer to "why is it still there".
      onError: (e) => toast.error(errorMessage(e, "Could not remove the grade.")),
    });
  };

  const columns: DataTableColumn<Grade>[] = [
    {
      key: "sequence",
      header: "Order",
      className: "w-[90px]",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.sequence}
        </span>
      ),
    },
    {
      key: "name",
      header: "Grade",
      cell: (row) => (
        <span className="font-medium">{gradeLabel(row.name)}</span>
      ),
    },
    {
      key: "classes",
      header: "Classes",
      className: "w-[110px]",
      cell: (row) => {
        const count = classCounts.get(row.id) ?? 0;
        return count === 0 ? (
          <span className="text-muted-foreground">None yet</span>
        ) : (
          <Link
            href={`/grades/${row.id}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {count}
          </Link>
        );
      },
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-[110px] text-right",
            cell: (row: Grade) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Rename grade"
                  aria-label={`Rename ${gradeLabel(row.name)}`}
                  onClick={() => openRename(row)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Remove grade"
                  aria-label={`Remove ${gradeLabel(row.name)}`}
                  onClick={() => setDeleting(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<Grade>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades"
        description="The standards your school teaches, in the order it teaches them. A grade appears here the first time you open a section in it."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Layers}
          label="Total Grades"
          value={sortedGrades.length}
          sub="From your earliest year to your last"
          tone="primary"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading
              ? "Grades"
              : `${sortedGrades.length} grade${sortedGrades.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sortedGrades}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            errorMessage="Couldn't load grades. Check your connection and retry."
            emptyMessage="No grades yet. Open a section under Classes and name its grade — it will be added here."
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent className="sm:max-w-sm" onClose={() => setRenaming(null)}>
          <DialogHeader>
            <DialogTitle>Rename grade</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRename} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="grade-rename">Name</Label>
              <Input
                id="grade-rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Every class in this grade is relabelled — nothing is moved.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenaming(null)}
                disabled={updateMut.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting ? gradeLabel(deleting.name) : "grade"}?`}
        description="It leaves the catalogue and stops being offered to new classes. The removal is refused while any class is still in this grade."
        confirmLabel="Remove"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
