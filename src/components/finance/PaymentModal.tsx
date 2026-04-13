"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRecordPayment } from "@/hooks/useStudentFees";
import { cn } from "@/lib/utils";

export type PaymentFeeItem = {
  id: string;
  component_name?: string;
  amount: number;
  paid_amount: number;
};

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentFeeId: string;
  studentName: string;
  outstanding: number;
  /** Fee line items with remaining balance; enables optional split-by-component */
  items?: PaymentFeeItem[];
  onSuccess?: () => void;
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

type PaymentMethodValue = "cash" | "upi" | "bank_transfer" | "cheque" | "other";

export function PaymentModal({
  open,
  onOpenChange,
  studentFeeId,
  studentName,
  outstanding,
  items,
  onSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [reference, setReference] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [allocByItem, setAllocByItem] = useState<Record<string, string>>({});

  const { mutate: recordPayment, isPending } = useRecordPayment();

  const itemsWithRemaining = useMemo(
    () =>
      (items ?? []).filter(
        (it) => (it.amount ?? 0) - (it.paid_amount ?? 0) > 0.001
      ),
    [items]
  );

  useEffect(() => {
    if (open) {
      setAllocByItem({});
    }
  }, [open, studentFeeId]);

  const amountNum = parseFloat(amount) || 0;

  const allocationSum = useMemo(
    () =>
      itemsWithRemaining.reduce(
        (sum, it) => sum + (parseFloat(allocByItem[it.id] ?? "0") || 0),
        0
      ),
    [itemsWithRemaining, allocByItem]
  );

  const useAllocations = allocationSum > 0.001;
  const allocationMismatch =
    useAllocations && Math.abs(allocationSum - amountNum) > 0.01;

  const handleClose = () => {
    setAmount("");
    setMethod("cash");
    setReference("");
    setOtherDetail("");
    setNotes("");
    setAllocByItem({});
    onOpenChange(false);
  };

  const handleAutoAllocate = () => {
    if (!amountNum || amountNum <= 0 || amountNum > outstanding + 0.01) return;
    const next: Record<string, string> = {};
    let left = amountNum;
    for (const it of itemsWithRemaining) {
      if (left <= 0) break;
      const rem = (it.amount ?? 0) - (it.paid_amount ?? 0);
      if (rem <= 0) continue;
      const apply = Math.min(left, rem);
      next[it.id] = String(apply);
      left -= apply;
    }
    setAllocByItem(next);
  };

  const clearAllocations = () => setAllocByItem({});

  const handlePayFullItem = (item: PaymentFeeItem) => {
    const rem = (item.amount ?? 0) - (item.paid_amount ?? 0);
    if (rem <= 0) return;
    setAllocByItem((prev) => {
      const next = { ...prev, [item.id]: String(rem) };
      const sum = itemsWithRemaining.reduce(
        (s, it) => s + (parseFloat(next[it.id] ?? "0") || 0),
        0
      );
      setAmount(String(Math.round(sum * 100) / 100));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    if (amt > outstanding + 0.01) {
      toast.error("Amount cannot exceed outstanding balance");
      return;
    }
    if (method !== "cash" && !reference.trim()) return;
    if (method === "other" && !otherDetail.trim()) return;
    if (useAllocations && allocationMismatch) {
      toast.error(
        `Split amounts (₹${allocationSum.toLocaleString("en-IN")}) must equal payment total (₹${amt.toLocaleString("en-IN")})`
      );
      return;
    }

    const allocations = useAllocations
      ? itemsWithRemaining
          .map((it) => ({
            item_id: it.id,
            amount: parseFloat(allocByItem[it.id] ?? "0") || 0,
          }))
          .filter((a) => a.amount > 0)
      : undefined;

    if (useAllocations && (!allocations || allocations.length === 0)) {
      toast.error("Enter amounts for at least one component, or clear the split.");
      return;
    }

    recordPayment(
      {
        student_fee_id: studentFeeId,
        amount: amt,
        method,
        reference_number: reference.trim() || undefined,
        method_detail: method === "other" ? otherDetail.trim() : undefined,
        notes: notes.trim() || undefined,
        allocations,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          handleClose();
          onSuccess?.();
        },
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to record payment"
          );
        },
      }
    );
  };

  const showSplit =
    itemsWithRemaining.length > 0 && outstanding > 0;

  const submitDisabled =
    isPending ||
    !amount ||
    amountNum <= 0 ||
    amountNum > outstanding + 0.01 ||
    (method !== "cash" && !reference.trim()) ||
    (method === "other" && !otherDetail.trim()) ||
    allocationMismatch;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {studentName} — Outstanding: {fmt(outstanding)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={outstanding > 0 ? outstanding : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                required
                autoFocus
              />
            </div>
            {outstanding > 0 && (
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => setAmount(String(outstanding))}
              >
                Pay full outstanding ({fmt(outstanding)})
              </button>
            )}
          </div>

          {showSplit && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-medium">Split by component (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAutoAllocate}
                    disabled={!amountNum || amountNum <= 0 || amountNum > outstanding + 0.01}
                  >
                    Auto-fill from amount
                  </Button>
                  {Object.keys(allocByItem).length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearAllocations}
                    >
                      Clear split
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave all blank to apply the payment automatically across components (FIFO).
                If you enter any amount here, the sum must match the payment total above.
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {itemsWithRemaining.map((it) => {
                  const remaining = (it.amount ?? 0) - (it.paid_amount ?? 0);
                  return (
                    <div
                      key={it.id}
                      className="flex flex-col gap-1 rounded-md border border-border/60 bg-background p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {it.component_name ?? "Component"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due {fmt(remaining)} of {fmt(it.amount ?? 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={remaining}
                          className="h-8 w-28 text-right"
                          placeholder="0"
                          value={allocByItem[it.id] ?? ""}
                          onChange={(e) =>
                            setAllocByItem((prev) => ({
                              ...prev,
                              [it.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-xs"
                          onClick={() => handlePayFullItem(it)}
                        >
                          Full
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {useAllocations && (
                <p
                  className={cn(
                    "text-xs",
                    allocationMismatch ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  Split total: {fmt(allocationSum)}
                  {allocationMismatch && " — must equal payment amount"}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Payment Method *</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethodValue)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === "other" && (
            <div className="space-y-1.5">
              <Label>How was it paid? *</Label>
              <Input
                value={otherDetail}
                onChange={(e) => setOtherDetail(e.target.value)}
                placeholder="e.g. Card machine, Paytm, school wallet"
                required
              />
            </div>
          )}

          {method !== "cash" && (
            <div className="space-y-1.5">
              <Label>Reference / transaction ID *</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  method === "cheque"
                    ? "Cheque number"
                    : method === "bank_transfer"
                      ? "UTR / bank reference"
                      : "Transaction / reference ID"
                }
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
