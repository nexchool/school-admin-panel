"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transportService, type TransportScheduleExceptionType } from "@/services/transportService";
import { ExceptionModal } from "@/components/transport/ExceptionModal";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TransportScheduleExceptionsPage() {
  const qc = useQueryClient();
  const { data: academicYears = [], isLoading: ayLoading } = useAcademicYears(true);
  const [academicYearId, setAcademicYearId] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransportScheduleExceptionType>("all");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const exceptionsQ = useQuery({
    queryKey: ["transport", "schedule-exceptions", academicYearId, typeFilter],
    queryFn: () =>
      transportService.listScheduleExceptions({
        academicYearId,
        exceptionType: typeFilter === "all" ? undefined : typeFilter,
      }),
    enabled: !!academicYearId,
  });

  const rows = useMemo(() => exceptionsQ.data ?? [], [exceptionsQ.data]);

  const invalidateTimelines = () => {
    qc.invalidateQueries({ queryKey: ["transport", "schedule-exceptions"] });
    qc.invalidateQueries({ queryKey: ["transport", "workload"] });
    qc.invalidateQueries({ queryKey: ["transport", "bus"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this exception?")) return;
    try {
      await transportService.deleteScheduleException(id);
      toast.success("Exception removed");
      invalidateTimelines();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule exceptions</h1>
          <p className="text-muted-foreground max-w-2xl">
            One-off overrides (e.g. run on a holiday) or cancellations for a single date. Recurring
            schedules are not modified.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/transport/schedules">Recurring schedules</Link>
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)} disabled={!academicYearId}>
            <Plus className="mr-2 size-4" />
            Add exception
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Academic year</label>
        {ayLoading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
          >
            <option value="">Select year…</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type</span>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="override">Override</SelectItem>
              <SelectItem value="cancellation">Cancellation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {exceptionsQ.error && (
        <p className="text-sm text-destructive">{(exceptionsQ.error as Error).message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exceptions</CardTitle>
          <CardDescription>Date, type, route, and resources (for overrides).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Route / schedule</th>
                  <th className="px-3 py-3 font-medium">Window</th>
                  <th className="px-3 py-3 font-medium">Bus / driver</th>
                  <th className="px-3 py-3 font-medium">Reason</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {exceptionsQ.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-3 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!exceptionsQ.isLoading &&
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-3 tabular-nums">{r.exception_date}</td>
                      <td className="px-3 py-3 capitalize">{r.exception_type}</td>
                      <td className="px-3 py-3">
                        {r.exception_type === "cancellation" && r.schedule ? (
                          <span>
                            {r.schedule.route?.name ?? "Route"} · {r.schedule.shift_type}{" "}
                            {r.schedule.start_time}–{r.schedule.end_time}
                          </span>
                        ) : (
                          r.route?.name ?? "—"
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {r.start_time && r.end_time
                          ? `${r.start_time}–${r.end_time}`
                          : r.exception_type === "cancellation"
                            ? "—"
                            : "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {r.exception_type === "override" ? (
                          <>
                            {r.bus?.bus_number ?? "—"} · {r.driver?.name ?? "—"}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground max-w-[200px] truncate">
                        {r.reason ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          aria-label="Delete exception"
                          onClick={() => remove(r.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!exceptionsQ.isLoading && rows.length === 0 && (
              <p className="px-3 py-10 text-center text-muted-foreground">
                No exceptions for this filter.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ExceptionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        academicYearId={academicYearId}
        onCreated={invalidateTimelines}
      />
    </div>
  );
}
