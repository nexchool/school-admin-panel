"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AttendanceDatePicker } from "@/components/attendance/AttendanceDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { attendanceService } from "@/services/attendanceService";
import type { ClassAttendanceData, ClassAttendanceRow } from "@/services/attendanceService";
import { classesService } from "@/services/classesService";
import type { ClassItem } from "@/types/class";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Loader2 } from "lucide-react";

function formatDisplayDate(iso: string) {
  try {
    const d = new Date(iso + "T12:00:00");
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

function statusBadge(status: string | null, marked: boolean) {
  if (!marked || !status) {
    return (
      <Badge variant="secondary" className="font-normal">
        Not marked
      </Badge>
    );
  }
  const s = status.toLowerCase();
  if (s === "present") {
    return (
      <Badge className="border-transparent bg-green-600 font-normal hover:bg-green-600">
        Present
      </Badge>
    );
  }
  if (s === "absent") {
    return (
      <Badge variant="destructive" className="font-normal">
        Absent
      </Badge>
    );
  }
  if (s === "late") {
    return (
      <Badge className="border-transparent bg-amber-600 font-normal hover:bg-amber-600">
        Late
      </Badge>
    );
  }
  if (s === "excused") {
    return (
      <Badge variant="secondary" className="border-violet-500/40 bg-violet-500/15 font-normal text-violet-900 dark:text-violet-100">
        Excused
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal">
      {status}
    </Badge>
  );
}

export default function AttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [attendance, setAttendance] = useState<ClassAttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    classesService
      .getClasses()
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setClassesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setAttendance(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    attendanceService
      .getClassAttendance(selectedClassId, selectedDate)
      .then(setAttendance)
      .catch((e) => {
        setAttendance(null);
        setError(e instanceof Error ? e.message : "Could not load attendance");
      })
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedDate]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const columns: DataTableColumn<ClassAttendanceRow>[] = [
    {
      key: "roll",
      header: "Roll",
      cell: (r) => (r.roll_number != null ? String(r.roll_number) : "—"),
      className: "whitespace-nowrap w-[4rem]",
    },
    {
      key: "name",
      header: "Student",
      cell: (r) => (
        <div>
          <div className="font-medium">{r.student_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {r.admission_number ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => statusBadge(r.status, r.marked),
    },
    {
      key: "remarks",
      header: "Remarks",
      cell: (r) => (
        <span className="text-muted-foreground">{r.remarks?.trim() || "—"}</span>
      ),
    },
    {
      key: "marked_by",
      header: "Marked by",
      cell: (r) => (
        <span className="text-muted-foreground">{r.marked_by_name ?? "—"}</span>
      ),
    },
    {
      key: "recorded_at",
      header: "Last updated",
      cell: (r) => {
        if (!r.recorded_at) return "—";
        try {
          return new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(r.recorded_at));
        } catch {
          return r.recorded_at;
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Attendance overview
        </h1>
        <p className="text-muted-foreground">
          Read-only snapshot of daily attendance by class. Marking is done by
          teachers in the mobile app.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2 min-w-[260px] max-w-sm flex-1">
          <Label htmlFor="att-date">Date</Label>
          <AttendanceDatePicker
            id="att-date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
        <div className="space-y-2 min-w-[280px] flex-1 max-w-md">
          <Label>Class</Label>
          <Select
            value={selectedClassId || undefined}
            onValueChange={(v) => setSelectedClassId(v)}
            disabled={classesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` ${c.section}` : ""}
                  {c.academic_year ? ` · ${c.academic_year}` : ""}
                  {typeof c.student_count === "number"
                    ? ` · ${c.student_count} students`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {classesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No classes</CardTitle>
            <CardDescription>
              Create classes under Classes before viewing attendance.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !selectedClassId ? (
        <Card>
          <CardHeader>
            <CardTitle>Select a class</CardTitle>
            <CardDescription>
              Choose a class and date to load the attendance overview.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : attendance ? (
        <div className="space-y-6">
          {attendance.is_holiday && attendance.holiday_info && (
            <div
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
              role="status"
            >
              <span className="font-medium text-amber-900 dark:text-amber-100">
                Scheduled non-working day:{" "}
              </span>
              <span className="text-amber-900/90 dark:text-amber-100/90">
                {(attendance.holiday_info.name as string) ||
                  (attendance.holiday_info.is_recurring
                    ? "Weekly off"
                    : "Holiday")}
              </span>
              . Attendance may be empty or not expected.
            </div>
          )}

          {attendance.date_within_academic_window === false && (
            <div
              className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
              role="status"
            >
              This date is outside the class academic window
              {attendance.class_start_date || attendance.class_end_date
                ? ` (${attendance.class_start_date ?? "…"} → ${attendance.class_end_date ?? "…"})`
                : ""}
              . Figures may not reflect regular school sessions.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Class</CardDescription>
                <CardTitle className="text-lg">
                  {selectedClass
                    ? `${selectedClass.name}${selectedClass.section ? ` ${selectedClass.section}` : ""}`
                    : attendance.class_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {formatDisplayDate(attendance.date)}
                </p>
                {attendance.academic_year && (
                  <p>Academic year: {attendance.academic_year}</p>
                )}
                {attendance.grade_level != null && (
                  <p>Grade: {attendance.grade_level}</p>
                )}
                <p>
                  Class teacher: {attendance.class_teacher_name ?? "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Enrollment &amp; marking</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {attendance.total_students}
                  </p>
                  <p className="text-muted-foreground">Enrolled</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {attendance.marked_count}
                  </p>
                  <p className="text-muted-foreground">Marked</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                    {attendance.unmarked_count}
                  </p>
                  <p className="text-muted-foreground">Not marked</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {attendance.attendance_rate_percent != null
                      ? `${attendance.attendance_rate_percent}%`
                      : "—"}
                  </p>
                  <p className="text-muted-foreground">Attendance rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Status breakdown</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-center text-sm">
                <div>
                  <p className="text-xl font-semibold text-green-600 tabular-nums">
                    {attendance.present_count}
                  </p>
                  <p className="text-muted-foreground">Present</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-red-600 tabular-nums">
                    {attendance.absent_count}
                  </p>
                  <p className="text-muted-foreground">Absent</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-amber-600 tabular-nums">
                    {attendance.late_count}
                  </p>
                  <p className="text-muted-foreground">Late</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-violet-700 dark:text-violet-300 tabular-nums">
                    {attendance.excused_count ?? 0}
                  </p>
                  <p className="text-muted-foreground">Excused</p>
                </div>
              </CardContent>
            </Card>

          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student detail</CardTitle>
              <CardDescription>
                Per-student status, remarks, and who last updated the record.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable<ClassAttendanceRow>
                columns={columns}
                data={attendance.attendance}
                getRowId={(r) => r.student_id}
                emptyMessage="No students in this class for the selected date."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
