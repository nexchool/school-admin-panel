"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { teacherLeaveService } from "@/services/teacherConstraintService";
import type { TeacherLeave } from "@/types/teacher";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface TeacherLeavesTabProps {
  teacherId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function TeacherLeavesTab({ teacherId }: TeacherLeavesTabProps) {
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await teacherLeaveService.listLeaves({ teacher_id: teacherId });
      setLeaves(Array.isArray(data) ? data : []);
    } catch {
      setLeaves([]);
      toast.error("Could not load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) loadData();
  }, [teacherId]);

  const handleApprove = async (leaveId: string) => {
    setApproving(leaveId);
    try {
      await teacherLeaveService.approveLeave(leaveId);
      await loadData();
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
      await loadData();
      toast.success("Leave rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setRejecting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>Leave history for this teacher</CardDescription>
      </CardHeader>
      <CardContent>
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests.</p>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">
                    {leave.start_date} – {leave.end_date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leave.leave_type}
                    {leave.reason && ` • ${leave.reason}`}
                    {leave.working_days != null && ` • ${leave.working_days} days`}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[leave.status] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {leave.status}
                  </span>
                </div>
                {leave.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(leave.id)}
                      disabled={approving === leave.id}
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
