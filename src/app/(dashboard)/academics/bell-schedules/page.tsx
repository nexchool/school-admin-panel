"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/services/api";
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
  ArrowLeft,
  Bell,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BellScheduleListItem {
  id: string;
  name: string;
  is_default: boolean;
  period_count?: number;
  academic_year_id?: string | null;
}

interface BellScheduleListResponse {
  items: BellScheduleListItem[];
  /** School-wide default from academic settings (not the same as row `is_default`). */
  tenant_default_bell_schedule_id?: string | null;
}

interface AcademicSettings {
  default_bell_schedule_id: string | null;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const BELL_KEY = ["academics", "bell-schedules"] as const;
const SETTINGS_KEY = ["academics", "settings"] as const;

// ── Period kind color helpers ─────────────────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  lesson: "bg-primary/10 text-primary border-primary/20",
  break: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  lunch: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  assembly: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  other: "bg-muted text-muted-foreground border-border",
};

export function periodKindClass(kind: string): string {
  return KIND_COLORS[kind] ?? KIND_COLORS.other;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BellSchedulesPage() {
  const qc = useQueryClient();
  const { hasAnyPermission } = useAuth();
  const canManage = hasAnyPermission(["academics.manage", "timetable.manage"]);

  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const { data: listData, isLoading } = useQuery({
    queryKey: BELL_KEY,
    queryFn: () => apiGet<BellScheduleListResponse>("/api/academics/bell-schedules"),
  });
  const schedules = listData?.items ?? [];

  const { data: settings } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiGet<AcademicSettings>("/api/academics/settings"),
  });
  const tenantDefaultId =
    listData?.tenant_default_bell_schedule_id ?? settings?.default_bell_schedule_id ?? null;

  const deletingSchedule = schedules.find((s) => s.id === deletingId);

  const createMut = useMutation({
    mutationFn: (name: string) =>
      apiPost<BellScheduleListItem>("/api/academics/bell-schedules", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BELL_KEY });
      setCreateOpen(false);
      setNewName("");
      toast.success("Bell schedule created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/academics/bell-schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BELL_KEY });
      setDeletingId(null);
      toast.success("Bell schedule deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const isTenantDefault = (id: string) => id === tenantDefaultId;

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
            <h1 className="text-xl font-semibold tracking-tight">Bell schedules</h1>
            <p className="text-sm text-muted-foreground">
              Define daily period timings. Each class timetable uses one bell schedule.
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            New schedule
          </Button>
        )}
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Create one bell schedule per school division (e.g. Play School, Primary, Middle, Senior).
          Assign each schedule to the matching class timetable versions. The tenant default is used
          as a fallback when a new timetable draft is generated without an explicit selection.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState canManage={canManage} onNew={() => setCreateOpen(true)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              isTenantDefault={isTenantDefault(s.id)}
              canManage={canManage}
              onDelete={() => setDeletingId(s.id)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setNewName(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New bell schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. Primary (Std 1–5)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) createMut.mutate(newName.trim());
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Add periods after creating the schedule.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setNewName(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createMut.mutate(newName.trim())}
              disabled={!newName.trim() || createMut.isPending}
            >
              {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete bell schedule</DialogTitle>
          </DialogHeader>
          {isTenantDefault(deletingId ?? "") ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>
                Cannot delete &quot;{deletingSchedule?.name}&quot; — it is the current tenant default.
                Set a different default in Academic Settings first.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Delete &quot;{deletingSchedule?.name}&quot;? This will remove all its periods. Timetable versions
              using this schedule will lose their bell schedule link.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              {isTenantDefault(deletingId ?? "") ? "Close" : "Cancel"}
            </Button>
            {!isTenantDefault(deletingId ?? "") && (
              <Button
                variant="destructive"
                onClick={() => deletingId && deleteMut.mutate(deletingId)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  isTenantDefault,
  canManage,
  onDelete,
}: {
  schedule: BellScheduleListItem;
  isTenantDefault: boolean;
  canManage: boolean;
  onDelete: () => void;
}) {
  const periodCount = schedule.period_count;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card transition-colors hover:bg-muted/30">
      <Link
        href={`/academics/bell-schedules/${schedule.id}`}
        className="flex flex-1 items-start justify-between gap-3 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{schedule.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isTenantDefault && (
                <Badge variant="secondary" className="text-xs">
                  Tenant default
                </Badge>
              )}
              {periodCount !== undefined && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {periodCount} period{periodCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </Link>

      {canManage && (
        <div className="flex items-center justify-end border-t border-border px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground transition-colors",
              "hover:text-destructive hover:bg-destructive/10"
            )}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ canManage, onNew }: { canManage: boolean; onNew: () => void }) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Bell className="size-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-base">No bell schedules yet</CardTitle>
        <CardDescription>
          Bell schedules define the daily period timing for your classes.
          Create separate schedules for each school division.
        </CardDescription>
      </CardHeader>
      {canManage && (
        <CardContent className="flex justify-center">
          <Button onClick={onNew} className="gap-2">
            <Plus className="size-4" />
            Create first schedule
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
