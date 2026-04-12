"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BellPeriod {
  id: string;
  bell_schedule_id: string;
  period_number: number;
  period_kind: "lesson" | "break" | "lunch" | "assembly" | "other" | string;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  sort_order: number;
}

interface BellScheduleDetail {
  id: string;
  name: string;
  academic_year_id: string | null;
  periods: BellPeriod[];
  /** Active + draft timetable versions that reference this bell schedule */
  timetable_versions_linked?: number;
}

interface AcademicSettings {
  default_bell_schedule_id: string | null;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const bellKey = (id: string) => ["academics", "bell-schedules", id] as const;
const BELL_LIST_KEY = ["academics", "bell-schedules"] as const;
const SETTINGS_KEY = ["academics", "settings"] as const;

// ── Period kind config ─────────────────────────────────────────────────────────

const PERIOD_KINDS = [
  { value: "lesson", label: "Lesson" },
  { value: "break", label: "Break" },
  { value: "lunch", label: "Lunch" },
  { value: "assembly", label: "Assembly" },
  { value: "other", label: "Other" },
] as const;

const KIND_STYLES: Record<string, { bg: string; text: string; border: string; timeline: string }> = {
  lesson:   { bg: "bg-primary/10",     text: "text-primary",   border: "border-primary/20",  timeline: "bg-primary/20" },
  break:    { bg: "bg-amber-50 dark:bg-amber-900/20",   text: "text-amber-700 dark:text-amber-400",  border: "border-amber-200 dark:border-amber-800", timeline: "bg-amber-200 dark:bg-amber-800" },
  lunch:    { bg: "bg-green-50 dark:bg-green-900/20",   text: "text-green-700 dark:text-green-400",  border: "border-green-200 dark:border-green-800", timeline: "bg-green-200 dark:bg-green-800" },
  assembly: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", timeline: "bg-purple-200 dark:bg-purple-800" },
  other:    { bg: "bg-muted",           text: "text-muted-foreground", border: "border-border", timeline: "bg-muted-foreground/20" },
};

function kindStyles(kind: string) {
  return KIND_STYLES[kind] ?? KIND_STYLES.other;
}

// ── Time helpers ───────────────────────────────────────────────────────────────

function parseTimeToMinutes(t: string | null): number | null {
  if (!t) return null;
  // datetime "2024-01-01T09:00:00" → slice(11,16); plain time "09:00:00" → slice(0,5)
  const clean = t.length >= 16 ? t.slice(11, 16) : t.slice(0, 5);
  const [h, m] = clean.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const clean = t.length >= 16 ? t.slice(11, 16) : t.slice(0, 5);
  return clean;
}

/** Half-open [s1,e1) vs [s2,e2) overlap in minutes (touching at boundary = no overlap). */
function clockIntervalsOverlapMins(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}

// ── Empty period form state ───────────────────────────────────────────────────

interface PeriodFormState {
  period_number: string;
  period_kind: string;
  label: string;
  starts_at: string;
  ends_at: string;
}

const EMPTY_FORM: PeriodFormState = {
  period_number: "",
  period_kind: "lesson",
  label: "",
  starts_at: "08:00",
  ends_at: "08:45",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BellScheduleDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const qc = useQueryClient();
  const { hasAnyPermission } = useAuth();
  const canManage = hasAnyPermission(["academics.manage", "timetable.manage"]);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const [periodForm, setPeriodForm] = useState<PeriodFormState>(EMPTY_FORM);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);

  // Fetch schedule — the route returns success_response(data=bell_schedule),
  // so handleResponse unwraps to the schedule object directly.
  const { data: schedule, isLoading } = useQuery({
    queryKey: bellKey(id),
    queryFn: () => apiGet<BellScheduleDetail>(`/api/academics/bell-schedules/${id}`),
    enabled: !!id,
  });

