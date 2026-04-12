"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import type { ClassSubjectTableRow } from "@/types/classSubject";
import type { Teacher } from "@/types/teacher";
import {
  Pencil,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  core: "Core",
  elective: "Elective",
  activity: "Activity",
  other: "Other",
};

function typeBadgeClass(t?: string) {
  switch (t) {
    case "elective":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
    case "activity":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "other":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
    default:
      return "bg-primary/10 text-primary";
  }
}

export interface ClassSubjectsTableProps {
  rows: ClassSubjectTableRow[];
  isLoading?: boolean;
  canManage: boolean;
  subjectTeachersEnabled: boolean;
  availableTeachers: Teacher[];
  onEdit: (row: ClassSubjectTableRow) => void;
  onRemove: (row: ClassSubjectTableRow) => void;
  onAddTeacher: (row: ClassSubjectTableRow) => void;
  onAssignTeacher: (classSubjectId: string, teacherId: string) => void;
  onRemoveTeacher?: (assignmentId: string) => void;
  assigningTeacherFor?: string | null;
  onMoveUp?: (row: ClassSubjectTableRow) => void;
  onMoveDown?: (row: ClassSubjectTableRow) => void;
}

export function ClassSubjectsTable({
  rows,
  isLoading,
  canManage,
  subjectTeachersEnabled,
  availableTeachers,
  onEdit,
  onRemove,
  onAddTeacher,
  onAssignTeacher,
  onRemoveTeacher,
  assigningTeacherFor,
  onMoveUp,
  onMoveDown,
}: ClassSubjectsTableProps) {
  const columns: DataTableColumn<ClassSubjectTableRow>[] = [
    {
      key: "order",
      header: "Order",
      className: "w-[72px]",
      cell: (r) => {
        const idx = rows.findIndex((x) => x.id === r.id);
        const inactive = r.subject_is_active === false;
        const canReorder =
          canManage &&
          !inactive &&
          onMoveUp &&
          onMoveDown &&
          rows.length > 1;
        return (
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canReorder || idx <= 0}
              onClick={() => onMoveUp?.(r)}
              aria-label="Move up"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canReorder || idx < 0 || idx >= rows.length - 1}
              onClick={() => onMoveDown?.(r)}
              aria-label="Move down"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
        );
      },
    },
    {
      key: "subject",
      header: "Subject",
      cell: (r) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{r.subject_name ?? "—"}</p>
            {r.subject_is_active === false && (
              <Badge variant="destructive" className="text-[10px] font-normal">
                Inactive in catalog
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {r.subject_code ? `Code: ${r.subject_code}` : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      cell: (r) => (
        <span className="text-muted-foreground">{r.subject_code ?? "—"}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => {
        const t = r.subject_type ?? "core";
        return (
          <Badge
            variant="secondary"
            className={cn("font-normal", typeBadgeClass(t))}
          >
            {TYPE_LABEL[t] ?? t}
          </Badge>
        );
      },
    },
    {
      key: "teachers",
      header: "Teacher(s)",
      cell: (r) => {
        const list = r.teachers.filter((x) => x.is_active);
        const pickable = availableTeachers.filter(
          (t) => !list.some((a) => a.teacher_id === t.id)
        );
        const inactive = r.subject_is_active === false;
        return (
          <div className="flex max-w-[220px] flex-wrap items-center gap-1">
            {list.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              list.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/40 py-0.5 pl-2 pr-1 text-xs"
                  title={a.role}
                >
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[10px]">
                      {(a.teacher_name ?? "?")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{a.teacher_name ?? a.teacher_id}</span>
                  {a.role === "primary" && (
                    <span className="text-[10px] text-muted-foreground">(P)</span>
                  )}
                  {canManage && subjectTeachersEnabled && onRemoveTeacher && !inactive && (
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onRemoveTeacher(a.id)}
                      aria-label={`Remove ${a.teacher_name ?? "teacher"}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))
            )}
            {canManage && subjectTeachersEnabled && !inactive && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onAddTeacher(r)}
                title="Assign teacher (role)"
              >
                <SlidersHorizontal className="size-3.5" />
              </Button>
            )}
            {canManage && subjectTeachersEnabled && !inactive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2"
                    disabled={assigningTeacherFor === r.id}
                    title={
                      pickable.length === 0
                        ? "No teachers available"
                        : "Assign teacher"
                    }
                  >
                    {assigningTeacherFor === r.id ? (
                      "…"
                    ) : (
                      <>
                        <UserPlus className="size-3.5" />
                        Add
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  {pickable.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No more teachers to add
                    </div>
                  ) : (
                    pickable.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => onAssignTeacher(r.id, t.id)}
                      >
                        {t.name}
                        <span className="ml-1 text-muted-foreground">
                          {t.employee_id}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canManage && !subjectTeachersEnabled && (
              <span className="text-[10px] text-muted-foreground" title="Requires timetable feature">
                Timetable plan
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "periods",
      header: "Periods",
      cell: (r) => <span>{r.weekly_periods}</span>,
    },
    {
      key: "track",
      header: "Track",
      cell: (r) => (
        <Badge variant={r.is_mandatory ? "default" : "secondary"} className="font-normal">
          {r.is_mandatory ? "Core" : "Elective"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          variant={r.subject_is_active !== false ? "outline" : "destructive"}
          className="font-normal"
        >
          {r.subject_is_active !== false ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[100px]",
      cell: (r) => {
        const inactive = r.subject_is_active === false;
        return canManage ? (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={inactive}
              title={
                inactive
                  ? "Subject is inactive in the catalog. Reactivate it in Settings → Subject catalog."
                  : "Edit"
              }
              onClick={() => !inactive && onEdit(r)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(r)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      isLoading={isLoading}
      emptyMessage="No subjects assigned to this class"
    />
  );
}
