"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transportService, type TransportGlobalStop } from "@/services/transportService";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

function parseApiError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string") {
    return (e as { message: string }).message;
  }
  return e instanceof Error ? e.message : "Request failed";
}

export default function TransportStopsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransportGlobalStop | null>(null);

  const [formName, setFormName] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formLandmark, setFormLandmark] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formActive, setFormActive] = useState(true);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["transport", "global-stops", search, areaFilter],
    queryFn: () =>
      transportService.listGlobalStops({
        search: search.trim() || undefined,
        area: areaFilter || undefined,
        withUsage: true,
        includeInactive: true,
      }),
  });

  const areas = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.area?.trim()) s.add(r.area.trim());
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormArea("");
    setFormLandmark("");
    setFormLat("");
    setFormLng("");
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEdit = (r: TransportGlobalStop) => {
    setEditing(r);
    setFormName(r.name);
    setFormArea(r.area ?? "");
    setFormLandmark(r.landmark ?? "");
    setFormLat(r.latitude != null ? String(r.latitude) : "");
    setFormLng(r.longitude != null ? String(r.longitude) : "");
    setFormActive(r.is_active);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const lat = formLat.trim() ? Number(formLat) : undefined;
      const lng = formLng.trim() ? Number(formLng) : undefined;
      if (formLat.trim() && Number.isNaN(lat)) throw new Error("Invalid latitude");
      if (formLng.trim() && Number.isNaN(lng)) throw new Error("Invalid longitude");

      const body = {
        name: formName.trim(),
        area: formArea.trim() || null,
        landmark: formLandmark.trim() || null,
        latitude: lat,
        longitude: lng,
        is_active: formActive,
      };
      if (!body.name) throw new Error("Name is required");

      if (editing) {
        await transportService.updateStop(editing.id, body);
      } else {
        await transportService.createGlobalStop(body);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Stop updated" : "Stop created");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["transport", "global-stops"] });
      qc.invalidateQueries({ queryKey: ["transport", "stop-search"] });
    },
    onError: (e: unknown) => toast.error(parseApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => transportService.deleteStop(id),
    onSuccess: () => {
      toast.success("Stop deleted");
      qc.invalidateQueries({ queryKey: ["transport", "global-stops"] });
      qc.invalidateQueries({ queryKey: ["transport", "stop-search"] });
    },
    onError: (e: unknown) => toast.error(parseApiError(e)),
  });

  const onDelete = (r: TransportGlobalStop) => {
    const n = r.usage_count ?? 0;
    if (n > 0) {
      toast.error(`This stop is used by ${n} route(s). Remove it from routes first, or deactivate it.`);
      return;
    }
    if (!confirm(`Permanently delete “${r.name}”?`)) return;
    deleteMutation.mutate(r.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stop master</h1>
          <p className="text-sm text-muted-foreground">
            Reusable stops for routes. Names are unique per school (case-insensitive).
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Add stop
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All stops</CardTitle>
          <CardDescription>Search and filter by area; usage counts update when routes change.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, area, landmark…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={areaFilter || "__all"} onValueChange={(v) => setAreaFilter(v === "__all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All areas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Area</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Landmark</th>
                  <th className="px-3 py-2 font-medium">Usage</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No stops yet. Add one to use it on routes.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.area ?? "—"}</td>
                      <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                        {r.landmark ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {(r.usage_count ?? 0) === 0 ? (
                          <span className="text-muted-foreground">0 routes</span>
                        ) : (
                          <Badge variant="secondary">{r.usage_count} routes</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => onDelete(r)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit stop" : "Add stop"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="stop-name">Name</Label>
              <Input
                id="stop-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Alkapuri Gate"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stop-area">Area</Label>
                <Input
                  id="stop-area"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  placeholder="e.g. Alkapuri"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stop-landmark">Landmark</Label>
                <Input
                  id="stop-landmark"
                  value={formLandmark}
                  onChange={(e) => setFormLandmark(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stop-lat">Latitude</Label>
                <Input
                  id="stop-lat"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stop-lng">Longitude</Label>
                <Input
                  id="stop-lng"
                  value={formLng}
                  onChange={(e) => setFormLng(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stop-active"
                className="size-4 rounded border border-input"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              <Label htmlFor="stop-active" className="font-normal">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formName.trim()}
            >
              {saveMutation.isPending ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
