"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeachers, useCreateTeacher } from "@/hooks/useTeachers";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { BulkImportTeachers } from "@/components/teachers/BulkImportTeachers";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { teacherLeaveService } from "@/services/teacherConstraintService";
import type { Teacher, TeacherLeave } from "@/types/teacher";
import { Plus, Search, Upload, ClipboardList, Users, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PageView = "teachers" | "leaves";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

function AllLeavesView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["teacher-leaves-all", statusFilter],
    queryFn: () =>
      teacherLeaveService.listLeaves(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 30_000,
  });

  const handleApprove = async (leaveId: string) => {
    setApproving(leaveId);
    try {
      await teacherLeaveService.approveLeave(leaveId);
      qc.invalidateQueries({ queryKey: ["teacher-leaves-all"] });
      toast.success("Leave approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    setRejecting(leaveId);
    try {
      await teacherLeaveService.rejectLeave(leaveId);
      qc.invalidateQueries({ queryKey: ["teacher-leaves-all"] });
      toast.success("Leave rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setRejecting(null);
    }
  };

  const pendingCount = leaves.filter((l: TeacherLeave) => l.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>
              Review and manage leave requests from all teachers.
            </CardDescription>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaves.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} leave requests.`
              : "No leave requests found."}
          </p>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave: TeacherLeave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">
                      {leave.start_date} – {leave.end_date}
                    </p>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[leave.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {leave.leave_type}
                    {leave.working_days != null && ` • ${leave.working_days} days`}
                    {leave.reason && ` • ${leave.reason}`}
                  </p>
                  <button
                    type="button"
                    className="mt-1 text-xs text-primary hover:underline"
                    onClick={() => router.push(`/teachers/${leave.teacher_id}?tab=leaves`)}
                  >
                    View teacher profile →
                  </button>
                </div>
                {leave.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(leave.id)}
                      disabled={approving === leave.id}
                      title="Approve"
                    >
                      {approving === leave.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleReject(leave.id)}
                      disabled={rejecting === leave.id}
                      title="Reject"
                    >
                      {rejecting === leave.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeachersPage() {
  const router = useRouter();
  const [view, setView] = useState<PageView>("teachers");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: teachers = [], isLoading } = useTeachers({
    search: search || undefined,
  });
  const createMutation = useCreateTeacher();

  // Count pending leaves for the badge
  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ["teacher-leaves-all", "pending"],
    queryFn: () => teacherLeaveService.listLeaves({ status: "pending" }),
    refetchInterval: 30_000,
  });
  const pendingCount = (pendingLeaves as TeacherLeave[]).length;

  const columns: DataTableColumn<Teacher>[] = [
    { key: "employee_id", header: "Employee ID" },
    { key: "name", header: "Name" },
    { key: "email", header: "Email", cell: (r) => r.email ?? "—" },
    { key: "designation", header: "Designation", cell: (r) => r.designation ?? "—" },
    { key: "status", header: "Status" },
  ];

  const handleCreate = async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Teacher created");
      setCreateOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create teacher");
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and assignments.
          </p>
        </div>
        {view === "teachers" && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
            >
              <Upload className="size-4" />
              Bulk import
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add Teacher
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        <Button
          variant={view === "teachers" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-b-none gap-2"
          onClick={() => setView("teachers")}
        >
          <Users className="size-4" />
          All Teachers
        </Button>
        <Button
          variant={view === "leaves" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-b-none gap-2"
          onClick={() => setView("leaves")}
        >
          <ClipboardList className="size-4" />
          Leave Requests
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </Button>
      </div>

      {view === "teachers" && (
        <Card>
          <CardHeader>
            <CardTitle>Teacher List</CardTitle>
            <CardDescription>
              View and manage all teachers. Click a row to view details.
            </CardDescription>
            <div className="flex items-center gap-2 pt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={teachers}
              getRowId={(row) => row.id}
              isLoading={isLoading}
              emptyMessage="No teachers found. Add a teacher to get started."
              onRowClick={(row) => router.push(`/teachers/${row.id}`)}
            />
          </CardContent>
        </Card>
      )}

      {view === "leaves" && <AllLeavesView />}

      <TeacherFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <BulkImportTeachers open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
