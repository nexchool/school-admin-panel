"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { TermFormModal } from "@/components/structural/TermFormModal";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useAuth } from "@/hooks";
import { useDeleteTerm, useTerms } from "@/hooks/useTerms";
import { ApiException } from "@/services/api";
import type { AcademicTerm } from "@/services/academicTermsService";

function formatDate(iso: string) {
  try {
    return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TermsList() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("class.manage");

  const { data: years = [] } = useAcademicYears(false);
  const [yearIdRaw, setYearId] = useState<string>("");
  const defaultYear = years.find((y) => y.is_active !== false) ?? years[0];
  const yearId = yearIdRaw || (defaultYear ? defaultYear.id : "");

  const {
    data: terms = [],
    isLoading,
    isError,
    refetch,
  } = useTerms(yearId || undefined);
  const deleteMut = useDeleteTerm();

  const [editing, setEditing] = useState<AcademicTerm | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AcademicTerm | null>(null);

  const sortedTerms = useMemo(
    () => [...terms].sort((a, b) => a.sequence - b.sequence),
    [terms],
  );

  // The span a school actually teaches over, which is what somebody checking
  // this page wants to see — not the sum of the terms, which double-counts
  // nothing but reads like it might.
  const covered = useMemo(() => {
    if (sortedTerms.length === 0) return 0;
    const starts = sortedTerms.map((t) => t.start_date.slice(0, 10)).sort();
    const ends = sortedTerms.map((t) => t.end_date.slice(0, 10)).sort();
    const first = new Date(`${starts[0]}T12:00:00`).getTime();
    const last = new Date(`${ends[ends.length - 1]}T12:00:00`).getTime();
    return Math.max(0, Math.round((last - first) / 86_400_000) + 1);
  }, [sortedTerms]);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (row: AcademicTerm) => {
    setEditing(row);
    setIsFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMut.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Term removed.");
        setDeleting(null);
      },
      onError: (e) =>
        toast.error(
          e instanceof ApiException || e instanceof Error
            ? e.message
            : "Could not remove the term.",
        ),
    });
  };

  const columns: DataTableColumn<AcademicTerm>[] = [
    {
      key: "name",
      header: "Term",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "start_date",
      header: "Starts",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.start_date)}</span>
      ),
    },
    {
      key: "end_date",
      header: "Ends",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.end_date)}</span>
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-[110px] text-right",
            cell: (row: AcademicTerm) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Edit term"
                  aria-label={`Edit ${row.name}`}
                  onClick={() => openEdit(row)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Remove term"
                  aria-label={`Remove ${row.name}`}
                  onClick={() => setDeleting(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<AcademicTerm>,
        ]
      : []),
  ];

  const noYears = years.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms"
        description="How a year is divided — Term 1, Term 2, a semester. A school that does not divide its year can leave this empty."
        actions={
          canManage && !noYears ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              New term
            </Button>
          ) : null
        }
      />

      {noYears ? (
        <Card>
          <CardHeader>
            <CardTitle>Add an academic year first</CardTitle>
            <p className="text-sm text-muted-foreground">
              A term is a stretch of one academic year, so there has to be a year
              for it to sit inside before you can add one.
            </p>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={CalendarRange}
              label="Terms This Year"
              value={sortedTerms.length}
              sub="In the selected academic year"
              tone="primary"
              loading={isLoading}
            />
            <StatCard
              icon={CalendarRange}
              label="Days Covered"
              value={covered}
              sub="First start to last end"
              tone="info"
              loading={isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isLoading
                  ? "Terms"
                  : `${sortedTerms.length} term${sortedTerms.length === 1 ? "" : "s"}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2">
                <Label htmlFor="terms-year">Academic year</Label>
                <Select value={yearId} onValueChange={setYearId}>
                  <SelectTrigger id="terms-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DataTable
                columns={columns}
                data={sortedTerms}
                getRowId={(row) => row.id}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => refetch()}
                errorMessage="Couldn't load terms. Check your connection and retry."
                emptyMessage="No terms for the selected year."
              />
            </CardContent>
          </Card>
        </>
      )}

      <TermFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        term={editing}
        academicYearId={yearId}
        nextSequence={sortedTerms.length + 1}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.name ?? "term"}?`}
        description="The year keeps its dates; only this division of it goes."
        confirmLabel="Remove"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
