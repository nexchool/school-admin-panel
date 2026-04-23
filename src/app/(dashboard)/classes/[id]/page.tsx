"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useClass,
  useUpdateClass,
  useDeleteClass,
  classesKeys,
} from "@/hooks/useClasses";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { classesService } from "@/services/classesService";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { ClassAssignStudentModal } from "@/components/classes/ClassAssignStudentModal";
import { ClassAssignTeacherModal } from "@/components/classes/ClassAssignTeacherModal";
import { ClassSubjectsSection } from "@/modules/classes/components/ClassSubjectsSection";
import { ClassTimetableReadOnly } from "@/components/timetable/ClassTimetableReadOnly";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  EntityHeader,
  QuickStats,
  TabNav,
  type TabNavItem,
  type ProfileHeaderBadge,
  type QuickStatItem,
} from "@/components/detail";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  UserMinus,
  CalendarDays,
  GraduationCap,
  Users,
  BookOpen,
  User,
  Hash,
} from "lucide-react";

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
  const [availableTeachers, setAvailableTeachers] = useState<
    { id: string; name: string; employee_id: string }[]
  >([]);
  const updateMutation = useUpdateClass();
  const deleteMutation = useDeleteClass();
  const [editOpen, setEditOpen] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false);
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);
  const [removingTeacher, setRemovingTeacher] = useState<string | null>(null);
  const [deleteClassOpen, setDeleteClassOpen] = useState(false);
  const [removeStudentId, setRemoveStudentId] = useState<string | null>(null);
  const [removeTeacherId, setRemoveTeacherId] = useState<string | null>(null);

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

  const handleUpdate = async (data: {
    name: string;
    section: string;
    academic_year_id: string;
    teacher_id?: string;
  }) => {
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

  const performDeleteClass = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Class deleted");
      router.push("/classes");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete class");
      throw e;
    }
  };

  const performRemoveStudent = async () => {
    const studentId = removeStudentId;
    if (!id || !studentId) return;
    setRemovingStudent(studentId);
    try {
      await classesService.removeStudent(id, studentId);
      refreshClass();
      toast.success("Student removed from class");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
      throw err;
    } finally {
      setRemovingStudent(null);
    }
  };

  const performRemoveTeacher = async () => {
    const teacherId = removeTeacherId;
    if (!id || !teacherId) return;
    setRemovingTeacher(teacherId);
    try {
      await classesService.removeTeacher(id, teacherId);
      refreshClass();
      toast.success("Teacher removed from class");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
      throw err;
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

  const classTitle = cls.section ? `${cls.name} — ${cls.section}` : cls.name;
  const studentCount = cls.students?.length ?? 0;
  const teacherCount = cls.teachers?.length ?? 0;

  const badges: ProfileHeaderBadge[] = [];
  if (cls.academic_year) {
    badges.push({
      label: cls.academic_year,
      variant: "secondary",
      icon: CalendarDays,
    });
  }
  if (cls.teacher_name) {
    badges.push({
      label: `Class Teacher: ${cls.teacher_name}`,
      variant: "outline",
      icon: User,
    });
  }

  const statsItems: QuickStatItem[] = [
    { icon: Hash, label: "Section", value: cls.section },
    { icon: CalendarDays, label: "Academic Year", value: cls.academic_year },
    { icon: User, label: "Class Teacher", value: cls.teacher_name ?? "Unassigned" },
    { icon: Users, label: "Students", value: studentCount },
    { icon: BookOpen, label: "Subject Teachers", value: teacherCount },
  ];

  const tabs: TabNavItem<ClassDetailTab>[] = [
    { id: "students", label: "Students", icon: Users, badge: studentCount },
    { id: "teachers", label: "Teachers", icon: User, badge: teacherCount },
    ...(showSubjectsTab
      ? [{ id: "subjects" as const, label: "Subjects", icon: BookOpen }]
      : []),
    { id: "timetable", label: "Timetable", icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <EntityHeader
        icon={GraduationCap}
        title={classTitle}
        subtitle={cls.academic_year ?? undefined}
        badges={badges}
        backHref="/classes"
        backLabel="Back to Classes"
        onEdit={handleEditOpen}
        onDelete={() => setDeleteClassOpen(true)}
        isDeleting={deleteMutation.isPending}
      />

      <QuickStats items={statsItems} />

      <div className="space-y-5 pt-2">
        <TabNav tabs={tabs} active={detailTab} onChange={setDetailTab} />

        <div className="min-h-[300px]">
          {detailTab === "students" && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="size-4 text-muted-foreground" />
                    Students
                  </CardTitle>
                  <CardDescription>
                    {studentCount} student{studentCount === 1 ? "" : "s"} enrolled
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setStudentPickerOpen(true)}
                  className="gap-1"
                >
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
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => router.push(`/students/${s.id}`)}
                        >
                          <p className="truncate font-medium text-sm hover:text-primary">
                            {s.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.admission_number}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setRemoveStudentId(s.id)}
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
                  <EmptyState message="No students assigned yet." />
                )}
              </CardContent>
            </Card>
          )}

          {detailTab === "teachers" && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4 text-muted-foreground" />
                    Teachers
                  </CardTitle>
                  <CardDescription>
                    Subject teachers assigned to this class
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setTeacherPickerOpen(true)}
                  className="gap-1"
                >
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
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() =>
                            router.push(`/teachers/${t.teacher_id}`)
                          }
                        >
                          <p className="truncate font-medium text-sm hover:text-primary">
                            {t.teacher_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.subject_name ?? "Subject"}
                            {t.teacher_employee_id &&
                              ` • ${t.teacher_employee_id}`}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setRemoveTeacherId(t.teacher_id)}
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
                  <EmptyState message="No teachers assigned yet." />
                )}
              </CardContent>
            </Card>
          )}

          {showSubjectsTab && detailTab === "subjects" && id && (
            <ClassSubjectsSection classId={id} onRefresh={refreshClass} />
          )}

          {detailTab === "timetable" && id && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    Timetable
                  </CardTitle>
                  <CardDescription>
                    Active schedule for this class
                  </CardDescription>
                </div>
                <Link href={`/timetable/${id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <CalendarDays className="size-4" />
                    Manage timetable
                  </Button>
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

      <ConfirmDialog
        open={deleteClassOpen}
        onOpenChange={setDeleteClassOpen}
        title="Delete this class?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={performDeleteClass}
      />

      <ConfirmDialog
        open={!!removeStudentId}
        onOpenChange={(o) => !o && setRemoveStudentId(null)}
        title="Remove student from class?"
        description="The student will be unenrolled from this class."
        confirmLabel="Remove"
        variant="destructive"
        loading={!!removeStudentId && removingStudent === removeStudentId}
        onConfirm={performRemoveStudent}
      />

      <ConfirmDialog
        open={!!removeTeacherId}
        onOpenChange={(o) => !o && setRemoveTeacherId(null)}
        title="Remove teacher from class?"
        description="This removes the subject teacher assignment for this class."
        confirmLabel="Remove"
        variant="destructive"
        loading={!!removeTeacherId && removingTeacher === removeTeacherId}
        onConfirm={performRemoveTeacher}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
  );
}
