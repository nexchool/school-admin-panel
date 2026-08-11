"use client";

import { useMemo, useState } from "react";
import { Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  useCreateGrade,
  useDeleteGrade,
  useGrades,
  useUpdateGrade,
} from "@/hooks/useGrades";
import { ApiException } from "@/services/api";
import type { Grade } from "@/services/gradesService";

const QUICK_PRESETS: { label: string; names: string[] }[] = [
  { label: "Pre-primary", names: ["LKG", "UKG"] },
  {
    label: "1 → 10",
    names: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  { label: "11 → 12", names: ["11", "12"] },
];

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
  const createMut = useCreateGrade();
  const updateMut = useUpdateGrade();
  const deleteMut = useDeleteGrade();

  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<Grade | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Grade | null>(null);

  const sortedGrades = useMemo(
    () => [...data].sort((a, b) => a.sequence - b.sequence),
    [data],
  );
  const nextSequence =
    sortedGrades.length === 0
      ? 0
      : sortedGrades[sortedGrades.length - 1].sequence + 1;

  const addOne = (gradeName: string, sequence: number) =>
    new Promise<void>((resolve) => {
      createMut.mutate(
        { name: gradeName, sequence },
        {
          onSuccess: () => resolve(),
          onError: (e) => {
            toast.error(
              `Could not add “${gradeName}”: ${errorMessage(e, "unknown error")}`,
            );
            resolve();
          },
        },
      );
    });

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) {
      toast.error("Enter a grade name.");
      return;
    }
    await addOne(value, nextSequence);
    setName("");
  };

  const addPreset = async (preset: (typeof QUICK_PRESETS)[number]) => {
    const existing = new Set(data.map((g) => g.name.toLowerCase()));
    const toAdd = preset.names.filter((n) => !existing.has(n.toLowerCase()));
    if (toAdd.length === 0) {
      toast.info("All those grades already exist.");
      return;
    }
    let seq = nextSequence;
    for (const n of toAdd) {
      await addOne(n, seq);
      seq += 1;
    }
    toast.success(`Added ${toAdd.length} grade${toAdd.length === 1 ? "" : "s"}.`);
  };

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
      cell: (row) => <span className="font-medium">{row.name}</span>,
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
                  aria-label={`Rename ${row.name}`}
                  onClick={() => openRename(row)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Remove grade"
                  aria-label={`Remove ${row.name}`}
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
        description="The standards your school teaches, in the order it teaches them."
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

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a grade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adding stays on the page rather than behind a modal: a grade is
                one short name, and the presets exist so a school sets up all
                twelve in a click. A dialog per grade would be twelve dialogs. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick add:</span>
              {QUICK_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPreset(p)}
                  disabled={createMut.isPending}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <form onSubmit={addManual} className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="grade-name">Name</Label>
                <Input
                  id="grade-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. LKG or 5"
                  maxLength={50}
                />
              </div>
              <Button type="submit" disabled={createMut.isPending} className="gap-2">
                {createMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

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
            emptyMessage="No grades yet. Add at least one to continue."
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
        title={`Remove grade ${deleting?.name ?? ""}?`}
        description="It leaves the catalogue and stops being offered to new classes. The removal is refused while any class is still in this grade."
        confirmLabel="Remove"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
