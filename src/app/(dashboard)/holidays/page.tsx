"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { holidayService } from "@/services/holidayService";
import type { Holiday } from "@/services/holidayService";
import { HolidayFormModal } from "@/components/holidays/HolidayFormModal";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadHolidays = () => {
    setLoading(true);
    holidayService
      .getHolidays({ include_recurring: true })
      .then(setHolidays)
      .catch(() => {
        setHolidays([]);
        toast.error("Could not load holidays");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const openCreate = () => {
    setEditHoliday(null);
    setFormOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditHoliday(h);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: {
    id?: string;
    name: string;
    holiday_type: string;
    is_recurring: boolean;
    recurring_day_of_week?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      if (payload.id) {
        await holidayService.updateHoliday(payload.id, {
          name: payload.name,
          holiday_type: payload.holiday_type,
          is_recurring: payload.is_recurring,
          recurring_day_of_week: payload.recurring_day_of_week,
          start_date: payload.start_date,
          end_date: payload.end_date,
        });
        toast.success("Holiday updated");
      } else {
        await holidayService.createHoliday({
          name: payload.name,
          holiday_type: payload.holiday_type,
          is_recurring: payload.is_recurring,
          recurring_day_of_week: payload.recurring_day_of_week,
          start_date: payload.start_date,
          end_date: payload.end_date,
        });
        toast.success("Holiday added");
      }
      setFormOpen(false);
      setEditHoliday(null);
      loadHolidays();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save holiday");
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteHoliday) return;
    setDeleting(true);
    try {
      await holidayService.deleteHoliday(deleteHoliday.id);
      toast.success("Holiday deleted");
      setDeleteHoliday(null);
      loadHolidays();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Holiday>[] = [
    { key: "name", header: "Name" },
    {
      key: "holiday_type",
      header: "Type",
      cell: (r) => (r.holiday_type || "school").replace("_", " "),
    },
    {
      key: "dates",
      header: "Dates",
      cell: (r) =>
        r.is_recurring
          ? r.recurring_day_name || `Day ${r.recurring_day_of_week}`
          : r.start_date && r.end_date
            ? `${r.start_date} – ${r.end_date}`
            : r.start_date || "—",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteHoliday(r);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Holidays</h1>
          <p className="text-muted-foreground">
            Manage school holidays and weekly offs.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Add Holiday
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holiday List</CardTitle>
          <CardDescription>
            View all holidays including recurring weekly offs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={holidays}
            getRowId={(row) => row.id}
            isLoading={loading}
            emptyMessage="No holidays found. Add a holiday to get started."
          />
        </CardContent>
      </Card>

      <HolidayFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditHoliday(null);
        }}
        initialData={editHoliday}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={!!deleteHoliday} onOpenChange={(o) => !o && setDeleteHoliday(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete &quot;{deleteHoliday?.name}&quot;? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteHoliday(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
