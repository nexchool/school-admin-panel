"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQuery } from "@/hooks/useTenantQuery";
import {
  academicYearsService,
  type AcademicYear,
} from "@/services/academicYearsService";
import { academicStructureService } from "@/services/academicStructureService";
import { academicYearsKeys } from "@/hooks/useAcademicYears";
import { useAuth } from "@/hooks";
import { ApiException } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { CalendarRange, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errorToast";

const SETTINGS_KEY = ["academics", "settings"] as const;

function fmtRange(start: string, end: string) {
  try {
    const a = new Date(start + "T12:00:00");
    const b = new Date(end + "T12:00:00");
    return `${a.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${b.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export default function AcademicYearsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("class.manage");

  const { data: years = [], isLoading } = useTenantQuery({
    queryKey: academicYearsKeys.list(false),
    queryFn: () => academicStructureService.academicYears(false),
  });
  const activeYear = years.find((y) => y.is_active !== false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    const y = new Date().getFullYear();
    setStartDate(`${y}-04-01`);
    setEndDate(`${y + 1}-03-31`);
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (row: AcademicYear) => {
    setEditing(row);
    setName(row.name);
    setStartDate(row.start_date.slice(0, 10));
    setEndDate(row.end_date.slice(0, 10));
    setIsActive(row.is_active !== false);
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
      };
      if (!payload.name || !payload.start_date || !payload.end_date) {
        throw new Error("Name and both dates are required.");
      }
      if (new Date(payload.end_date) <= new Date(payload.start_date)) {
        throw new Error("End date must be after the start date.");
      }
      if (editing) {
        return academicYearsService.updateAcademicYear(editing.id, payload);
      }
      return academicYearsService.createAcademicYear(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Academic year updated" : "Academic year created");
      setFormOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: academicYearsKeys.all });
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
    onError: (e: unknown) => {
      toastError(e, "Save failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => academicYearsService.deleteAcademicYear(id),
    onSuccess: () => {
      toast.success("Academic year deleted");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: academicYearsKeys.all });
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiException
          ? e.message
          : e instanceof Error
            ? e.message
            : "Delete failed";
      toast.error(msg);
    },
  });

  const columns: DataTableColumn<AcademicYear>[] = [
    { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "range",
      header: "Period",
      cell: (r) => (
        <span className="text-muted-foreground">{fmtRange(r.start_date, r.end_date)}</span>
      ),
    },
    {
      key: "active",
      header: "Active",
      cell: (r) => (r.is_active === false ? "No" : "Yes"),
    },
    {
      key: "actions",
      header: "",
      className: "w-[120px] text-right",
      cell: (r) =>
        canManage ? (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(r)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Academic Years</h1>
          <p className="text-sm text-muted-foreground">Academics › Academic Years</p>
        </div>
        {canManage && (
          <Button type="button" onClick={openCreate} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" />
            New academic year
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Years</p>
            <p className="text-2xl font-semibold text-foreground">{years.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Active Year</p>
            <p className="truncate text-2xl font-semibold text-foreground">
              {activeYear?.name ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Current Period</p>
            <p className="mt-1.5 text-sm font-medium text-foreground">
              {activeYear ? fmtRange(activeYear.start_date, activeYear.end_date) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">All years</CardTitle>
              <CardDescription>
                The current year for timetables and defaults can be set under Academic settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<AcademicYear>
            columns={columns}
            data={years}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            emptyMessage="No academic years yet. Add one before creating classes or fee structures."
          />
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit academic year" : "New academic year"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ay-name">Display name</Label>
              <Input
                id="ay-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026-2027"
                maxLength={20}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ay-start">Start date</Label>
                <Input
                  id="ay-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ay-end">End date</Label>
                <Input
                  id="ay-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete academic year?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget
              ? `This will remove “${deleteTarget.name}” only if no classes, students, or fee structures use it.`
              : ""}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
