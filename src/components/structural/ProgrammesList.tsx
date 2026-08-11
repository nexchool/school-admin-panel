"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, GraduationCap, PauseCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ProgrammeFormModal } from "@/components/structural/ProgrammeFormModal";
import { useAuth } from "@/hooks";
import { useDeleteProgramme, useProgrammes } from "@/hooks/useProgrammes";
import { ApiException } from "@/services/api";
import type { AcademicProgramme } from "@/services/programmesService";

function StatusPill({ status }: { status: AcademicProgramme["status"] }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className="font-normal capitalize"
    >
      {status}
    </Badge>
  );
}

export function ProgrammesList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("programme.manage");

  const { data = [], isLoading, isError, refetch } = useProgrammes();
  const deleteMut = useDeleteProgramme();

  const [editing, setEditing] = useState<AcademicProgramme | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AcademicProgramme | null>(null);

  const stats = useMemo(
    () => ({
      total: data.length,
      active: data.filter((p) => p.status === "active").length,
      inactive: data.filter((p) => p.status !== "active").length,
    }),
    [data],
  );

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (row: AcademicProgramme) => {
    setEditing(row);
    setIsFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMut.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Programme removed.");
        setDeleting(null);
      },
      // The dialog stays open on failure. A programme a class still runs on is
      // refused, and that refusal is the answer to "why did nothing happen" —
      // closing the dialog would take the question away with it.
      onError: (error) =>
        toast.error(
          error instanceof ApiException
            ? error.message
            : error instanceof Error
              ? error.message
              : "Could not remove the programme.",
        ),
    });
  };

  const columns: DataTableColumn<AcademicProgramme>[] = [
    {
      key: "name",
      header: "Programme",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "board", header: "Board" },
    {
      key: "medium",
      header: "Medium",
      cell: (row) =>
        row.medium ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusPill status={row.status} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-[110px] text-right",
            cell: (row: AcademicProgramme) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Edit programme"
                  aria-label={`Edit ${row.name}`}
                  onClick={() => openEdit(row)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Remove programme"
                  aria-label={`Remove ${row.name}`}
                  onClick={() => setDeleting(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<AcademicProgramme>,
        ]
      : []),
  ];

  const showEmptyState = !isLoading && !isError && data.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programmes"
        description="The boards your school teaches to, and the language each is taught in."
        actions={
          canManage ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              New programme
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={GraduationCap}
          label="Total Programmes"
          value={stats.total}
          sub="Boards and mediums you offer"
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Programmes"
          value={stats.active}
          sub="Open to new classes"
          tone="success"
          loading={isLoading}
        />
        <StatCard
          icon={PauseCircle}
          label="Inactive Programmes"
          value={stats.inactive}
          sub="No longer offered"
          tone="warning"
          loading={isLoading}
        />
      </div>

      {showEmptyState ? (
        <Card>
          <CardHeader>
            <CardTitle>No programmes yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              A programme is a board your school teaches to — CBSE, GSEB, ICSE.
              Add one for each, and a separate one per language where you run
              the same board in more than one medium. Every class names a
              programme, so add your first one to get started.
            </p>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="size-4" />
                New programme
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading
                ? "Programmes"
                : `${data.length} programme${data.length === 1 ? "" : "s"}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={data}
              getRowId={(row) => row.id}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
              errorMessage="Couldn't load programmes. Check your connection and retry."
              emptyMessage="No programmes match."
            />
          </CardContent>
        </Card>
      )}

      <ProgrammeFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        programme={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.name ?? "programme"}?`}
        description="It leaves the catalogue and stops being offered to new classes. Any class already running on it keeps it, and the removal is refused while that is the case."
        confirmLabel="Remove"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
