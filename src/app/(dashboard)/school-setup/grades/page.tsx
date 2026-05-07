"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
} from "@/hooks/useGrades";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Grade } from "@/services/gradesService";

type SortableRowProps = {
  grade: Grade;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

function SortableRow({ grade, onDelete, onRename }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: grade.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border bg-card p-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-8 text-sm text-muted-foreground tabular-nums">
        {grade.sequence}
      </span>
      <Input
        defaultValue={grade.name}
        onBlur={(e) => {
          const value = e.target.value.trim();
          if (value && value !== grade.name) {
            onRename(grade.id, value);
          }
        }}
        className="flex-1"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onDelete(grade.id)}
        aria-label={`Delete ${grade.name}`}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export default function SetupGradesPage() {
  const { data: grades = [], isLoading } = useGrades();
  const create = useCreateGrade();
  const update = useUpdateGrade();
  const remove = useDeleteGrade();
  const [newName, setNewName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;

    const oldIdx = grades.findIndex((g) => g.id === e.active.id);
    const newIdx = grades.findIndex((g) => g.id === e.over!.id);
    const reordered = arrayMove(grades, oldIdx, newIdx);

    // Only PATCH grades whose sequence actually changed
    const patches = reordered
      .map((g, i) => ({ g, newSeq: i + 1 }))
      .filter(({ g, newSeq }) => g.sequence !== newSeq);
    if (patches.length === 0) return;

    try {
      await Promise.all(
        patches.map(({ g, newSeq }) =>
          update.mutateAsync({ id: g.id, sequence: newSeq }),
        ),
      );
    } catch {
      toast.error("Failed to reorder grades");
    }
  };

  const onAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({
        name: trimmed,
        sequence: grades.length + 1,
      });
      setNewName("");
    } catch {
      toast.error("Failed to add grade");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
    } catch {
      toast.error("Failed to delete grade");
    }
  };

  const onRename = async (id: string, name: string) => {
    try {
      await update.mutateAsync({ id, name });
    } catch {
      toast.error("Failed to rename grade");
    }
  };

  return (
    <WizardShell stepKey="grades" canContinue={grades.length > 0} onContinue={() => {}}>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <>
          {grades.length === 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              No grades yet. Add your first grade below.
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={grades.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {grades.map((g) => (
                  <SortableRow
                    key={g.id}
                    grade={g}
                    onDelete={onDelete}
                    onRename={onRename}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-4 flex items-center gap-2">
            <Input
              value={newName}
              placeholder="Grade name (e.g. Grade 1, Std 5)"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
            />
            <Button
              onClick={onAdd}
              disabled={!newName.trim() || create.isPending}
              aria-label="Add grade"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </>
      )}
    </WizardShell>
  );
}
