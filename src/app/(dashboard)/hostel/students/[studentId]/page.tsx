"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  Phone,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useAllocations,
  useCheckoutAllocation,
  useGatepasses,
  useHostel,
  useRoom,
  useStudentAllocation,
  useVisitorLogs,
} from "@/hooks/useHostel";
import { useStudent } from "@/hooks/useStudents";

import type {
  HostelAllocation,
  HostelGatepass,
  HostelVisitorLog,
} from "@/services/hostelService";

/**
 * Screen 4 — Warden's Student Detail.
 *
 * One-page view with everything a warden needs to make a decision about a
 * student: profile + emergency contacts + medical notes, current bed
 * allocation, allocation history, fee status (read-only link to the
 * finance module), recent gatepasses and visitor logs, plus a placeholder
 * for future disciplinary notes.
 *
 * Data:
 *   - useStudent(id)                — profile / parent / medical
 *   - useStudentAllocation(id)      — current active allocation only
 *   - useAllocations({student_id})  — full allocation history
 *   - useGatepasses({student_id})   — recent gatepasses
 *   - useVisitorLogs({student_id})  — recent visitors
 */
export default function HostelStudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const studentQuery = useStudent(studentId);
  const allocationQuery = useStudentAllocation(studentId);
  const allocationsHistoryQuery = useAllocations({ student_id: studentId });
  const gatepassQuery = useGatepasses({ student_id: studentId });
  const visitorLogsQuery = useVisitorLogs({ student_id: studentId });
  const checkoutAllocation = useCheckoutAllocation();

  // Resolve hostel + room name for the current allocation card.
  const hostelQuery = useHostel(allocationQuery.data?.hostel_id);
  const roomQuery = useRoom(allocationQuery.data?.room_id);

  // Sorted slices for display.
  const recentGatepasses = useMemo(
    () => (gatepassQuery.data?.gatepasses ?? []).slice(0, 5),
    [gatepassQuery.data]
  );
  const recentVisitorLogs = useMemo(
    () => (visitorLogsQuery.data?.visitor_logs ?? []).slice(0, 5),
    [visitorLogsQuery.data]
  );

  const student = studentQuery.data;

  if (studentQuery.isLoading) {
    return <PageSkeleton />;
  }
  if (studentQuery.isError || !student) {
    return (
      <Card className="m-6">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-destructive">Student not found.</p>
          <Button asChild variant="outline">
            <Link href="/hostel">
              <ChevronLeft className="mr-2 size-4" /> Back to hostels
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/hostel"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Hostels
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {student.name}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card (1/3 col) */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <Avatar className="size-24">
              {student.profile_picture ? (
                <AvatarImage
                  src={student.profile_picture}
                  alt={student.name}
                />
              ) : (
                <AvatarFallback className="text-xl">
                  {student.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{student.name}</p>
              <p className="text-sm text-muted-foreground">
                {student.admission_number}
                {student.class_name && ` · ${student.class_name}`}
                {student.roll_number != null && ` · Roll ${student.roll_number}`}
              </p>
            </div>

            <div className="w-full space-y-2 pt-2 text-left">
              <ProfileRow icon={CalendarDays} label="DOB" value={student.date_of_birth} />
              <ProfileRow icon={Users} label="Gender" value={student.gender} />
              <ProfileRow icon={Stethoscope} label="Blood group" value={student.blood_group} />
              <ProfileRow
                icon={Phone}
                label="Phone"
                value={student.phone || student.guardian_phone}
              />
              <ProfileRow
                icon={ShieldAlert}
                label="Guardian"
                value={
                  student.guardian_name
                    ? `${student.guardian_name}${
                        student.guardian_relationship
                          ? ` (${student.guardian_relationship})`
                          : ""
                      }`
                    : undefined
                }
              />
            </div>

            {(student.medical_allergies || student.medical_conditions) && (
              <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="mb-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="size-3.5" /> Medical notes
                </p>
                {student.medical_allergies && (
                  <p>Allergies: {student.medical_allergies}</p>
                )}
                {student.medical_conditions && (
                  <p>Conditions: {student.medical_conditions}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Current allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {allocationQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : allocationQuery.data ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-medium">
                      <Building2 className="size-4 text-muted-foreground" />
                      {hostelQuery.data?.name ?? "Hostel"} ·{" "}
                      <span className="text-muted-foreground">
                        Room {roomQuery.data?.room ?
                          roomQuery.data.room.room_number : "—"}
                      </span>{" "}
                      ·{" "}
                      <BedDouble className="size-4 text-muted-foreground" />
                      {roomQuery.data?.beds.find(
                        (b) => b.id === allocationQuery.data?.bed_id
                      )?.bed_number ?? "Bed"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Since {new Date(allocationQuery.data.check_in_at).toLocaleDateString()}
                    </p>
                    {allocationQuery.data.notes && (
                      <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {allocationQuery.data.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {roomQuery.data?.room && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/hostel/rooms/${roomQuery.data.room.id}`}>
                          Open room
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!allocationQuery.data) return;
                        if (
                          window.confirm(
                            "Check out this student? The bed will become vacant."
                          )
                        ) {
                          await checkoutAllocation.mutateAsync(
                            allocationQuery.data.id
                          );
                        }
                      }}
                      disabled={checkoutAllocation.isPending}
                    >
                      {checkoutAllocation.isPending ? "Checking out…" : "Check out"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This student is not currently allocated to a bed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Allocation history */}
          <SectionCard
            title="Allocation history"
            isLoading={allocationsHistoryQuery.isLoading}
            isError={allocationsHistoryQuery.isError}
            onRetry={() => allocationsHistoryQuery.refetch()}
            isEmpty={(allocationsHistoryQuery.data?.allocations ?? []).length === 0}
            emptyLabel="No allocation history."
          >
            <ul className="divide-y">
              {(allocationsHistoryQuery.data?.allocations ?? []).map((row) => (
                <AllocationHistoryRow key={row.id} row={row} />
              ))}
            </ul>
          </SectionCard>

          {/* Fee status (read-only link to finance) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Hostel fees</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/dashboard/finance/student-fees?student_id=${studentId}`}
                >
                  Open in Finance
                  <ExternalLink className="ml-2 size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hostel fees are created and managed in the Finance module
                (admin web + school counter). This view is read-only; click
                <span className="font-medium"> Open in Finance </span>
                for payment history and outstanding balances.
              </p>
            </CardContent>
          </Card>

          {/* Recent gatepasses */}
          <SectionCard
            title="Recent gatepasses"
            isLoading={gatepassQuery.isLoading}
            isError={gatepassQuery.isError}
            onRetry={() => gatepassQuery.refetch()}
            isEmpty={recentGatepasses.length === 0}
            emptyLabel="No gatepasses yet."
            action={
              gatepassQuery.data && gatepassQuery.data.total > 5 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/hostel/gatepasses?student_id=${studentId}`}>
                    View all
                  </Link>
                </Button>
              ) : null
            }
          >
            <ul className="divide-y">
              {recentGatepasses.map((gp) => (
                <GatepassRow key={gp.id} gp={gp} />
              ))}
            </ul>
          </SectionCard>

          {/* Recent visitors */}
          <SectionCard
            title="Recent visitors"
            isLoading={visitorLogsQuery.isLoading}
            isError={visitorLogsQuery.isError}
            onRetry={() => visitorLogsQuery.refetch()}
            isEmpty={recentVisitorLogs.length === 0}
            emptyLabel="No visitor records yet."
            action={
              visitorLogsQuery.data && visitorLogsQuery.data.total > 5 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/hostel/visitors?student_id=${studentId}`}>
                    View all
                  </Link>
                </Button>
              ) : null
            }
          >
            <ul className="divide-y">
              {recentVisitorLogs.map((log) => (
                <VisitorRow key={log.id} log={log} />
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number | undefined | null;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-[5rem] text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}

function AllocationHistoryRow({ row }: { row: HostelAllocation }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <BedDouble className="size-4 text-muted-foreground" />
        <span className="tabular-nums">
          {new Date(row.check_in_at).toLocaleDateString()}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="tabular-nums text-muted-foreground">
          {row.check_out_at
            ? new Date(row.check_out_at).toLocaleDateString()
            : "Present"}
        </span>
      </div>
      <Badge
        variant={row.status === "active" ? "default" : "secondary"}
        className="capitalize"
      >
        {row.status}
      </Badge>
    </li>
  );
}

function GatepassRow({ gp }: { gp: HostelGatepass }) {
  const typeLabel = gp.type === "night_out" ? "Night out" : "Day out";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div className="flex flex-col">
        <span className="font-medium">{typeLabel}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(gp.departure_datetime).toLocaleString()}
          {" → "}
          {new Date(gp.expected_return_datetime).toLocaleString()}
        </span>
        {gp.reason && (
          <span className="text-xs text-muted-foreground">Reason: {gp.reason}</span>
        )}
      </div>
      <GatepassBadge status={gp.status} />
    </li>
  );
}

function GatepassBadge({ status }: { status: HostelGatepass["status"] }) {
  const variant: "default" | "secondary" | "destructive" | "outline" = (() => {
    switch (status) {
      case "active":
        return "default";
      case "approved":
        return "outline";
      case "overdue":
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  })();
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

function VisitorRow({ log }: { log: HostelVisitorLog }) {
  const isInside = !log.check_out_at;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div className="flex flex-col">
        <span className="font-medium">{log.purpose ?? "Visit"}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(log.check_in_at).toLocaleString()}
          {log.check_out_at
            ? ` → ${new Date(log.check_out_at).toLocaleString()}`
            : ""}
        </span>
      </div>
      <Badge variant={isInside ? "default" : "secondary"}>
        {isInside ? "Inside" : "Checked out"}
      </Badge>
    </li>
  );
}

function SectionCard({
  title,
  action,
  isLoading,
  isError,
  isEmpty,
  emptyLabel,
  onRetry,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-destructive">Failed to load.</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="mr-2 size-3" /> Retry
            </Button>
          </div>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-1" />
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}
