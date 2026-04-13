"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTeacher, useUpdateTeacher, useDeleteTeacher } from "@/hooks/useTeachers";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { TeacherSubjectsTab } from "@/components/teachers/TeacherSubjectsTab";
import { TeacherAvailabilityTab } from "@/components/teachers/TeacherAvailabilityTab";
import { TeacherLeavesTab } from "@/components/teachers/TeacherLeavesTab";
import { TeacherWorkloadTab } from "@/components/teachers/TeacherWorkloadTab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, Loader2, User, BookOpen, Calendar, ClipboardList, BarChart3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { teachersKeys } from "@/hooks/useTeachers";
import type { UpdateTeacherInput } from "@/types/teacher";

type TabKey = "info" | "subjects" | "availability" | "leaves" | "workload";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "info", label: "Info", icon: User },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "availability", label: "Availability", icon: Calendar },
  { key: "leaves", label: "Leaves", icon: ClipboardList },
  { key: "workload", label: "Workload", icon: BarChart3 },
];

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const { data: teacher, isLoading } = useTeacher(id ?? null);
  const updateMutation = useUpdateTeacher();
  const deleteMutation = useDeleteTeacher();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const initialTab = (searchParams?.get("tab") as TabKey | null) ?? "info";
  const [activeTab, setActiveTab] = useState<TabKey>(
    (["info", "subjects", "availability", "leaves", "workload"] as TabKey[]).includes(initialTab)
      ? initialTab
      : "info"
  );

  const refreshTeacher = () => {
    if (id) queryClient.invalidateQueries({ queryKey: teachersKeys.detail(id) });
  };

  const handleUpdate = async (data: UpdateTeacherInput) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, input: data });
      toast.success("Teacher updated");
      setEditOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update teacher");
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this teacher?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Teacher deleted");
      router.push("/teachers");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete teacher");
    }
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Teacher not found.</p>
        <Link href="/teachers">
          <Button variant="outline">Back to Teachers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teachers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {teacher.name}
            </h1>
            <p className="text-muted-foreground">
              {teacher.employee_id}
              {teacher.designation && ` • ${teacher.designation}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
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

      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? "secondary" : "ghost"}
            size="sm"
            className="rounded-b-none"
            onClick={() => setActiveTab(key)}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "info" && (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Employee and role details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Employee ID" value={teacher.employee_id} />
            <InfoRow label="Designation" value={teacher.designation} />
            <InfoRow label="Department" value={teacher.department} />
            <InfoRow label="Status" value={teacher.status} />
            <InfoRow label="Date of Joining" value={teacher.date_of_joining} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Email, phone, address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Email" value={teacher.email} />
            <InfoRow label="Phone" value={teacher.phone} />
            <InfoRow label="Address" value={teacher.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualifications</CardTitle>
            <CardDescription>Education and expertise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Qualification" value={teacher.qualification} />
            <InfoRow label="Specialization" value={teacher.specialization} />
            <InfoRow label="Experience (years)" value={teacher.experience_years} />
          </CardContent>
        </Card>

        {teacher.subjects && teacher.subjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>Teaching subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-primary/10 px-3 py-1 text-sm"
                  >
                    {s.name}
                    {s.code && ` (${s.code})`}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {activeTab === "subjects" && (
        <TeacherSubjectsTab teacherId={id} onRefresh={refreshTeacher} />
      )}
      {activeTab === "availability" && (
        <TeacherAvailabilityTab teacherId={id} />
      )}
      {activeTab === "leaves" && (
        <TeacherLeavesTab teacherId={id} />
      )}
      {activeTab === "workload" && (
        <TeacherWorkloadTab teacherId={id} />
      )}

      <TeacherFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={teacher}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
