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
import { MergeSectionModal } from "@/components/classes/MergeSectionModal";
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
  Merge,
} from "lucide-react";
import { toastError } from "@/lib/errorToast";
import { classLabel, gradeLabel } from "@/lib/gradeLevel";

type ClassDetailTab = "students" | "teachers" | "subjects" | "timetable";

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isFeatureEnabled } =
    useAuth();
  const timetableEnabled = isFeatureEnabled("timetable");
  const id = params?.id as string | undefined;
  const showSubjectsTab = hasAnyPermission([
    "class_subject.read",
    "class_subject.manage",
    "class.manage",
  ]);
  const [detailTab, setDetailTab] = useState<ClassDetailTab>("students");
  const { data: cls, isLoading, isError } = useClass(id ?? null);
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
  const [mergeOpen, setMergeOpen] = useState(false);
  // A teacher holds class.read and student.read.class, so this page renders for
  // them — but Edit, Delete, Add and Remove all answer 403. An action nobody
  // can perform should not be on screen; the server was already refusing, the
  // screen was the part that lied.
  const canManageClass = hasPermission("class.manage");
  const canManageStudents = hasPermission("student.update");
  const canManageTeachers = hasPermission("class_teacher.manage");
  // Both halves, because a merge does both: it retires a section and moves
  // every child in it. The server asks for the same pair, and `hasPermission`
  // applies the same `<resource>.manage` implication the server does — an
  // administrator holds `student.manage`, not `student.update` literally.
  const canMerge = hasAllPermissions(["class.manage", "student.update"]);
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
    department_id?: string | null;
  }) => {
    if (!id) return;
    // Toasts owned by useUpdateClass. On error the rejection propagates to the
    // edit modal, which keeps it open.
    await updateMutation.mutateAsync({ id, data });
    setEditOpen(false);
  };

  const performDeleteClass = async () => {
    if (!id) return;
    // Toasts owned by useDeleteClass; rejection propagates to the confirm dialog.
    await deleteMutation.mutateAsync(id);
    router.push("/classes");
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
      toastError(err, "Failed to remove");
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
      toastError(err, "Failed to remove");
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

  if (isError || !cls) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            This class isn&apos;t available
          </p>
          <p className="text-sm text-muted-foreground">
            You may not have access to this branch, or the record was removed.
          </p>
          <Link href="/classes">
            <Button variant="outline">Back to Classes</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Composed from grade and section. `name` is a nullable legacy label, empty
  // for every class created through the structured form, which is how this
  // page came to be titled "— A"; `display_name` is the server's own
  // composition and the fallback when a row has no grade.
  const gradePart = cls.grade_name ? gradeLabel(cls.grade_name) : null;
  const classTitle =
    gradePart && cls.section
      ? `${gradePart} · Section ${cls.section}`
      : classLabel(cls);
  // Where this class sits: programme, year, campus — the three that tell one
  // "Grade 1 · A" apart from the other.
  const classContext = [cls.programme_name, cls.academic_year, cls.school_unit_name]
    .filter(Boolean)
    .join(" · ");
  const merged = cls.merged_into;
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
    ...(timetableEnabled
      ? [{ id: "timetable" as const, label: "Timetable", icon: CalendarDays }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <EntityHeader
        icon={GraduationCap}
        title={classTitle}
        subtitle={classContext || undefined}
        badges={badges}
        backHref="/classes"
        backLabel="Back to Classes"
        onEdit={canManageClass ? handleEditOpen : undefined}
        onDelete={canManageClass ? () => setDeleteClassOpen(true) : undefined}
        isDeleting={deleteMutation.isPending}
      />

      {/* A merged section is reachable only by a direct link — it has left
          every list — so it has to explain itself on arrival. The banner is
          light-only, like the other advisory banners (calendar, setup): the
          app does not follow the OS colour scheme, so a media-based `dark:`
          variant renders a dark block on a light page. */}
      {merged ? (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Merge className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>
              This section was merged into{" "}
              <Link
                href={`/classes/${merged.into_class_id}`}
                className="font-medium underline underline-offset-2"
              >
                {merged.into_display_name ?? "another section"}
              </Link>
              {merged.merged_on ? ` on ${merged.merged_on}` : ""}
              {merged.merged_by_name ? ` by ${merged.merged_by_name}` : ""}. It
              takes no new students.
            </p>
            {merged.reason && (
              <p className="text-xs">Reason: {merged.reason}</p>
            )}
            <p className="text-xs">
              Its attendance, marks and reports stay here — they happened in
              this section.
            </p>
          </div>
        </div>
      ) : (
        canMerge && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMergeOpen(true)}
            >
              <Merge className="size-4" />
              Merge into another section
            </Button>
          </div>
        )
      )}

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
                {canManageStudents && (
                  <Button
                    size="sm"
                    onClick={() => setStudentPickerOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                )}
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
                        {canManageStudents && (
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
                        )}
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
                {canManageTeachers && (
                  <Button
                    size="sm"
                    onClick={() => setTeacherPickerOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                )}
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
                            {t.subject_name ??
                              (t.is_class_teacher ? "Class Teacher" : "Subject")}
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

          {timetableEnabled && detailTab === "timetable" && id && (
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

      {canMerge && !merged && (
        <MergeSectionModal
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          section={cls}
          onMerged={(intoClassId) => router.push(`/classes/${intoClassId}`)}
        />
      )}

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
