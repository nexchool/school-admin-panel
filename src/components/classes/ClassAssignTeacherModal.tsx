"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classesService } from "@/services/classesService";
import { subjectsService } from "@/services/subjectsService";
import type { Teacher } from "@/types/teacher";
import type { Subject } from "@/types/subject";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClassAssignTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onAssigned: () => void;
}

export function ClassAssignTeacherModal({
  open,
  onOpenChange,
  classId,
  onAssigned,
}: ClassAssignTeacherModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  useEffect(() => {
    if (open && classId) {
      setLoading(true);
      Promise.all([
        classesService.getUnassignedTeachers(classId),
        subjectsService.getSubjects(),
      ])
        .then(([t, s]) => {
          setTeachers(t);
          setSubjects(s);
          setSelectedSubjectId("");
        })
        .catch(() => {
          setTeachers([]);
          setSubjects([]);
          toast.error("Could not load teachers or subjects");
        })
        .finally(() => setLoading(false));
    }
  }, [open, classId]);

  const handleAssign = async (teacher: Teacher) => {
    if (!selectedSubjectId) {
      toast.error("Please select a subject first.");
      return;
    }
    setAssigning(teacher.id);
    try {
      await classesService.assignTeacher(classId, teacher.id, selectedSubjectId);
      onAssigned();
      onOpenChange(false);
      toast.success("Teacher assigned to class");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Teacher to Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject first" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.code && ` (${s.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No available teachers to assign. All teachers may already be assigned to this class.
            </p>
          ) : (
            <ul className="space-y-1">
              {teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.employee_id}
                      {t.department && ` • ${t.department}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(t)}
                    disabled={assigning === t.id || !selectedSubjectId}
                  >
                    {assigning === t.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
