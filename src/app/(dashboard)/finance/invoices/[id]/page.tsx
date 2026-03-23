"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { feesService } from "@/services/feesService";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString()}`;
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-IN");
  } catch {
    return s;
  }
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["fees", "invoice", id],
    queryFn: () => feesService.getInvoice(id!),
    enabled: !!id,
  });

  const handleSendReminder = async () => {
    if (!id) return;
    try {
      await feesService.sendReminder(id);
      alert("Reminder sent successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send reminder");
    }
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Invoice not found.</p>
        <Button asChild variant="outline">
          <Link href="/finance/invoices">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance/invoices">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Invoice {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">
              {formatDate(invoice.issue_date)} • {invoice.status}
            </p>
          </div>
        </div>
        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
          <Button variant="outline" onClick={handleSendReminder}>
            Send Reminder
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Invoice amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span>{formatAmount(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="text-green-600">{formatAmount(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance</span>
              <span className="text-red-600">{formatAmount(invoice.remaining_balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{formatDate(invoice.due_date)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Invoice metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Academic Year</span>
              <span>{invoice.academic_year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{invoice.status}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
