"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teacherWorkloadService } from "@/services/teacherConstraintService";
import { ApiException } from "@/services/api";
import type { TeacherWorkload } from "@/types/teacher";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { InfoBanner, DetailTable } from "@/components/detail";

interface TeacherWorkloadTabProps {
  teacherId: string;
}

export function TeacherWorkloadTab({ teacherId }: TeacherWorkloadTabProps) {
  const [workload, setWorkload] = useState<TeacherWorkload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maxPerDay, setMaxPerDay] = useState("6");
  const [maxPerWeek, setMaxPerWeek] = useState("30");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await teacherWorkloadService.getWorkload(teacherId);
      if (data) {
        setWorkload(data);
        setMaxPerDay(String(data.max_periods_per_day));
        setMaxPerWeek(String(data.max_periods_per_week));
      } else {
        setWorkload(null);
        setMaxPerDay("6");
        setMaxPerWeek("30");
      }
    } catch (err) {
      setWorkload(null);
      setMaxPerDay("6");
      setMaxPerWeek("30");
      // A 404 just means no workload is configured yet. Don't treat as an error.
      if (err instanceof ApiException && err.status === 404) {
        // Silent — handled by the "not configured" banner below.
      } else {
        const msg =
          err instanceof Error ? err.message : "Could not load workload";
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) loadData();
  }, [teacherId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const perDay = parseInt(maxPerDay, 10);
    const perWeek = parseInt(maxPerWeek, 10);
    if (isNaN(perDay) || perDay < 1 || isNaN(perWeek) || perWeek < 1) {
      toast.error("Valid numbers required (min 1)");
      return;
    }
    setSaving(true);
    try {
      if (workload) {
        await teacherWorkloadService.updateWorkload(teacherId, {
          max_periods_per_day: perDay,
          max_periods_per_week: perWeek,
        });
      } else {
        await teacherWorkloadService.createWorkload(teacherId, {
          max_periods_per_day: perDay,
          max_periods_per_week: perWeek,
        });
      }
      await loadData();
      setEditing(false);
      toast.success("Workload saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
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
    <div className="space-y-4">
      {!workload && !loadError && !editing && (
        <InfoBanner
          tone="warning"
          icon={AlertTriangle}
          title="Workload not configured"
          description={
            <>
              <p>
                Please add a workload for this teacher to enable better
                timetable generation.
              </p>
              <p className="mt-1">
                It is strongly advisable to configure a workload — these limits
                (max periods per day/week) are used by the timetable generator
                to avoid over-assigning periods to a teacher.
              </p>
            </>
          }
          actions={
            <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Plus className="size-4" />
              Add Workload
            </Button>
          }
        />
      )}

      {loadError && (
        <InfoBanner
          tone="warning"
          icon={AlertTriangle}
          title="Could not load workload"
          description={loadError}
          actions={
            <Button size="sm" variant="outline" onClick={loadData}>
              Retry
            </Button>
          }
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Workload</CardTitle>
            <CardDescription>
              Max periods per day / week (for timetable generation)
            </CardDescription>
          </div>
          {!editing && workload && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Max periods per day</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={maxPerDay}
                  onChange={(e) => setMaxPerDay(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max periods per week</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={maxPerWeek}
                  onChange={(e) => setMaxPerWeek(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : workload ? "Save" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    if (workload) {
                      setMaxPerDay(String(workload.max_periods_per_day));
                      setMaxPerWeek(String(workload.max_periods_per_week));
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : workload ? (
            <DetailTable
              rows={[
                ["Max periods per day", workload.max_periods_per_day],
                ["Max periods per week", workload.max_periods_per_week],
              ]}
            />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No workload configured yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
