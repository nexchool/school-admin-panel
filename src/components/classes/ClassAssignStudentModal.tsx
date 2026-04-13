"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { classesService } from "@/services/classesService";
import type { Student } from "@/types/student";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClassAssignStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onAssigned: () => void;
}

export function ClassAssignStudentModal({
  open,
  onOpenChange,
  classId,
  onAssigned,
}: ClassAssignStudentModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (open && classId) {
      setLoading(true);
      classesService
        .getUnassignedStudents(classId)
        .then(setStudents)
        .catch(() => {
          setStudents([]);
          toast.error("Could not load students");
        })
        .finally(() => setLoading(false));
    }
  }, [open, classId]);

  const handleAssign = async (student: Student) => {
    setAssigning(student.id);
    try {
      await classesService.assignStudent(classId, student.id);
      onAssigned();
      onOpenChange(false);
      toast.success("Student added to class");
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
          <DialogTitle>Add Student to Class</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No unassigned students. All students are already in a class.
            </p>
          ) : (
            <ul className="space-y-1">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.admission_number}
                      {s.email && ` • ${s.email}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(s)}
                    disabled={assigning === s.id}
                  >
                    {assigning === s.id ? (
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
