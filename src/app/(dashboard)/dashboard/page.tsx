"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { useClasses } from "@/hooks/useClasses";
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardCheck,
  Wallet,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks";

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const canManageSubjectCatalog = hasPermission("subject.manage");
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: classes = [] } = useClasses();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to School ERP Admin. Manage students, teachers, and more.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">
              Total enrolled students
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{teachers.length}</p>
            <p className="text-xs text-muted-foreground">
              Active teaching staff
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{classes.length}</p>
            <p className="text-xs text-muted-foreground">
              Active classes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common admin tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/students" className="flex items-center gap-2">
                <GraduationCap className="size-4" />
                Students
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/teachers" className="gap-2">
                <Users className="size-4" />
                Teachers
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/classes" className="gap-2">
                <BookOpen className="size-4" />
                Classes
              </Link>
            </Button>
            {canManageSubjectCatalog && (
              <Button asChild variant="outline">
                <Link href="/dashboard/settings/subjects" className="gap-2">
                  <BookOpen className="size-4" />
                  Subject catalog
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/attendance" className="gap-2">
                <ClipboardCheck className="size-4" />
                Attendance
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/finance" className="gap-2">
                <Wallet className="size-4" />
                Finance
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/holidays" className="gap-2">
                <Calendar className="size-4" />
                Holidays
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
