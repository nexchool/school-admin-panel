"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClass, useUpdateClass, useDeleteClass } from "@/hooks/useClasses";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useQueryClient } from "@tanstack/react-query";
import { classesService } from "@/services/classesService";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { ClassAssignStudentModal } from "@/components/classes/ClassAssignStudentModal";
import { ClassAssignTeacherModal } from "@/components/classes/ClassAssignTeacherModal";
import { ClassSubjectsSection } from "@/modules/classes/components/ClassSubjectsSection";
import { ClassTimetableReadOnly } from "@/components/timetable/ClassTimetableReadOnly";
import { useAuth } from "@/components/providers/AuthProvider";
import { classesKeys } from "@/hooks/useClasses";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Loader2, Plus, UserMinus, CalendarDays } from "lucide-react";
import { useState } from "react";

type ClassDetailTab = "students" | "teachers" | "subjects" | "timetable";

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasAnyPermission } = useAuth();
  const id = params?.id as string | undefined;
  const showSubjectsTab = hasAnyPermission([
    "class_subject.read",
    "class_subject.manage",
    "class.manage",
  ]);
  const [detailTab, setDetailTab] = useState<ClassDetailTab>("students");
  const { data: cls, isLoading } = useClass(id ?? null);
  const { data: academicYears = [] } = useAcademicYears(false);
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string; name: string; employee_id: string }[]>([]);
  const updateMutation = useUpdateClass();
  const deleteMutation = useDeleteClass();
  const [editOpen, setEditOpen] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false);
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);
  const [removingTeacher, setRemovingTeacher] = useState<string | null>(null);

  const refreshClass = () => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: classesKeys.detail(id) });
    }
  };

  const loadTeachers = async () => {
    try {
      const t = await classesService.getAvailableClassTeachers(id);
      setAvailableTeachers(t);
    } catch {
      setAvailableTeachers([]);
      toast.error("Could not load teachers for this form");
    }
  };

  const handleEditOpen = () => {
    loadTeachers();
    setEditOpen(true);
  };

  const handleUpdate = async (data: { name: string; section: string; academic_year_id: string; teacher_id?: string }) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, data });
      toast.success("Class updated");
      setEditOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update class");
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this class?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Class deleted");
      router.push("/classes");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete class");
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!id || !confirm("Remove this student from the class?")) return;
    setRemovingStudent(studentId);
    try {
      await classesService.removeStudent(id, studentId);
      refreshClass();
      toast.success("Student removed from class");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingStudent(null);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!id || !confirm("Remove this teacher from the class?")) return;
    setRemovingTeacher(teacherId);
    try {
      await classesService.removeTeacher(id, teacherId);
      refreshClass();
      toast.success("Teacher removed from class");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingTeacher(null);
    }
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Class not found.</p>
        <Link href="/classes">
          <Button variant="outline">Back to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {cls.name} - {cls.section}
            </h1>
            <p className="text-muted-foreground">
              {cls.academic_year ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditOpen} className="gap-2">
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Information</CardTitle>
            <CardDescription>Basic class details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={cls.name} />
            <InfoRow label="Section" value={cls.section} />
            <InfoRow label="Academic Year" value={cls.academic_year} />
            <InfoRow label="Class Teacher" value={cls.teacher_name} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 border-b border-border">
            <button
              type="button"
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                detailTab === "students"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setDetailTab("students")}
            >
              Students
            </button>
            <button
              type="button"
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                detailTab === "teachers"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setDetailTab("teachers")}
            >
              Teachers
            </button>
            {showSubjectsTab && (
              <button
                type="button"
                className={cn(
                  "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  detailTab === "subjects"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setDetailTab("subjects")}
              >
                Subjects
              </button>
            )}
            <button
              type="button"
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                detailTab === "timetable"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setDetailTab("timetable")}
            >
              <CalendarDays className="size-3.5" />
              Timetable
            </button>
          </div>

          {detailTab === "students" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Students</CardTitle>
                  <CardDescription>
                    {cls.students?.length ?? 0} students enrolled
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setStudentPickerOpen(true)} className="gap-1">
                  <Plus className="size-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {cls.students && cls.students.length > 0 ? (
                  <ul className="space-y-2">
                    {cls.students.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.admission_number}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveStudent(s.id)}
                          disabled={removingStudent === s.id}
                        >
                          {removingStudent === s.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <UserMinus className="size-4" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No students assigned yet.</p>
                )}
              </CardContent>
            </Card>
          )}

          {detailTab === "teachers" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Teachers</CardTitle>
                  <CardDescription>
                    Subject teachers assigned to this class
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setTeacherPickerOpen(true)} className="gap-1">
                  <Plus className="size-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {cls.teachers && cls.teachers.length > 0 ? (
                  <ul className="space-y-2">
                    {cls.teachers.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="font-medium">{t.teacher_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.subject_name ?? "Subject"}
                            {t.teacher_employee_id && ` • ${t.teacher_employee_id}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveTeacher(t.teacher_id)}
                          disabled={removingTeacher === t.teacher_id}
                        >
                          {removingTeacher === t.teacher_id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <UserMinus className="size-4" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
                )}
              </CardContent>
            </Card>
          )}

          {showSubjectsTab && detailTab === "subjects" && id && (
            <ClassSubjectsSection classId={id} onRefresh={refreshClass} />
          )}

          {detailTab === "timetable" && id && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Timetable</CardTitle>
                  <CardDescription>Active schedule for this class</CardDescription>
                </div>
                <Link href={`/timetable/${id}`}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <CalendarDays className="size-3.5" />
                    Manage timetable
                  </button>
                </Link>
              </CardHeader>
              <CardContent>
                <ClassTimetableReadOnly classId={id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ClassFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={cls}
        academicYears={academicYears}
        availableTeachers={availableTeachers}
        onSubmit={handleUpdate}
      />

      <ClassAssignStudentModal
        open={studentPickerOpen}
        onOpenChange={setStudentPickerOpen}
        classId={id}
        onAssigned={refreshClass}
      />

      <ClassAssignTeacherModal
        open={teacherPickerOpen}
        onOpenChange={setTeacherPickerOpen}
        classId={id}
        onAssigned={refreshClass}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
