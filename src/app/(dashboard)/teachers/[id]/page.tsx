"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  teachersKeys,
} from "@/hooks/useTeachers";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { TeacherSubjectsTab } from "@/components/teachers/TeacherSubjectsTab";
import { TeacherAvailabilityTab } from "@/components/teachers/TeacherAvailabilityTab";
import { TeacherLeavesTab } from "@/components/teachers/TeacherLeavesTab";
import { TeacherWorkloadTab } from "@/components/teachers/TeacherWorkloadTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ProfileHeader,
  QuickStats,
  TabNav,
  SectionCard,
  DetailTable,
  formatDate,
  getStatusVariant,
  type TabNavItem,
  type ProfileHeaderBadge,
  type QuickStatItem,
} from "@/components/detail";
import {
  Loader2,
  User,
  BookOpen,
  Calendar,
  ClipboardList,
  BarChart3,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Hash,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { Teacher, UpdateTeacherInput } from "@/types/teacher";

type TabKey = "info" | "subjects" | "availability" | "leaves" | "workload";

const TABS: TabNavItem<TabKey>[] = [
  { id: "info", label: "Info", icon: User },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "availability", label: "Availability", icon: Calendar },
  { id: "leaves", label: "Leaves", icon: ClipboardList },
  { id: "workload", label: "Workload", icon: BarChart3 },
];

const TAB_IDS: TabKey[] = TABS.map((t) => t.id);

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
    TAB_IDS.includes(initialTab) ? initialTab : "info"
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

  const badges: ProfileHeaderBadge[] = [];
  if (teacher.designation) {
    badges.push({
      label: teacher.designation,
      variant: "secondary",
      icon: Briefcase,
    });
  }
  if (teacher.department) {
    badges.push({
      label: teacher.department,
      variant: "outline",
      icon: Building2,
    });
  }
  if (teacher.status) {
    badges.push({
      label: teacher.status,
      variant: getStatusVariant(teacher.status),
    });
  }

  const statsItems: QuickStatItem[] = [
    { icon: Hash, label: "Employee ID", value: teacher.employee_id },
    { icon: Briefcase, label: "Designation", value: teacher.designation },
    { icon: Building2, label: "Department", value: teacher.department },
    {
      icon: Calendar,
      label: "Joined",
      value: formatDate(teacher.date_of_joining),
    },
    {
      icon: GraduationCap,
      label: "Experience",
      value:
        teacher.experience_years != null
          ? `${teacher.experience_years} yrs`
          : undefined,
    },
    {
      icon: BookOpen,
      label: "Subjects",
      value: teacher.subjects?.length ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <ProfileHeader
        name={teacher.name}
        subtitle={`Employee ID: ${teacher.employee_id}`}
        profilePicture={teacher.profile_picture}
        badges={badges}
        backHref="/teachers"
        backLabel="Back to Teachers"
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      <QuickStats items={statsItems} />

      <div className="space-y-5 pt-2">
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <div className="min-h-[300px]">
          {activeTab === "info" && <InfoTab teacher={teacher} />}
          {activeTab === "subjects" && (
            <TeacherSubjectsTab teacherId={id} onRefresh={refreshTeacher} />
          )}
          {activeTab === "availability" && (
            <TeacherAvailabilityTab teacherId={id} />
          )}
          {activeTab === "leaves" && <TeacherLeavesTab teacherId={id} />}
          {activeTab === "workload" && <TeacherWorkloadTab teacherId={id} />}
        </div>
      </div>

      <TeacherFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={teacher}
        onSubmit={handleUpdate}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info tab
// ---------------------------------------------------------------------------

function InfoTab({ teacher }: { teacher: Teacher }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Basic Information"
        description="Employee and role details"
        icon={User}
      >
        <DetailTable
          rows={[
            ["Full Name", teacher.name],
            ["Employee ID", teacher.employee_id],
            ["Designation", teacher.designation],
            ["Department", teacher.department],
            ["Status", teacher.status],
            ["Date of Joining", formatDate(teacher.date_of_joining)],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Contact"
        description="Email, phone, address"
        icon={Mail}
      >
        <DetailTable
          rows={[
            ["Email", teacher.email],
            ["Phone", teacher.phone],
            ["Address", teacher.address],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Qualifications"
        description="Education and expertise"
        icon={GraduationCap}
      >
        <DetailTable
          rows={[
            ["Qualification", teacher.qualification],
            ["Specialization", teacher.specialization],
            [
              "Experience",
              teacher.experience_years != null
                ? `${teacher.experience_years} year${
                    teacher.experience_years === 1 ? "" : "s"
                  }`
                : undefined,
            ],
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Subjects"
        description="Teaching subjects"
        icon={BookOpen}
      >
        {teacher.subjects && teacher.subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {teacher.subjects.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-sm font-normal">
                {s.name}
                {s.code && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {s.code}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        ) : (
          <EmptyInline message="No subjects assigned yet. Use the Subjects tab to add expertise." />
        )}
      </SectionCard>
    </div>
  );
}

function EmptyInline({ message }: { message: string }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="py-4 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
