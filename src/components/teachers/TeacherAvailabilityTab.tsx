"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teacherAvailabilityService } from "@/services/teacherConstraintService";
import type { TeacherAvailability } from "@/types/teacher";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TeacherAvailabilityTabProps {
  teacherId: string;
}

export function TeacherAvailabilityTab({ teacherId }: TeacherAvailabilityTabProps) {
  const [items, setItems] = useState<TeacherAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [periodNumber, setPeriodNumber] = useState("1");
  const [available, setAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await teacherAvailabilityService.getAvailability(teacherId);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
      toast.error("Could not load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) loadData();
  }, [teacherId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await teacherAvailabilityService.createAvailability(teacherId, {
        day_of_week: parseInt(dayOfWeek, 10),
        period_number: parseInt(periodNumber, 10),
        available,
      });
      await loadData();
      setModalOpen(false);
      setDayOfWeek("1");
      setPeriodNumber("1");
      setAvailable(false);
      toast.success("Availability added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this availability slot?")) return;
    setDeleting(id);
    try {
      await teacherAvailabilityService.deleteAvailability(teacherId, id);
      await loadData();
      toast.success("Availability removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Availability</CardTitle>
            <CardDescription>
              Periods when teacher is available/unavailable (for timetable)
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1">
            <Plus className="size-4" />
            Add Slot
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No availability slots configured.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {DAY_NAMES[item.day_of_week] ?? `Day ${item.day_of_week}`} • Period {item.period_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.available ? "Available" : "Unavailable"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {DAY_NAMES[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={periodNumber} onValueChange={setPeriodNumber}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      Period {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={available ? "yes" : "no"} onValueChange={(v) => setAvailable(v === "yes")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Available</SelectItem>
                  <SelectItem value="no">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
