"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teacherWorkloadService } from "@/services/teacherConstraintService";
import type { TeacherWorkload } from "@/types/teacher";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeacherWorkloadTabProps {
  teacherId: string;
}

export function TeacherWorkloadTab({ teacherId }: TeacherWorkloadTabProps) {
  const [workload, setWorkload] = useState<TeacherWorkload | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxPerDay, setMaxPerDay] = useState("6");
  const [maxPerWeek, setMaxPerWeek] = useState("30");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadData = async () => {
    setLoading(true);
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
    } catch {
      setWorkload(null);
      setMaxPerDay("6");
      setMaxPerWeek("30");
      toast.error("Could not load workload");
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Workload</CardTitle>
          <CardDescription>
            Max periods per day/week (for timetable generation)
          </CardDescription>
        </div>
        {!editing && (
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
                {saving ? "Saving…" : "Save"}
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
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Max per day:</span>{" "}
              {workload?.max_periods_per_day ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Max per week:</span>{" "}
              {workload?.max_periods_per_week ?? "—"}
            </p>
            {!workload && (
              <p className="text-sm text-muted-foreground">
                No workload configured. Click Edit to set limits.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
