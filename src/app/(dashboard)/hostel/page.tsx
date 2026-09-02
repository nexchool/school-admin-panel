"use client";

import { useMemo, useState } from "react";
import { Plus, Search, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { HostelCard } from "@/components/hostel/HostelCard";
import {
  HostelFormDialog,
  HostelFormValues,
} from "@/components/hostel/HostelFormDialog";

import {
  useCreateHostel,
  useHostelDashboard,
  useHostels,
} from "@/hooks/useHostel";
import type { OccupancyRow } from "@/services/hostelService";

/**
 * Screen 1 — Hostels overview.
 *
 * Lays out one card per hostel with occupancy bar, vacant counts, and an
 * alert badge when there are overdue gatepasses for that hostel. The
 * dashboard API supplies the per-hostel occupancy and overdue list in
 * one round trip; we group them by hostel_id on the client.
 *
 * Responsive: 1 col on mobile, 2 on tablet, 3 on desktop.
 */
export default function HostelsOverviewPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const hostelsQuery = useHostels();
  const dashboardQuery = useHostelDashboard();
  const createHostel = useCreateHostel();

  const occupancyByHostelId = useMemo(() => {
    const map = new Map<string, OccupancyRow>();
    for (const row of dashboardQuery.data?.occupancy ?? []) {
      map.set(row.hostel_id, row);
    }
    return map;
  }, [dashboardQuery.data]);

  const overdueCountsByHostelId = useMemo(() => {
    const map = new Map<string, number>();
    for (const gp of dashboardQuery.data?.overdue_gatepasses ?? []) {
      map.set(gp.hostel_id, (map.get(gp.hostel_id) ?? 0) + 1);
    }
    return map;
  }, [dashboardQuery.data]);

  const filteredHostels = useMemo(() => {
    const all = hostelsQuery.data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.address ?? "").toLowerCase().includes(q) ||
        (h.warden_name ?? "").toLowerCase().includes(q)
    );
  }, [hostelsQuery.data, search]);

  async function handleCreate(values: HostelFormValues) {
    await createHostel.mutateAsync({
      name: values.name,
      capacity: values.capacity,
      warden_name: values.warden_name?.trim() || undefined,
      warden_phone: values.warden_phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
    });
    setCreateOpen(false);
  }

  const isLoading = hostelsQuery.isLoading || dashboardQuery.isLoading;
  const isError = hostelsQuery.isError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hostels</h1>
          <p className="text-muted-foreground">
            Facilities, allocations, visitors, and gatepasses at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/hostel/dashboard">
              <LayoutDashboard className="mr-2 size-4" />
              Dashboard
            </Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add hostel
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, address, warden…"
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-9 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-destructive">
              {/* Surface the API's reason — e.g. god-mode hitting a tenant with
                  the hostel feature disabled gets the backend's "disabled for
                  your school" message instead of a misleading generic failure. */}
              {hostelsQuery.error instanceof Error && hostelsQuery.error.message
                ? hostelsQuery.error.message
                : "Failed to load hostels."}
            </p>
            <Button
              variant="outline"
              onClick={() => hostelsQuery.refetch()}
              className="gap-2"
            >
              <RotateCcw className="size-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredHostels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-lg font-medium">No hostels yet</p>
            <p className="text-sm text-muted-foreground">
              {search
                ? "No hostels match your search."
                : "Get started by adding your first hostel facility."}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add hostel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHostels.map((hostel) => (
            <HostelCard
              key={hostel.id}
              hostel={hostel}
              occupancy={occupancyByHostelId.get(hostel.id)}
              overdueCount={overdueCountsByHostelId.get(hostel.id) ?? 0}
            />
          ))}
        </div>
      )}

      <HostelFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        saving={createHostel.isPending}
      />
    </div>
  );
}
