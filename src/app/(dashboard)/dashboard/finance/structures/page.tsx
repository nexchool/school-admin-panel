"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeeStructureFormModal } from "@/components/finance/FeeStructureFormModal";
import { ArrowLeft, Bus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useFeeStructures, useDeleteFeeStructure } from "@/hooks/useFeeStructures";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import type { FeeStructure } from "@/services/financeService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-IN");
  } catch {
    return s;
  }
}

function totalFromComponents(components?: { amount: number }[]) {
  if (!components?.length) return 0;
  return components.reduce((sum, c) => sum + (c.amount ?? 0), 0);
}

function fmtAmount(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function FeeStructuresPage() {
  const router = useRouter();
  const [yearFilter, setYearFilter] = useState("");
  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    initialData?: FeeStructure;
  }>({ open: false, mode: "create" });

  const { data: academicYears = [] } = useAcademicYears(false);
  const { data: structures = [], isLoading } = useFeeStructures({
    academic_year_id: yearFilter || undefined,
  });
  const { mutateAsync: deleteStructureAsync, isPending: deleting } = useDeleteFeeStructure();
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);

  const openCreate = () => setModalState({ open: true, mode: "create" });
  const openEdit = (row: FeeStructure) =>
    setModalState({ open: true, mode: "edit", initialData: row });
  const openClone = (row: FeeStructure) =>
    setModalState({
      open: true,
      mode: "create",
      initialData: {
        ...row,
        id: "",
        name: `Copy of ${row.name}`,
        class_ids: [],
      },
    });

  const requestDelete = (row: FeeStructure) => setDeleteTarget(row);

  const columns: DataTableColumn<FeeStructure>[] = [
    {
      key: "name",
      header: "Structure",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.name}</span>
          {r.is_transport_only && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              <Bus className="size-3" />
              Transport
            </span>
          )}
        </div>
      ),
    },
    {
      key: "class_ids",
      header: "Classes",
      cell: (r) => {
        const count = r.class_ids?.length ?? 0;
        return (
          <span className="text-sm text-muted-foreground">
            {count === 0 ? "All classes" : `${count} class${count !== 1 ? "es" : ""}`}
          </span>
        );
      },
    },
    {
      key: "components",
      header: "Total Amount",
      cell: (r) => {
        const total = totalFromComponents(r.components);
        return (
          <span className={cn("font-medium", total > 0 ? "text-foreground" : "text-muted-foreground")}>
            {total > 0 ? fmtAmount(total) : "—"}
          </span>
        );
      },
    },
    {
      key: "due_date",
      header: "Due Date",
      cell: (r) => fmtDate(r.due_date),
    },
    {
      key: "id",
      header: "",
      cell: (r) => (
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(r)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openClone(r)}>
                <Plus className="mr-2 size-4" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={deleting}
                onClick={() => requestDelete(r)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/finance">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fee Structures</h1>
            <p className="text-sm text-muted-foreground">
              Templates that define fee components for classes and academic years.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Create Structure
        </Button>
      </div>

      {/* Year filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setYearFilter("")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            !yearFilter
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          All Years
        </button>
        {academicYears.map((ay) => (
          <button
            key={ay.id}
            onClick={() => setYearFilter(ay.id === yearFilter ? "" : ay.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              yearFilter === ay.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {ay.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Structures</CardTitle>
          <CardDescription>
            Click a row to view details. Use the menu to edit, clone, or delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<FeeStructure>
            columns={columns}
            data={structures}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            emptyMessage={
              isLoading
                ? "Loading…"
                : yearFilter
                  ? "No structures for this academic year. Create one to get started."
                  : "No fee structures yet. Create one to get started."
            }
            onRowClick={(r) => router.push(`/dashboard/finance/structures/${r.id}`)}
          />
        </CardContent>
      </Card>

      <FeeStructureFormModal
        open={modalState.open}
        onOpenChange={(open) => setModalState((s) => ({ ...s, open }))}
        mode={modalState.mode}
        initialData={modalState.initialData}
        onSuccess={() => setModalState((s) => ({ ...s, open: false }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete fee structure?"}
        description="This will remove all uncleared fee assignments."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteStructureAsync(deleteTarget.id);
            toast.success(`Deleted "${deleteTarget.name}"`);
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
            throw err;
          }
        }}
      />
    </div>
  );
}
