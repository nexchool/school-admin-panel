"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CircleDollarSign,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react";
import { MetricCard } from "@/components/finance/MetricCard";
import { FeeStructureFormModal } from "@/components/finance/FeeStructureFormModal";
import {
  PaymentModal,
  type PaymentFeeItem,
} from "@/components/finance/PaymentModal";
import { useFinanceSummary } from "@/hooks/useFinanceSummary";
import { useStudentFees } from "@/hooks/useStudentFees";
import { ApiException } from "@/services/api";

function fmtAmount(n: number | undefined | null) {
  if (n == null) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function FinanceDashboardPage() {
  const [createStructureOpen, setCreateStructureOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    studentName: string;
    outstanding: number;
    items?: PaymentFeeItem[];
  } | null>(null);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryFailed,
    error: summaryError,
    refetch: refetchSummary,
  } = useFinanceSummary({
    include_recent_payments: 10,
  });

  const {
    data: overduefees = [],
    isLoading: overdueLoading,
    isError: overdueFailed,
    error: overdueError,
    refetch: refetchOverdue,
  } = useStudentFees({
    status: "overdue",
  });

  const financeLoadFailed = summaryFailed || overdueFailed;
  const financeError = summaryFailed ? summaryError : overdueError;
  const financeErrorText =
    financeError instanceof ApiException
      ? financeError.message
      : financeError instanceof Error
        ? financeError.message
        : "Something went wrong while loading finance data.";

  const recentPayments = summary?.recent_payments ?? [];
  const collectionRate =
    summary && summary.total_expected > 0
      ? Math.round((summary.total_collected / summary.total_expected) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {financeLoadFailed && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              Finance data could not be loaded
            </CardTitle>
            <CardDescription className="text-destructive/90">{financeErrorText}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              If this is a new school, create an{" "}
              <Link href="/academics/academic-years" className="font-medium text-foreground underline underline-offset-4">
                academic year
              </Link>{" "}
              first, then classes and fee structures. If your plan does not include fees, contact your
              platform administrator.
            </p>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                void refetchSummary();
                void refetchOverdue();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Fee collection overview — {collectionRate}% collected
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateStructureOpen(true)} className="gap-2">
            <Plus className="size-4" />
            New Structure
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/finance/student-fees">
              <Wallet className="size-4" />
              Manage Fees
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Receivable"
          value={fmtAmount(summary?.total_expected)}
          icon={CircleDollarSign}
          subtext="Sum of all assigned fees"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Total Collected"
          value={fmtAmount(summary?.total_collected)}
          icon={TrendingUp}
          variant="success"
          subtext={`${collectionRate}% collection rate`}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Outstanding"
          value={fmtAmount(summary?.total_outstanding)}
          icon={Wallet}
          variant="warning"
          subtext="Remaining to be collected"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Overdue Fees"
          value={summary?.overdue_count ?? 0}
          icon={AlertCircle}
          variant="danger"
          subtext="Students with past-due fees"
          isLoading={summaryLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Payments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <CardDescription>Last 10 payments recorded</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href="/dashboard/finance/student-fees">
                View All <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Clock className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/finance/student-fees">Record First Payment</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{p.student_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      +{fmtAmount(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right column: Quick Actions + Overdue */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setCreateStructureOpen(true)}
              >
                <Plus className="size-4" />
                Create Fee Structure
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/dashboard/finance/structures">
                  <Wallet className="size-4" />
                  View All Structures
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/dashboard/finance/student-fees?status=overdue">
                  <AlertCircle className="size-4 text-red-500" />
                  View Overdue Fees
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/dashboard/finance/student-fees?status=unpaid">
                  <CircleDollarSign className="size-4 text-amber-500" />
                  View Unpaid Fees
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Overdue alerts */}
          {!overdueLoading && overduefees.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="size-4" />
                  Overdue Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {overduefees.slice(0, 4).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-md border border-red-100 bg-red-50/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{f.student_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtAmount(f.outstanding_amount)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 h-7 shrink-0 text-xs"
                        onClick={() =>
                          setPaymentTarget({
                            id: f.id,
                            studentName: f.student_name ?? "Student",
                            outstanding: f.outstanding_amount ?? 0,
                            items: f.items,
                          })
                        }
                      >
                        Pay
                      </Button>
                    </li>
                  ))}
                </ul>
                {overduefees.length > 4 && (
                  <Button asChild variant="link" className="mt-2 h-auto p-0 text-xs">
                    <Link href="/dashboard/finance/student-fees?status=overdue">
                      +{overduefees.length - 4} more overdue →
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Structure Modal */}
      <FeeStructureFormModal
        open={createStructureOpen}
        onOpenChange={setCreateStructureOpen}
        mode="create"
        onSuccess={() => setCreateStructureOpen(false)}
      />

      {/* Quick Payment Modal */}
      {paymentTarget && (
        <PaymentModal
          open={!!paymentTarget}
          onOpenChange={(open) => { if (!open) setPaymentTarget(null); }}
          studentFeeId={paymentTarget.id}
          studentName={paymentTarget.studentName}
          outstanding={paymentTarget.outstanding}
          items={paymentTarget.items}
          onSuccess={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
}
