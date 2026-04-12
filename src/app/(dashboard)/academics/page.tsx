"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { academicYearsService } from "@/services/academicYearsService";
import {
  BookOpen,
  BookMarked,
  ClipboardCheck,
  School,
  CalendarDays,
  Settings2,
  ChevronRight,
  Loader2,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks";

const statCard = (label: string, value: number | undefined, loading: boolean) => (
  <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      <School className="h-5 w-5 text-primary" />
    </div>
    <div>
      <p className="text-xl font-semibold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (value ?? 0)}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default function AcademicsPage() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const canManageSubjects = hasPermission("subject.manage");
  const canManageSettings = hasPermission("class.manage");
  const canManageBells = hasAnyPermission(["academics.manage", "timetable.manage"]);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["academics", "overview"],
    queryFn: () => academicYearsService.getOverview(),
  });

  const sections = [
    {
      href: "/classes",
      label: "Classes",
      icon: BookOpen,
      description: "Manage classes, enroll students, assign teachers and subjects",
      show: true,
    },
    {
      href: "/timetable",
      label: "Timetable",
      icon: CalendarDays,
      description: "Build, draft and publish class schedules with conflict detection",
      show: true,
    },
    {
      href: "/attendance",
      label: "Attendance",
      icon: ClipboardCheck,
      description: "Mark and review student attendance by class or period",
      show: true,
    },
    {
      href: "/academics/bell-schedules",
      label: "Bell schedules",
      icon: Bell,
      description: "Define daily period timings — create one schedule per school division",
      show: canManageBells,
    },
    {
      href: "/academics/subjects",
      label: "Subject catalog",
      icon: BookMarked,
      description: "Master list of subjects — create and edit before assigning to classes",
      show: canManageSubjects,
    },
    {
      href: "/academics/settings",
      label: "Academic settings",
      icon: Settings2,
      description: "Default working days, default bell schedule, and permissions",
      show: canManageSettings,
    },
  ].filter((s) => s.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Academics</h1>
        <p className="text-sm text-muted-foreground">
          Central hub for classes, schedules, attendance and academic configuration.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCard("Classes", overview?.total_classes, isLoading)}
        {statCard("Subjects", overview?.total_subjects, isLoading)}
      </div>

      {/* Nav cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ href, label, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
