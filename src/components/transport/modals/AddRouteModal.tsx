"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  transportService,
  type TransportFeeCycle,
  type TransportRoute,
} from "@/services/transportService";
import { toast } from "sonner";

const FEE_CYCLES: { value: TransportFeeCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half yearly" },
  { value: "yearly", label: "Yearly" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddRouteModal({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_point: "",
    end_point: "",
    default_fee: "",
    fee_cycle: "monthly" as TransportFeeCycle,
    is_reverse_enabled: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Partial<TransportRoute> = {
        name: form.name.trim(),
        start_point: form.start_point.trim() || undefined,
        end_point: form.end_point.trim() || undefined,
        fee_cycle: form.fee_cycle,
        is_reverse_enabled: form.is_reverse_enabled,
      };
      if (form.default_fee.trim()) {
        const amt = parseFloat(form.default_fee);
        if (Number.isNaN(amt)) {
          toast.error("Default fee must be a valid number");
          return;
        }
        body.default_fee = amt;
      }
      const r = await transportService.createRoute(body);
      if (form.default_fee.trim()) {
        const amt = parseFloat(form.default_fee);
        if (!Number.isNaN(amt)) {
          await transportService.upsertFeePlan({ route_id: r.id, amount: amt });
        }
      }
      toast.success("Route created");
      setForm({
        name: "",
        start_point: "",
        end_point: "",
        default_fee: "",
        fee_cycle: "monthly",
        is_reverse_enabled: false,
      });
      onCreated();
      onOpenChange(false);
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Could not create route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={() => onOpenChange(false)}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add route</DialogTitle>
            <DialogDescription>
              Routes define pickup/drop areas. Buses are assigned separately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ar_name">Route name</Label>
              <Input
                id="ar_name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ar_s">Start</Label>
                <Input
                  id="ar_s"
                  value={form.start_point}
                  onChange={(e) => setForm((f) => ({ ...f, start_point: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ar_e">End</Label>
                <Input
                  id="ar_e"
                  value={form.end_point}
                  onChange={(e) => setForm((f) => ({ ...f, end_point: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ar_fee">Default fee (optional)</Label>
              <Input
                id="ar_fee"
                type="number"
                step="0.01"
                min="0"
                value={form.default_fee}
                onChange={(e) => setForm((f) => ({ ...f, default_fee: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ar_fc">Fee cycle</Label>
              <select
                id="ar_fc"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.fee_cycle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fee_cycle: e.target.value as TransportFeeCycle }))
                }
              >
                {FEE_CYCLES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_reverse_enabled}
                onChange={(e) => setForm((f) => ({ ...f, is_reverse_enabled: e.target.checked }))}
                className="size-4 rounded border-input"
              />
              Allow reverse direction scheduling
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Create route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
