"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Trash2 } from "lucide-react";
import type { TimetableEntry, ClassSubjectOffering, SubjectTeacherAssignment } from "@/types/timetable";

const DOW_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classId: string;
  versionId: string;
  day: number;
  period: number;
  editing: TimetableEntry | null;
  subjects: ClassSubjectOffering[];
  subjectTeachers: SubjectTeacherAssignment[];
  workingDays: number[];
  onSave: (body: {
    timetable_version_id: string;
    class_subject_id: string;
    teacher_id: string;
    day_of_week: number;
    period_number: number;
    room: string | null;
  }) => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
}

export function EntryDialog({
  open,
  onOpenChange,
  versionId,
  editing,
  subjects,
  subjectTeachers,
  workingDays,
  day: initDay,
  period: initPeriod,
  onSave,
  onDelete,
}: Props) {
  const [day, setDay] = useState(initDay);
  const [period, setPeriod] = useState(initPeriod);
  const [csId, setCsId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDay(initDay);
      setPeriod(initPeriod);
      setCsId(editing?.class_subject_id ?? subjects[0]?.id ?? "");
      setTeacherId(editing?.teacher_id ?? "");
      setRoom(editing?.room ?? "");
      setError(null);
    }
  }, [open, editing, initDay, initPeriod, subjects]);

  const teachersForCs = useMemo(
    () => subjectTeachers.filter((t) => t.class_subject_id === csId),
    [csId, subjectTeachers]
  );

  const handleSubjectChange = (id: string) => {
    setCsId(id);
    const primary = subjectTeachers.find(
      (t) => t.class_subject_id === id && t.role === "primary"
    );
    setTeacherId(primary?.teacher_id ?? subjectTeachers.find((t) => t.class_subject_id === id)?.teacher_id ?? "");
  };

  const handleSave = async () => {
    if (!csId) { setError("Select a subject."); return; }
    if (!teacherId) { setError("Select a teacher."); return; }
    setBusy(true);
    setError(null);
    try {
      await onSave({
        timetable_version_id: versionId,
        class_subject_id: csId,
        teacher_id: teacherId,
        day_of_week: day,
        period_number: period,
        room: room.trim() || null,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !onDelete) return;
    if (!confirm("Remove this timetable entry?")) return;
    setBusy(true);
    try {
      await onDelete(editing.id);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit entry" : "Add entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Day */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Day</Label>
            <div className="flex flex-wrap gap-1.5">
              {workingDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={cn(
                    "rounded border px-3 py-1.5 text-xs font-medium transition-colors",
                    day === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {DOW_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label htmlFor="period" className="text-xs text-muted-foreground">Period #</Label>
            <Input
              id="period"
              type="number"
              min={1}
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value, 10) || 1)}
              className="w-24"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Subject *</Label>
            {subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active subjects for this class.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSubjectChange(s.id)}
                    className={cn(
                      "rounded border px-3 py-1.5 text-xs font-medium transition-colors",
                      csId === s.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {s.subject_name ?? s.subject_code ?? s.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teacher */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Teacher *</Label>
            {csId && teachersForCs.length === 0 ? (
              <p className="text-xs text-amber-600">No teachers assigned to this subject. Assign a teacher first.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teachersForCs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeacherId(t.teacher_id)}
                    className={cn(
                      "rounded border px-3 py-1.5 text-xs font-medium transition-colors",
                      teacherId === t.teacher_id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {t.teacher_name ?? t.teacher_id}
                    {t.role === "primary" && (
                      <span className="ml-1 text-muted-foreground/60">(primary)</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label htmlFor="room" className="text-xs text-muted-foreground">Room (optional)</Label>
            <Input
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. 101"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex-row items-center justify-between">
          <div>
            {editing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={busy}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Remove
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={busy || !csId || !teacherId}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
