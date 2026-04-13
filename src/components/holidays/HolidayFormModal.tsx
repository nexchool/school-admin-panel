"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import type { Holiday, CreateHolidayPayload } from "@/services/holidayService";
import { toast } from "sonner";

interface HolidayFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Holiday | null;
  onSubmit: (payload: CreateHolidayPayload & { id?: string }) => Promise<void>;
}

export function HolidayFormModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: HolidayFormModalProps) {
  const [name, setName] = useState("");
  const [holidayType, setHolidayType] = useState("school");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name ?? "");
        setHolidayType(initialData.holiday_type || "school");
        setIsRecurring(initialData.is_recurring ?? false);
        setRecurringDay(String(initialData.recurring_day_of_week ?? 0));
        setStartDate(initialData.start_date ?? "");
        setEndDate(initialData.end_date ?? "");
      } else {
        setName("");
        setHolidayType("school");
        setStartDate("");
        setEndDate("");
        setIsRecurring(false);
        setRecurringDay("0");
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (isRecurring && !recurringDay) {
      toast.error("Select a day for recurring holiday");
      return;
    }
    if (!isRecurring && !startDate) {
      toast.error("Start date is required for non-recurring holiday");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        name: name.trim(),
        holiday_type: holidayType,
        is_recurring: isRecurring,
        ...(isRecurring
          ? { recurring_day_of_week: parseInt(recurringDay, 10) }
          : { start_date: startDate, end_date: endDate || startDate }),
      });
    } catch {
      // Parent shows toast on API failure
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diwali"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={holidayType} onValueChange={setHolidayType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
                <SelectItem value="weekly_off">Weekly Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recurring (weekly off)</Label>
            <Select
              value={isRecurring ? "yes" : "no"}
              onValueChange={(v) => setIsRecurring(v === "yes")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isRecurring ? (
            <div className="space-y-2">
              <Label>Day of week</Label>
              <Select value={recurringDay} onValueChange={setRecurringDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { v: "0", l: "Monday" },
                    { v: "1", l: "Tuesday" },
                    { v: "2", l: "Wednesday" },
                    { v: "3", l: "Thursday" },
                    { v: "4", l: "Friday" },
                    { v: "5", l: "Saturday" },
                    { v: "6", l: "Sunday" },
                  ].map(({ v, l }) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (initialData ? "Saving…" : "Creating…") : initialData ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
