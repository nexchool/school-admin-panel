"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassItem } from "@/types/class";
import type { AcademicYear } from "@/services/academicYearsService";
import { toast } from "sonner";

interface TeacherOption {
  id: string;
  name: string;
  employee_id?: string;
}

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ClassItem;
  academicYears: AcademicYear[];
  availableTeachers: TeacherOption[];
  onSubmit: (data: { name: string; section: string; academic_year_id: string; teacher_id?: string }) => Promise<void>;
}

export function ClassFormModal({
  open,
  onOpenChange,
  initialData,
  academicYears,
  availableTeachers,
  onSubmit,
}: ClassFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [section, setSection] = useState(initialData?.section ?? "");
  const [academicYearId, setAcademicYearId] = useState(
    initialData?.academic_year_id ?? academicYears[0]?.id ?? ""
  );
  const NONE_VALUE = "__none__";
  const [teacherId, setTeacherId] = useState(
    initialData?.teacher_id || NONE_VALUE
  );
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(initialData?.name ?? "");
    setSection(initialData?.section ?? "");
    setAcademicYearId(initialData?.academic_year_id ?? academicYears[0]?.id ?? "");
    setTeacherId(initialData?.teacher_id || NONE_VALUE);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !section.trim() || !academicYearId) {
      toast.error("Name, section, and academic year are required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        section: section.trim(),
        academic_year_id: academicYearId,
        teacher_id: teacherId === NONE_VALUE ? undefined : teacherId,
      });
      handleClose(false);
    } catch {
      // Parent handler toasts API errors and rethrows when applicable.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Class 10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. A"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select
              value={academicYearId}
              onValueChange={setAcademicYearId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class Teacher (optional)</Label>
            <Select value={teacherId || NONE_VALUE} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {availableTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : initialData ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
