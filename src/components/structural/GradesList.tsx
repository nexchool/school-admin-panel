"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks";
import {
  useCreateGrade,
  useDeleteGrade,
  useGrades,
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

export function GradesList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("grade.manage");

  const { data = [], isLoading } = useGrades();
  const createMut = useCreateGrade();
  const deleteMut = useDeleteGrade();

  const [name, setName] = useState("");
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
              `Could not add “${gradeName}”: ${
                e instanceof ApiException
                  ? e.message
                  : e instanceof Error
                    ? e.message
                    : "unknown error"
              }`,
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
    toast.success(`Added ${toAdd.length} grade(s).`);
  };

  const onDelete = (g: Grade) => {
    if (!window.confirm(`Delete grade “${g.name}”?`)) return;
    deleteMut.mutate(g.id, {
      onSuccess: () => toast.success("Grade deleted."),
      onError: (e) =>
        toast.error(
          e instanceof ApiException
            ? e.message
            : e instanceof Error
              ? e.message
              : "Delete failed.",
        ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href="/school-setup">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to setup
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grades</CardTitle>
          <CardDescription>
            Define the standards your school offers. The order here is used for
            sorting and promotion later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Quick add:
                </span>
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
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium" htmlFor="grade-name">
                    Add a grade
                  </label>
                  <Input
                    id="grade-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. LKG or 5"
                    maxLength={50}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createMut.isPending}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </form>
            </>
          ) : null}

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : sortedGrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No grades yet. Add at least one to continue.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {sortedGrades.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <span className="font-medium">{g.name}</span>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(g)}
                      disabled={deleteMut.isPending}
                      aria-label={`Delete grade ${g.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
