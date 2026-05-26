"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks";
import {
  yearTransitionService,
  type PromotionHistoryItem,
} from "@/services/yearTransitionService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

const PAGE_SIZE = 20;

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function summaryStat(
  summary: Record<string, unknown> | null,
  key: string
): string {
  const v = summary?.[key];
  return typeof v === "number" ? String(v) : "—";
}

function statusBadge(status: string) {
  const ok = status === "completed";
  return (
    <span
      className={
        ok
          ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600"
          : "rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive"
      }
    >
      {status}
    </span>
  );
}

function HistoryRow({ item }: { item: PromotionHistoryItem }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-3 align-top text-xs">
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          {item.id.slice(0, 8)}…
        </code>
      </td>
      <td className="px-3 py-3 align-top text-sm">
        <div className="font-medium">
          {item.from_academic_year_name ?? "—"} →{" "}
          {item.to_academic_year_name ?? "—"}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(item.created_at)}
        </p>
      </td>
      <td className="px-3 py-3 align-top">{statusBadge(item.status)}</td>
      <td className="px-3 py-3 align-top text-xs text-muted-foreground">
        <div>Promoted: {summaryStat(item.summary, "promoted")}</div>
        <div>Repeated: {summaryStat(item.summary, "repeated")}</div>
        <div>Graduated: {summaryStat(item.summary, "graduated")}</div>
        <div>Skipped: {summaryStat(item.summary, "skipped")}</div>
        <div>Total: {summaryStat(item.summary, "total_enrollments")}</div>
      </td>
    </tr>
  );
}

export default function PromotionHistoryPage() {
  const { hasPermission } = useAuth();
  const canAccess =
    hasPermission("student.update") ||
    hasPermission("student.manage") ||
    hasPermission("student.read.all");

  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["year-transition-history", page],
    queryFn: () => yearTransitionService.listPromotionHistory(page, PAGE_SIZE),
    enabled: canAccess,
  });

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access denied</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          You need student read or update permissions to view promotion history.
        </p>
        <Button asChild variant="outline">
          <Link href="/academics">Back to academics</Link>
        </Button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/dashboard/academics/year-transition">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Year transition
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Promotion history
        </h1>
        <p className="text-sm text-muted-foreground">
          Past student promotion batches with summary counts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent batches</CardTitle>
          <CardDescription>
            Each row represents one execute-promotion run. Old enrollments and
            audit data are preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : isError ? (
            <div className="space-y-2 text-sm">
              <p className="text-destructive">Failed to load history.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transitions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 font-medium">From → To</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Counts</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <HistoryRow key={it.id} item={it} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                Page {pagination.page} of {totalPages} — {pagination.total}{" "}
                batch(es).
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={totalPages <= page}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
