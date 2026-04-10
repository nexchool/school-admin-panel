"use client";

import { useEffect, useState } from "react";
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
  route: TransportRoute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFee: string;
  onSaved: () => void;
};

export function EditRouteModal({ route, open, onOpenChange, defaultFee: initialFee, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_point: "",
    end_point: "",
    status: "active",
    fee: "",
    fee_cycle: "monthly" as TransportFeeCycle,
    is_reverse_enabled: false,
  });

  useEffect(() => {
    if (route && open) {
      const feeStr =
        initialFee.trim() ||
        (route.default_fee != null && route.default_fee !== undefined ? String(route.default_fee) : "");
      setForm({
        name: route.name,
        start_point: route.start_point ?? "",
        end_point: route.end_point ?? "",
        status: route.status ?? "active",
        fee: feeStr,
        fee_cycle: (route.fee_cycle as TransportFeeCycle) ?? "monthly",
        is_reverse_enabled: Boolean(route.is_reverse_enabled),
      });
    }
  }, [route, open, initialFee]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route) return;
    setLoading(true);
    try {
      const payload: Partial<TransportRoute> = {
        name: form.name.trim(),
        start_point: form.start_point.trim() || undefined,
        end_point: form.end_point.trim() || undefined,
        status: form.status,
        fee_cycle: form.fee_cycle,
        is_reverse_enabled: form.is_reverse_enabled,
      };
      if (form.fee.trim()) {
        const amt = parseFloat(form.fee);
        if (Number.isNaN(amt)) {
          toast.error("Default fee must be a valid number");
          return;
        }
        payload.default_fee = amt;
      } else {
        payload.default_fee = null;
      }
      const saved = await transportService.updateRoute(route.id, payload);
      if (form.status === "active" && form.fee.trim()) {
        const amt = parseFloat(form.fee);
        if (!Number.isNaN(amt)) {
          await transportService.upsertFeePlan({ route_id: route.id, amount: amt });
        }
      }
      toast.success("Route updated");
      const w = saved?.deactivate_warnings;
      const rem = w?.active_schedules_remaining ?? 0;
      const deact = w?.schedules_deactivated_future_windows ?? 0;
      if (w && (w.active_enrollments > 0 || rem > 0 || deact > 0)) {
        toast.warning(
          `This route is inactive and cannot be used for new assignments. Enrollments: ${w.active_enrollments}. Schedules still active (e.g. in progress): ${rem}. Future windows deactivated: ${deact}.`
        );
      }
      onSaved();
      onOpenChange(false);
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={() => onOpenChange(false)}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit route</DialogTitle>
            <DialogDescription>Update corridor, status, fee, and billing cycle.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  value={form.start_point}
                  onChange={(e) => setForm((f) => ({ ...f, start_point: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  value={form.end_point}
                  onChange={(e) => setForm((f) => ({ ...f, end_point: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default fee</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.fee}
                onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee cycle</Label>
              <select
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
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !route}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
