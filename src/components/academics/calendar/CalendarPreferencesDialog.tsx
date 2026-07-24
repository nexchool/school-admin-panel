"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { toastError } from "@/lib/errorToast";
import type { CalendarPreferences } from "@/services/academicCalendarService";
import { useUpdateCalendarPreferences } from "@/hooks/useAcademicCalendar";

const FIELDS: {
  key: keyof CalendarPreferences;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "default_view",
    label: "Default view",
    options: [
      { value: "month", label: "Month" },
      { value: "week", label: "Week" },
      { value: "list", label: "List" },
    ],
  },
  {
    key: "week_start",
    label: "Week starts on",
    options: [
      { value: "monday", label: "Monday" },
      { value: "sunday", label: "Sunday" },
    ],
  },
  {
    key: "date_format",
    label: "Date format",
    options: [
      { value: "dd_mmm_yyyy", label: "15 Aug 2026" },
      { value: "yyyy_mm_dd", label: "2026-08-15" },
      { value: "mm_dd_yyyy", label: "08/15/2026" },
    ],
  },
  {
    key: "time_format",
    label: "Time format",
    options: [
      { value: "24h", label: "24-hour" },
      { value: "12h", label: "12-hour" },
    ],
  },
  {
    key: "default_event_color",
    label: "Default event color",
    options: [
      { value: "amber", label: "Amber" },
      { value: "blue", label: "Blue" },
      { value: "green", label: "Green" },
      { value: "red", label: "Red" },
      { value: "violet", label: "Violet" },
      { value: "gray", label: "Gray" },
    ],
  },
];

interface CalendarPreferencesDialogProps {
  calendarId: string;
  preferences: CalendarPreferences;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (prefs: CalendarPreferences) => void;
}

/** Per-calendar UI preferences (default view/month, week start, formats, color). */
export function CalendarPreferencesDialog({
  calendarId,
  preferences,
  open,
  onOpenChange,
  onSaved,
}: CalendarPreferencesDialogProps) {
  const [draft, setDraft] = useState<CalendarPreferences>(preferences);
  const save = useUpdateCalendarPreferences();

  const set = <K extends keyof CalendarPreferences>(
    key: K,
    value: CalendarPreferences[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    save.mutate(
      { id: calendarId, prefs: draft },
      {
        onSuccess: () => {
          toast.success("Preferences saved");
          onSaved?.(draft);
          onOpenChange(false);
        },
        onError: (e) => toastError(e, "Could not save preferences"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(preferences); // reset to stored on open
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calendar preferences</DialogTitle>
          <DialogDescription>
            These apply to this academic year&apos;s calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Select
                value={draft[field.key] as string}
                onValueChange={(v) =>
                  set(field.key, v as CalendarPreferences[typeof field.key])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="default-month">Default month (optional)</Label>
            <Input
              id="default-month"
              type="month"
              value={draft.default_month ?? ""}
              onChange={(e) => set("default_month", e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to open on the current month.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
