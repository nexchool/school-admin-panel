"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClasses } from "@/hooks/useClasses";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useTimetableVersions } from "@/hooks/useTimetable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";

// Per-class status row — loads versions lazily only when rendered
function ClassRow({ cls }: { cls: { id: string; name: string; section?: string; academic_year?: string | null } }) {
  const router = useRouter();
  const { data: versions, isLoading } = useTimetableVersions(cls.id);

  const active = versions?.find((v) => v.status === "active");
  const drafts = versions?.filter((v) => v.status === "draft") ?? [];
  const hasConflicts = false; // conflict info comes from the bundle; shown in editor

  return (
    <tr
      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
      onClick={() => router.push(`/timetable/${cls.id}`)}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-foreground">
          {cls.name} – {cls.section}
        </div>
        <div className="text-xs text-muted-foreground">{cls.academic_year ?? "—"}</div>
      </td>
      <td className="px-4 py-3">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : active ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-green-500" />
            <span className="text-xs font-medium text-green-700">{active.label || "Active"}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isLoading ? null : (
          <span className="text-xs text-muted-foreground">
            {drafts.length > 0 ? `${drafts.length} draft${drafts.length > 1 ? "s" : ""}` : "—"}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {hasConflicts ? (
          <div className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="size-3.5" />
            <span className="text-xs">Conflicts</span>
          </div>
        ) : active ? (
          <Badge className="bg-green-50 text-green-700 hover:bg-green-50 text-xs">Published</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">No timetable</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </td>
    </tr>
  );
}

export default function TimetablePage() {
  const [yearFilter, setYearFilter] = useState<string>("");
  const { data: academicYears = [] } = useAcademicYears();
  const { data: allClasses = [], isLoading } = useClasses(
    yearFilter ? { academic_year_id: yearFilter } : undefined
  );

  const sortedClasses = useMemo(
    () =>
      [...allClasses].sort((a, b) =>
        `${a.name} ${a.section}`.localeCompare(`${b.name} ${b.section}`)
      ),
    [allClasses]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Timetables</h1>
        <p className="text-sm text-muted-foreground">
          Manage timetable versions for each class. Draft, generate, edit, and publish.
        </p>
      </div>

      {/* Academic year filter */}
      {academicYears.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Year:</span>
          <button
            type="button"
            onClick={() => setYearFilter("")}
            className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${
              !yearFilter
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          {academicYears.map((y) => (
            <button
              key={y.id}
              type="button"
              onClick={() => setYearFilter(y.id)}
              className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${
                yearFilter === y.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {y.name ?? y.id}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Calendar className="size-8 opacity-40" />
            <p className="text-sm">No classes found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Class</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Active version</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Drafts</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sortedClasses.map((cls) => (
                  <ClassRow key={cls.id} cls={cls} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
