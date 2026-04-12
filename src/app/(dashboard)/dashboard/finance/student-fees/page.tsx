"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { FilterBar, type FeeFilters } from "@/components/finance/FilterBar";
import { StatusBadge } from "@/components/finance/StatusBadge";
import { PaymentModal } from "@/components/finance/PaymentModal";
import {
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  ReceiptText,
} from "lucide-react";
import { useStudentFees } from "@/hooks/useStudentFees";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useClasses } from "@/hooks/useClasses";
import { financeService, type StudentFee } from "@/services/financeService";

function fmtAmount(n: number | undefined | null) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

type PaymentTarget = { id: string; studentName: string; outstanding: number };

export default function StudentFeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FeeFilters>({
    academic_year_id: searchParams.get("academic_year_id") ?? "",
    class_id: searchParams.get("class_id") ?? "",
    status: searchParams.get("status") ?? "",
    search: searchParams.get("search") ?? "",
  });
  const [feeStructureId] = useState(searchParams.get("fee_structure_id") ?? "");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: academicYears = [] } = useAcademicYears(false);
  const { data: classes = [] } = useClasses(
    filters.academic_year_id ? { academic_year_id: filters.academic_year_id } : undefined
  );

  const { data: studentFees = [], isLoading } = useStudentFees({
    status: filters.status || undefined,
    academic_year_id: filters.academic_year_id || undefined,
    class_id: filters.class_id || undefined,
    search: filters.search || undefined,
    fee_structure_id: feeStructureId || undefined,
  });

  const handleFiltersChange = useCallback((next: FeeFilters) => {
    setFilters(next);
  }, []);

  const handleDownloadInvoice = async (row: StudentFee, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(`invoice-${row.id}`);
    try {
      const blob = await financeService.downloadInvoicePdf(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${(row.student_name ?? row.id).replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintInvoice = async (row: StudentFee, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(`print-${row.id}`);
    try {
      await financeService.printInvoice(row.id);
    } catch {
      alert("Failed to print invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const columns: DataTableColumn<StudentFee>[] = [
    {
      key: "student_name",
      header: "Student",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.student_name ?? "—"}</p>
          {r.admission_number && (
            <p className="text-xs text-muted-foreground">{r.admission_number}</p>
          )}
        </div>
      ),
    },
    {
      key: "fee_structure_name",
      header: "Structure",
      cell: (r) => (
        <span className="text-sm">{r.fee_structure_name ?? "—"}</span>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      cell: (r) => <span className="text-sm">{fmtAmount(r.total_amount)}</span>,
    },
    {
      key: "paid_amount",
      header: "Paid",
      cell: (r) => (
        <span className="text-sm text-green-600">{fmtAmount(r.paid_amount)}</span>
      ),
    },
    {
      key: "outstanding_amount",
      header: "Outstanding",
      cell: (r) => {
        const val = r.outstanding_amount ?? (r.total_amount ?? 0) - (r.paid_amount ?? 0);
        return (
          <span className={val > 0 ? "text-sm font-medium text-amber-600" : "text-sm text-muted-foreground"}>
            {fmtAmount(Math.max(0, val))}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "due_date",
      header: "Due",
      cell: (r) => {
        if (!r.due_date) return "—";
        const d = new Date(r.due_date);
        const isOverdue = r.status === "overdue";
        return (
          <span className={isOverdue ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>
            {d.toLocaleDateString("en-IN")}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "",
      cell: (r) => {
        const isDownloading = actionLoading === `invoice-${r.id}`;
        const isPrinting = actionLoading === `print-${r.id}`;
        const outstanding = r.outstanding_amount ?? (r.total_amount ?? 0) - (r.paid_amount ?? 0);
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {outstanding > 0 && r.status !== "paid" && (
              <Button
                size="sm"
                variant="default"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setPaymentTarget({
                    id: r.id,
                    studentName: r.student_name ?? "Student",
                    outstanding: Math.max(0, outstanding),
                  });
                }}
              >
                <ReceiptText className="mr-1 size-3.5" />
                Pay
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Download Invoice"
              disabled={!!actionLoading}
              onClick={(e) => handleDownloadInvoice(r, e)}
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Print Invoice"
              disabled={!!actionLoading}
              onClick={(e) => handlePrintInvoice(r, e)}
            >
              {isPrinting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const totalOutstanding = studentFees.reduce(
    (sum, f) => sum + Math.max(0, f.outstanding_amount ?? (f.total_amount ?? 0) - (f.paid_amount ?? 0)),
    0
  );
  const paidCount = studentFees.filter((f) => f.status === "paid").length;
  const overdueCount = studentFees.filter((f) => f.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/finance">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Student Fees</h1>
            <p className="text-sm text-muted-foreground">
              {feeStructureId
                ? "Students assigned to this structure"
                : "All student fee assignments"}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        academicYears={academicYears}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section,
        }))}
      />

      {/* Summary row (computed from current list) */}
      {!isLoading && studentFees.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span>
            <span className="font-medium">{studentFees.length}</span>{" "}
            <span className="text-muted-foreground">students</span>
          </span>
          <span>
            <span className="font-medium text-amber-600">{fmtAmount(totalOutstanding)}</span>{" "}
            <span className="text-muted-foreground">outstanding</span>
          </span>
          <span>
            <span className="font-medium text-green-600">{paidCount}</span>{" "}
            <span className="text-muted-foreground">paid</span>
          </span>
          {overdueCount > 0 && (
            <span>
              <span className="font-medium text-red-600">{overdueCount}</span>{" "}
              <span className="text-muted-foreground">overdue</span>
            </span>
          )}
        </div>
      )}

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Assignments</CardTitle>
          <CardDescription>
            Click a row for full details · Use Pay button to record payment instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<StudentFee>
            columns={columns}
            data={studentFees}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            emptyMessage={
              isLoading
                ? "Loading…"
                : filters.search || filters.status || filters.class_id || filters.academic_year_id
                  ? "No results match your filters. Try adjusting or clearing them."
                  : "No fee assignments found. Create a fee structure and it will auto-assign to students."
            }
            onRowClick={(r) => router.push(`/dashboard/finance/student-fees/${r.id}`)}
          />
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {paymentTarget && (
        <PaymentModal
          open
          onOpenChange={(open) => { if (!open) setPaymentTarget(null); }}
          studentFeeId={paymentTarget.id}
          studentName={paymentTarget.studentName}
          outstanding={paymentTarget.outstanding}
          onSuccess={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
}
