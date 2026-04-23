"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classesService } from "@/services/classesService";
import { subjectsService } from "@/services/subjectsService";
import type { SubjectLoad } from "@/types/class";
import type { Subject } from "@/types/subject";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClassSubjectLoadSectionProps {
  classId: string;
  onRefresh: () => void;
}

export function ClassSubjectLoadSection({
  classId,
  onRefresh,
}: ClassSubjectLoadSectionProps) {
  const [loads, setLoads] = useState<SubjectLoad[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<SubjectLoad | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [weeklyPeriods, setWeeklyPeriods] = useState("4");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteLoadId, setDeleteLoadId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        classesService.getSubjectLoads(classId),
        subjectsService.getSubjects(),
      ]);
      setLoads(l);
      setSubjects(s);
    } catch {
      setLoads([]);
      setSubjects([]);
      toast.error("Could not load subject loads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) loadData();
  }, [classId]);

  const openCreate = () => {
    setEditingLoad(null);
    setSubjectId("");
    setWeeklyPeriods("4");
    setModalOpen(true);
  };

  const openEdit = (load: SubjectLoad) => {
    setEditingLoad(load);
    setSubjectId(load.subject_id);
    setWeeklyPeriods(String(load.weekly_periods));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const periods = parseInt(weeklyPeriods, 10);
    if (isNaN(periods) || periods < 1) {
      toast.error("Weekly periods must be at least 1");
      return;
    }
    setSubmitting(true);
    try {
      if (editingLoad) {
        await classesService.updateSubjectLoad(classId, editingLoad.id, periods);
      } else {
        if (!subjectId) {
          toast.error("Select a subject");
          setSubmitting(false);
          return;
        }
        const assignedIds = new Set(loads.map((l) => l.subject_id));
        if (assignedIds.has(subjectId)) {
          toast.error("This subject already has a load configured.");
          setSubmitting(false);
          return;
        }
        await classesService.createSubjectLoad(classId, {
          subject_id: subjectId,
          weekly_periods: periods,
        });
      }
      await loadData();
      onRefresh();
      setModalOpen(false);
      toast.success(editingLoad ? "Subject load updated" : "Subject load added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const performDeleteLoad = async () => {
    const loadId = deleteLoadId;
    if (!loadId) return;
    setDeleting(loadId);
    try {
      await classesService.deleteSubjectLoad(classId, loadId);
      await loadData();
      onRefresh();
      toast.success("Subject load removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      throw err;
    } finally {
      setDeleting(null);
    }
  };

  const assignedSubjectIds = new Set(loads.map((l) => l.subject_id));
  const availableSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id) || editingLoad?.subject_id === s.id);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Subject Load</CardTitle>
            <CardDescription>
              Weekly periods per subject for timetable generation
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1">
            <Plus className="size-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : loads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subject loads. Add subjects and weekly periods for timetable.
            </p>
          ) : (
            <div className="space-y-2">
              {loads.map((load) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {load.subject_name ?? load.subject_id}
                      {load.subject_code && ` (${load.subject_code})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {load.weekly_periods} periods/week
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(load)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteLoadId(load.id)}
                      disabled={deleting === load.id}
                    >
                      {deleting === load.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLoad ? "Edit Subject Load" : "Add Subject Load"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={subjectId}
                onValueChange={setSubjectId}
                disabled={!!editingLoad}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.code && ` (${s.code})`}
                    </SelectItem>
                  ))}
                  {availableSubjects.length === 0 && !editingLoad && (
                    <SelectItem value="__none__" disabled>
                      No subjects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {editingLoad && (
                <p className="text-xs text-muted-foreground">
                  Subject cannot be changed when editing.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Weekly Periods</Label>
              <Input
                type="number"
                min={1}
                max={40}
                value={weeklyPeriods}
                onChange={(e) => setWeeklyPeriods(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editingLoad ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteLoadId}
        onOpenChange={(o) => !o && setDeleteLoadId(null)}
        title="Remove this subject load?"
        description="Timetable generation may need this configuration updated afterward."
        confirmLabel="Remove"
        variant="destructive"
        loading={!!deleteLoadId && deleting === deleteLoadId}
        onConfirm={performDeleteLoad}
      />
    </>
  );
}
