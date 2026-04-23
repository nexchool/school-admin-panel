"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { teacherSubjectService } from "@/services/teacherConstraintService";
import { subjectsService } from "@/services/subjectsService";
import type { TeacherSubject } from "@/types/teacher";
import type { Subject } from "@/types/subject";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeacherSubjectsTabProps {
  teacherId: string;
  onRefresh: () => void;
}

export function TeacherSubjectsTab({ teacherId, onRefresh }: TeacherSubjectsTabProps) {
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeSubjectId, setRemoveSubjectId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, all] = await Promise.all([
        teacherSubjectService.getSubjects(teacherId),
        subjectsService.getSubjects(),
      ]);
      setSubjects(Array.isArray(subs) ? subs : []);
      setAllSubjects(Array.isArray(all) ? all : []);
    } catch {
      setSubjects([]);
      setAllSubjects([]);
      toast.error("Could not load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) loadData();
  }, [teacherId]);

  const assignedIds = new Set(subjects.map((s) => s.subject_id));
  const availableSubjects = allSubjects.filter((s) => !assignedIds.has(s.id));

  const handleAdd = async () => {
    if (!selectedSubjectId) {
      toast.error("Select a subject.");
      return;
    }
    setAdding(true);
    try {
      await teacherSubjectService.addSubject(teacherId, selectedSubjectId);
      await loadData();
      onRefresh();
      setModalOpen(false);
      setSelectedSubjectId("");
      toast.success("Subject assigned to teacher");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const performRemoveSubject = async () => {
    const subjectId = removeSubjectId;
    if (!subjectId) return;
    setRemoving(subjectId);
    try {
      await teacherSubjectService.removeSubject(teacherId, subjectId);
      await loadData();
      onRefresh();
      toast.success("Subject removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
      throw err;
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>Subjects this teacher can teach</CardDescription>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1" disabled={availableSubjects.length === 0}>
            <Plus className="size-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm"
                >
                  {s.subject_name ?? s.subject_id}
                  {s.subject_code && ` (${s.subject_code})`}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full p-0 text-destructive hover:text-destructive"
                    onClick={() => setRemoveSubjectId(s.subject_id)}
                    disabled={removing === s.subject_id}
                  >
                    {removing === s.subject_id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
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
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={adding || !selectedSubjectId}>
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeSubjectId}
        onOpenChange={(o) => !o && setRemoveSubjectId(null)}
        title="Remove this subject from the teacher?"
        confirmLabel="Remove"
        variant="destructive"
        loading={!!removeSubjectId && removing === removeSubjectId}
        onConfirm={performRemoveSubject}
      />
    </>
  );
}