  // Fetch settings for tenant default check
  const { data: settings } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiGet<AcademicSettings>("/api/academics/settings"),
  });
  const isTenantDefault = settings?.default_bell_schedule_id === id;

  // Sorted periods
  const periods = useMemo(
    () => [...(schedule?.periods ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.period_number - b.period_number),
    [schedule?.periods]
  );

  // ── Mutations ────────────────────────────────────────────────────────────────

  const renameMut = useMutation({
    mutationFn: (name: string) => apiPatch(`/api/academics/bell-schedules/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bellKey(id) });
      qc.invalidateQueries({ queryKey: BELL_LIST_KEY });
      setEditingName(false);
      toast.success("Schedule renamed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to rename"),
  });

  const setDefaultMut = useMutation({
    mutationFn: () =>
      apiPatch("/api/academics/settings", {
        default_bell_schedule_id: isTenantDefault ? null : id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      qc.invalidateQueries({ queryKey: BELL_LIST_KEY });
      toast.success(isTenantDefault ? "Default cleared" : "Set as tenant default");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update default"),
  });

  const addPeriodMut = useMutation({
    mutationFn: (form: PeriodFormState) =>
      apiPost(`/api/academics/bell-schedules/${id}/periods`, {
        period_number: parseInt(form.period_number, 10),
        period_kind: form.period_kind,
        label: form.label.trim() || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        sort_order: parseInt(form.period_number, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bellKey(id) });
      setAddOpen(false);
      setPeriodForm(EMPTY_FORM);
      setEditingPeriodId(null);
      toast.success("Period added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add period"),
  });

  const editPeriodMut = useMutation({
    mutationFn: ({ pid, form }: { pid: string; form: PeriodFormState }) =>
      apiPatch(`/api/academics/bell-schedules/${id}/periods/${pid}`, {
        period_number: parseInt(form.period_number, 10),
        period_kind: form.period_kind,
        label: form.label.trim() || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        sort_order: parseInt(form.period_number, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bellKey(id) });
      setAddOpen(false);
      setPeriodForm(EMPTY_FORM);
      setEditingPeriodId(null);
      toast.success("Period updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update period"),
  });

  const deletePeriodMut = useMutation({
    mutationFn: (pid: string) =>
      apiDelete(`/api/academics/bell-schedules/${id}/periods/${pid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bellKey(id) });
      setDeletingPeriodId(null);
      toast.success("Period deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete period"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingPeriodId(null);
    const nextNum = periods.length > 0 ? Math.max(...periods.map((p) => p.period_number)) + 1 : 1;
    setPeriodForm({ ...EMPTY_FORM, period_number: String(nextNum) });
    setAddOpen(true);
  };

  const openEdit = (p: BellPeriod) => {
    setEditingPeriodId(p.id);
    setPeriodForm({
      period_number: String(p.period_number),
      period_kind: p.period_kind,
      label: p.label ?? "",
      starts_at: formatTime(p.starts_at),
      ends_at: formatTime(p.ends_at),
    });
    setAddOpen(true);
  };

  const handleFormSubmit = () => {
    if (!periodForm.period_number || !periodForm.starts_at || !periodForm.ends_at) {
      toast.error("Period number, start and end time are required");
      return;
    }
    const s = parseTimeToMinutes(periodForm.starts_at);
    const e = parseTimeToMinutes(periodForm.ends_at);
    if (s === null || e === null || e <= s) {
      toast.error("End time must be after start time");
      return;
    }
    for (const op of periods) {
      if (editingPeriodId && op.id === editingPeriodId) continue;
      const os = parseTimeToMinutes(op.starts_at);
      const oe = parseTimeToMinutes(op.ends_at);
      if (os === null || oe === null) continue;
      if (clockIntervalsOverlapMins(s, e, os, oe)) {
        toast.error(
          `This overlaps period P${op.period_number} (${formatTime(op.starts_at)}–${formatTime(op.ends_at)}). Adjust times so periods do not overlap.`
        );
        return;
      }
    }
    if (editingPeriodId) {
      editPeriodMut.mutate({ pid: editingPeriodId, form: periodForm });
    } else {
      addPeriodMut.mutate(periodForm);
    }
  };

  const isMutating = addPeriodMut.isPending || editPeriodMut.isPending;

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">Bell schedule not found.</p>
        <Link href="/academics/bell-schedules">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="size-3.5" />
            Back to schedules
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/academics/bell-schedules">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            {/* Breadcrumb */}
            <p className="text-xs text-muted-foreground">
              <Link href="/academics" className="hover:underline">Academics</Link>
              {" / "}
              <Link href="/academics/bell-schedules" className="hover:underline">Bell schedules</Link>
            </p>

            {/* Editable name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-lg font-semibold"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draftName.trim()) renameMut.mutate(draftName.trim());
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-primary"
                  onClick={() => draftName.trim() && renameMut.mutate(draftName.trim())}
                  disabled={renameMut.isPending}
                >
                  {renameMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setEditingName(false)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{schedule.name}</h1>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => { setDraftName(schedule.name); setEditingName(true); }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {isTenantDefault && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="mr-1 size-2.5" />
                  Tenant default
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {periods.length} period{periods.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setDefaultMut.mutate()}
              disabled={setDefaultMut.isPending}
            >
              {setDefaultMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isTenantDefault ? (
                <Star className="size-3.5 fill-current text-amber-500" />
              ) : (
                <Star className="size-3.5" />
              )}
              {isTenantDefault ? "Clear default" : "Set as default"}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openAdd}>
              <Plus className="size-3.5" />
              Add period
            </Button>
          </div>
        )}
      </div>

      {/* How bell changes relate to timetables */}
      <Card className="border-border bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Timetables and conflicts</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Timetables store <span className="font-medium text-foreground">period numbers</span>, not stored
            wall-clock times. When you change times here, class grids show the new start/end immediately;
            which subject sits in which period does not move automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-xs text-muted-foreground leading-relaxed">
          <p>
            Teacher conflict checks use <span className="font-medium text-foreground">actual clock time</span> when
            a teacher spans different bell schedules. After editing this schedule, open each affected class under{" "}
            <Link href="/timetable" className="font-medium text-primary underline-offset-4 hover:underline">
              Timetable
            </Link>{" "}
            to see updated conflict badges.
          </p>
          {typeof schedule.timetable_versions_linked === "number" && schedule.timetable_versions_linked > 0 ? (
            <p>
              This schedule is linked to{" "}
              <span className="font-medium text-foreground">{schedule.timetable_versions_linked}</span> active or draft
              timetable version(s).
            </p>
          ) : null}
          <p className="text-foreground/80">
            Periods in a day must not overlap in time — extending one period into the next is blocked until you adjust
            the other period or shorten the first.
          </p>
        </CardContent>
      </Card>

      {/* Timeline visualization */}
      {periods.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Day timeline</CardTitle>
            <CardDescription className="text-xs">
              Visual overview of the full school day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DayTimeline periods={periods} />
          </CardContent>
        </Card>
      )}

      {/* Periods table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Periods</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Lesson periods define valid timetable slots. Break/lunch periods appear in the timeline. Overlapping
              times are not allowed — the server will reject saves that overlap another period.
            </CardDescription>
          </div>
          {canManage && periods.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={openAdd}>
              <Plus className="size-3.5" />
              Add period
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No periods yet.</p>
              {canManage && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openAdd}>
                  <Plus className="size-3.5" />
                  Add first period
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">#</th>
                    <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Kind</th>
                    <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Label</th>
                    <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Start</th>
                    <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">End</th>
                    <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Duration</th>
                    {canManage && <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => {
                    const startMins = parseTimeToMinutes(p.starts_at);
                    const endMins = parseTimeToMinutes(p.ends_at);
                    const durMins = startMins !== null && endMins !== null ? endMins - startMins : null;
                    const ks = kindStyles(p.period_kind);

                    return (
                      <tr key={p.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                          P{p.period_number}
                        </td>
                        <td className="py-3 pr-3">
                          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize", ks.bg, ks.text, ks.border)}>
                            {p.period_kind}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-sm">
                          {p.label || <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">{formatTime(p.starts_at)}</td>
                        <td className="py-3 pr-3 font-mono text-xs">{formatTime(p.ends_at)}</td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground">
                          {durMins !== null ? `${durMins} min` : "—"}
                        </td>
                        {canManage && (
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(p)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingPeriodId(p.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit period dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) { setAddOpen(false); setPeriodForm(EMPTY_FORM); setEditingPeriodId(null); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPeriodId ? "Edit period" : "Add period"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Period number</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={periodForm.period_number}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, period_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kind</label>
                <Select
                  value={periodForm.period_kind}
                  onValueChange={(v) => setPeriodForm((f) => ({ ...f, period_kind: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Label <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Math, Recess, Lunch break"
                value={periodForm.label}
                onChange={(e) => setPeriodForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start time</label>
                <Input
                  type="time"
                  value={periodForm.starts_at}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End time</label>
                <Input
                  type="time"
                  value={periodForm.ends_at}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, ends_at: e.target.value }))}
                />
              </div>
            </div>

            {periodForm.starts_at && periodForm.ends_at && (() => {
              const s = parseTimeToMinutes(periodForm.starts_at);
              const e = parseTimeToMinutes(periodForm.ends_at);
              if (s !== null && e !== null && e <= s) {
                return (
                  <p className="text-xs text-destructive">End time must be after start time.</p>
                );
              }
              if (s !== null && e !== null) {
                return (
                  <p className="text-xs text-muted-foreground">Duration: {e - s} minutes</p>
                );
              }
              return null;
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAddOpen(false); setPeriodForm(EMPTY_FORM); setEditingPeriodId(null); }}
            >
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={isMutating}>
              {isMutating ? <Loader2 className="size-4 animate-spin" /> : editingPeriodId ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete period confirm */}
      <Dialog open={!!deletingPeriodId} onOpenChange={(o) => !o && setDeletingPeriodId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete period</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove this period from the schedule? Timetable entries that reference this period
            number will show a conflict warning.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPeriodId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingPeriodId && deletePeriodMut.mutate(deletingPeriodId)}
              disabled={deletePeriodMut.isPending}
            >
              {deletePeriodMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Day Timeline component ─────────────────────────────────────────────────────

function DayTimeline({ periods }: { periods: BellPeriod[] }) {
  const periodsWithTimes = periods.filter(
    (p) => p.starts_at !== null && p.ends_at !== null
  );

  if (periodsWithTimes.length === 0) {
    return <p className="text-xs text-muted-foreground">Add periods with times to see the timeline.</p>;
  }

  const allMins = periodsWithTimes.flatMap((p) => [
    parseTimeToMinutes(p.starts_at)!,
    parseTimeToMinutes(p.ends_at)!,
  ]);
  const dayStart = Math.min(...allMins);
  const dayEnd = Math.max(...allMins);
  const totalSpan = dayEnd - dayStart;

  if (totalSpan <= 0) return null;

  return (
    <div className="space-y-3">
      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>{minsToTime(dayStart)}</span>
        <span>{minsToTime(dayEnd)}</span>
      </div>

      {/* Timeline bar */}
      <div className="relative flex h-10 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
        {periodsWithTimes.map((p) => {
          const start = parseTimeToMinutes(p.starts_at)!;
          const end = parseTimeToMinutes(p.ends_at)!;
          const leftPct = ((start - dayStart) / totalSpan) * 100;
          const widthPct = ((end - start) / totalSpan) * 100;
          const ks = kindStyles(p.period_kind);

          return (
            <div
              key={p.id}
              className={cn(
                "absolute inset-y-0 flex items-center justify-center overflow-hidden border-r border-border/40 px-1 text-xs font-medium transition-opacity hover:opacity-80",
                ks.timeline
              )}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={`${p.label || p.period_kind} · ${formatTime(p.starts_at)}–${formatTime(p.ends_at)}`}
            >
              {widthPct > 5 && (
                <span className={cn("truncate text-[10px] font-semibold", ks.text)}>
                  {p.label || `P${p.period_number}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(["lesson", "break", "lunch", "assembly", "other"] as const).filter((k) =>
          periodsWithTimes.some((p) => p.period_kind === k)
        ).map((k) => {
          const ks = kindStyles(k);
          return (
            <div key={k} className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-2.5 rounded-sm", ks.timeline)} />
              <span className="text-xs capitalize text-muted-foreground">{k}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
