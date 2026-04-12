"use client";

import { useState } from "react";
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
import { useRecordPayment } from "@/hooks/useStudentFees";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentFeeId: string;
  studentName: string;
  outstanding: number;
  onSuccess?: () => void;
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export function PaymentModal({
  open,
  onOpenChange,
  studentFeeId,
  studentName,
  outstanding,
  onSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank" | "upi" | "cheque">("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { mutate: recordPayment, isPending } = useRecordPayment();

  const handleClose = () => {
    setAmount("");
    setMethod("cash");
    setReference("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    recordPayment(
      {
        student_fee_id: studentFeeId,
        amount: amt,
        method,
        reference_number: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
        onError: (err) => {
          alert(err instanceof Error ? err.message : "Failed to record payment");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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

          <div className="space-y-1.5">
            <Label>Payment Method *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method !== "cash" && (
            <div className="space-y-1.5">
              <Label>Reference / Transaction ID</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={method === "cheque" ? "Cheque number" : "Transaction ID"}
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
            <Button type="submit" disabled={isPending || !amount}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
