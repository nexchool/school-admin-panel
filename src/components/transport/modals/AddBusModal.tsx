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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transportService } from "@/services/transportService";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddBusModal({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bus_number: "",
    vehicle_number: "",
    capacity: "40",
    status: "active",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transportService.createBus({
        bus_number: form.bus_number.trim(),
        vehicle_number: form.vehicle_number.trim() || undefined,
        capacity: parseInt(form.capacity, 10),
        status: form.status,
      });
      toast.success("Bus added");
      setForm({ bus_number: "", vehicle_number: "", capacity: "40", status: "active" });
      onCreated();
      onOpenChange(false);
    } catch (ex: unknown) {
      toast.error(ex instanceof Error ? ex.message : "Could not add bus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={() => onOpenChange(false)}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add bus</DialogTitle>
            <DialogDescription>Bus number must be unique for your school.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ab_bus">Bus number</Label>
              <Input
                id="ab_bus"
                value={form.bus_number}
                onChange={(e) => setForm((f) => ({ ...f, bus_number: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ab_veh">Vehicle number</Label>
              <Input
                id="ab_veh"
                value={form.vehicle_number}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ab_cap">Capacity</Label>
                <Input
                  id="ab_cap"
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
