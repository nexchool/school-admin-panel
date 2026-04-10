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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transportService, type TransportBus } from "@/services/transportService";
import { toast } from "sonner";

type Props = {
  bus: TransportBus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditBusModal({ bus, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bus_number: "",
    vehicle_number: "",
    capacity: "",
    status: "active",
  });

  useEffect(() => {
    if (bus && open) {
      setForm({
        bus_number: bus.bus_number,
        vehicle_number: bus.vehicle_number ?? "",
        capacity: String(bus.capacity),
        status: bus.status,
      });
    }
  }, [bus, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bus) return;
    setLoading(true);
    try {
      await transportService.updateBus(bus.id, {
        bus_number: form.bus_number.trim(),
        vehicle_number: form.vehicle_number.trim(),
        capacity: parseInt(form.capacity, 10),
        status: form.status,
      });
      toast.success("Bus updated");
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
            <DialogTitle>Edit bus</DialogTitle>
            <DialogDescription>Update vehicle details and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eb_bus">Bus number</Label>
              <Input
                id="eb_bus"
                value={form.bus_number}
                onChange={(e) => setForm((f) => ({ ...f, bus_number: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eb_veh">Vehicle number</Label>
              <Input
                id="eb_veh"
                value={form.vehicle_number}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eb_cap">Capacity</Label>
                <Input
                  id="eb_cap"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !bus}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
