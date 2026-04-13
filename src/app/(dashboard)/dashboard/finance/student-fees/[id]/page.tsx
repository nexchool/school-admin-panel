"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bus,
  Download,
  Loader2,
  Printer,
  ReceiptText,
} from "lucide-react";
import { StatusBadge } from "@/components/finance/StatusBadge";
import { PaymentModal } from "@/components/finance/PaymentModal";
import { useStudentFeeDetail } from "@/hooks/useStudentFees";
import { toast } from "sonner";
import { financeService } from "@/services/financeService";

function fmtAmount(n: number | undefined | null) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function fmtDate(s: string | undefined | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN");
  } catch {
    return s;
  }
}

function fmtDateTime(s: string | undefined | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  bank: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
  online: "Online",
};

export default function StudentFeeDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: fee, isLoading } = useStudentFeeDetail(id);

  const outstanding = fee
    ? Math.max(0, fee.outstanding_amount ?? (fee.total_amount ?? 0) - (fee.paid_amount ?? 0))
    : 0;

  const handleDownloadInvoice = async () => {
    if (!id) return;
    setActionLoading("invoice");
    try {
      const blob = await financeService.downloadInvoicePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${(fee?.student_name ?? id).replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintInvoice = async () => {
    if (!id) return;
    setActionLoading("invoice-print");
    try {
      await financeService.printInvoice(id);
    } catch {
      toast.error("Failed to print invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    setActionLoading(`receipt-${paymentId}`);
    try {
      const blob = await financeService.downloadReceiptPdf(paymentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${paymentId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Failed to download receipt");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintReceipt = async (paymentId: string) => {
    setActionLoading(`receipt-print-${paymentId}`);
    try {
      await financeService.printReceipt(paymentId);
    } catch {
      toast.error("Failed to print receipt");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Fee record not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/finance/student-fees">Back to Student Fees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/finance/student-fees">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {fee.student_name ?? "Student"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={fee.status} />
              <span className="text-sm text-muted-foreground">
                {fee.fee_structure_name}
              </span>
              {fee.admission_number && (
                <span className="text-xs text-muted-foreground">
                  #{fee.admission_number}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!!actionLoading}
            onClick={handleDownloadInvoice}
          >
            {actionLoading === "invoice" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Invoice PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!!actionLoading}
            onClick={handlePrintInvoice}
          >
            {actionLoading === "invoice-print" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Printer className="size-3.5" />
            )}
            Print Invoice
          </Button>
          {outstanding > 0 && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setPaymentOpen(true)}
            >
              <ReceiptText className="size-3.5" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtAmount(fee.total_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-600">{fmtAmount(fee.paid_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${outstanding > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {fmtAmount(outstanding)}
            </p>
            {fee.due_date && (
              <p className="text-xs text-muted-foreground">Due {fmtDate(fee.due_date)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Components breakdown */}
        {fee.items && fee.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fee Breakdown</CardTitle>
              <CardDescription>Component-level allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {fee.items.map((item) => {
                  const itemOutstanding = Math.max(0, item.amount - (item.paid_amount ?? 0));
                  return (
                    <li key={item.id} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{item.component_name ?? "—"}</p>
                        <p className="text-sm font-medium">{fmtAmount(item.amount)}</p>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted mr-4">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{
                              width: item.amount > 0
                                ? `${Math.min(100, ((item.paid_amount ?? 0) / item.amount) * 100)}%`
                                : "0%",
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">
                          Paid: {fmtAmount(item.paid_amount ?? 0)}
                          {itemOutstanding > 0 && ` · Due: ${fmtAmount(itemOutstanding)}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Payment history */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {fee.payments?.length
                ? `${fee.payments.length} payment${fee.payments.length !== 1 ? "s" : ""} recorded`
                : "No payments recorded yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fee.payments && fee.payments.length > 0 ? (
              <ul className="divide-y">
                {fee.payments.map((p) => {
                  const isReceiptLoading = actionLoading === `receipt-${p.id}`;
                  const isPrintLoading = actionLoading === `receipt-print-${p.id}`;
                  return (
                    <li key={p.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-green-600">
                              +{fmtAmount(p.amount)}
                            </p>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {METHOD_LABELS[p.method] ?? p.method}
                              {p.method === "other" && p.method_detail
                                ? ` — ${p.method_detail}`
                                : ""}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</p>
                          {p.reference_number && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {p.reference_number}
                            </p>
                          )}
                          {p.notes && (
                            <p className="text-xs text-muted-foreground">{p.notes}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Download Receipt"
                            disabled={!!actionLoading}
                            onClick={() => handleDownloadReceipt(p.id)}
                          >
                            {isReceiptLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Print Receipt"
                            disabled={!!actionLoading}
                            onClick={() => handlePrintReceipt(p.id)}
                          >
                            {isPrintLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Printer className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <ReceiptText className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No payments yet.</p>
                {outstanding > 0 && (
                  <Button size="sm" onClick={() => setPaymentOpen(true)}>
                    Record First Payment
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transport note */}
      {fee.fee_structure_name?.toLowerCase().includes("transport") && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Bus className="size-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-700">Transport Fee</p>
              <p className="text-xs text-blue-600">
                This fee is synced from the transport enrollment. Manage it from the{" "}
                <Link href="/dashboard/transport" className="underline">
                  Transport module
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        studentFeeId={fee.id}
        studentName={fee.student_name ?? "Student"}
        outstanding={outstanding}
        items={fee.items}
        onSuccess={() => setPaymentOpen(false)}
      />
    </div>
  );
}
