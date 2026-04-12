"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcademicSettings {
  current_academic_year_id: string | null;
  default_bell_schedule_id: string | null;
  allow_admin_attendance_override: boolean;
  default_working_days_json: number[] | null;
}

interface BellScheduleItem {
  id: string;
  name: string;
  is_default: boolean;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = ["academics", "settings"] as const;
const BELL_SCHEDULES_KEY = ["academics", "bell-schedules"] as const;

// ── Working days picker ───────────────────────────────────────────────────────

const DAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 7, label: "Sun" },
];

function WorkingDaysPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const toggle = (n: number) => {
    onChange(
      value.includes(n) ? value.filter((d) => d !== n).sort() : [...value, n].sort()
    );
  };
  return (
    <div className="flex flex-wrap gap-2">
      {DAYS.map(({ n, label }) => (
        <button
          key={n}
          type="button"
          onClick={() => toggle(n)}
          className={cn(
            "min-w-[52px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value.includes(n)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcademicSettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiGet<AcademicSettings>("/api/academics/settings"),
  });

  const { data: bellSchedulesData } = useQuery({
    queryKey: BELL_SCHEDULES_KEY,
    queryFn: () => apiGet<{ items: BellScheduleItem[] }>("/api/academics/bell-schedules"),
    select: (d) => d.items ?? [],
  });
  const bellSchedules = bellSchedulesData ?? [];

  // Local form state
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [bellScheduleId, setBellScheduleId] = useState<string>("");
  const [allowAdminOverride, setAllowAdminOverride] = useState(true);
  const [dirty, setDirty] = useState(false);

  // Sync from server once loaded
  useEffect(() => {
    if (!settings) return;
    setWorkingDays(settings.default_working_days_json ?? [1, 2, 3, 4, 5, 6]);
    setBellScheduleId(settings.default_bell_schedule_id ?? "");
    setAllowAdminOverride(settings.allow_admin_attendance_override ?? true);
    setDirty(false);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (body: Partial<AcademicSettings & { default_working_days_json: number[] }>) =>
      apiPatch<AcademicSettings>("/api/academics/settings", body),
    onSuccess: (data) => {
      qc.setQueryData(SETTINGS_KEY, data);
      qc.invalidateQueries({ queryKey: ["academics", "bell-schedules"] });
      setDirty(false);
      toast.success("Settings saved");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      default_working_days_json: workingDays,
      default_bell_schedule_id: bellScheduleId || null,
      allow_admin_attendance_override: allowAdminOverride,
    });
  };

  const mark = () => setDirty(true);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/academics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Academic settings</h1>
            <p className="text-sm text-muted-foreground">School-wide defaults for timetable and attendance.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!dirty || saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>

      {/* Working days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working days</CardTitle>
          <CardDescription>
            Default school days used when generating timetables and checking attendance.
            Individual timetable versions can override this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkingDaysPicker
            value={workingDays}
            onChange={(v) => { setWorkingDays(v); mark(); }}
          />
          {workingDays.length === 0 && (
            <p className="mt-2 text-xs text-destructive">Select at least one working day.</p>
          )}
        </CardContent>
      </Card>

      {/* Default bell schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default bell schedule</CardTitle>
          <CardDescription>
            Used when generating a new timetable draft if no schedule is explicitly chosen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bellSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bell schedules created yet.{" "}
              <Link href="/academics/bell-schedules" className="underline underline-offset-4 hover:text-foreground">
                Create one in Bell Schedules.
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setBellScheduleId(""); mark(); }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  !bellScheduleId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                None
              </button>
              {bellSchedules.map((bs) => (
                <button
                  key={bs.id}
                  type="button"
                  onClick={() => { setBellScheduleId(bs.id); mark(); }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    bellScheduleId === bs.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {bs.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Allow admins to override attendance"
            description="Admins can correct or backfill past attendance records."
            value={allowAdminOverride}
            onChange={(v) => { setAllowAdminOverride(v); mark(); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          value ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
