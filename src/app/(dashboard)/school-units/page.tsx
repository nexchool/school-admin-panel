"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, PauseCircle, Pencil, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { StatCard } from "@/components/ui/stat-card";
import { BranchFormModal } from "@/components/school-units/BranchFormModal";
import { DeleteBranchDialog } from "@/components/school-units/DeleteBranchDialog";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/hooks";
import type { ActiveStatus, SchoolUnit } from "@/services/schoolUnitsService";

const PAGE_SIZE = 20;
const ALL_STATUSES = "__all__";

type SortColumn = "name" | "code" | "status";
type SortDir = "asc" | "desc";

function StatusPill({ status }: { status: ActiveStatus }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className="font-normal capitalize"
    >
      {status}
    </Badge>
  );
}

/**
 * Branch list is client-side filtered/sorted/paginated on purpose: the API
 * returns every branch in one unpaginated call, and a tenant has 1–20 or so
 * campuses. Pagination is still wired up so a 20+ campus trust degrades
 * gracefully rather than rendering one enormous table.
 */
export default function SchoolUnitsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("school_unit.manage");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<ActiveStatus | "">("");
  const [sortBy, setSortBy] = useState<SortColumn>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [editing, setEditing] = useState<SchoolUnit | null>(null);
  const [deleting, setDeleting] = useState<SchoolUnit | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const search = useDebouncedValue(searchInput, 300);
  const listQuery = useSchoolUnits();
  const branches = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const stats = useMemo(
    () => ({
      total: branches.length,
      active: branches.filter((b) => b.status === "active").length,
      inactive: branches.filter((b) => b.status === "inactive").length,
    }),
    [branches]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = branches.filter((b) => {
      if (status && b.status !== status) return false;
      if (!term) return true;
      return [b.name, b.code, b.phone, b.address, b.dise_no]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term));
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return [...matches].sort(
      (a, b) =>
        direction * (a[sortBy] ?? "").localeCompare(b[sortBy] ?? "", undefined, {
          sensitivity: "base",
        })
    );
  }, [branches, search, status, sortBy, sortDir]);

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const hasFilters = Boolean(search || status);
  const showEmptyState =
    !listQuery.isLoading && !listQuery.isError && branches.length === 0 && !hasFilters;

  const openCreate = () => {
    setEditing(null);
    setIsCreateOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === ALL_STATUSES ? "" : (value as ActiveStatus));
    setPage(1);
  };

  const handleSortChange = (column: string, direction: SortDir | null) => {
    setSortBy(direction === null ? "name" : (column as SortColumn));
    setSortDir(direction ?? "asc");
    setPage(1);
  };

  const columns: DataTableColumn<SchoolUnit>[] = [
    { key: "name", header: "Name", sortable: true },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (r) =>
        r.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "address",
      header: "Address",
      cell: (r) =>
        r.address ? (
          <span className="line-clamp-1 max-w-72" title={r.address}>
            {r.address}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "dise_no",
      header: "DISE No.",
      cell: (r) =>
        r.dise_no ? (
          <span className="font-mono text-xs">{r.dise_no}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (r) => <StatusPill status={r.status} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: SchoolUnit) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Edit branch"
                  aria-label={`Edit ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(r);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Delete branch"
                  aria-label={`Delete ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleting(r);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<SchoolUnit>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="The campuses your organisation teaches at. Classes, students and staff are all organised under one."
        actions={
          canManage ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              New branch
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Total Branches"
          value={stats.total}
          sub="Campuses in your organisation"
          tone="primary"
          loading={listQuery.isLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Branches"
          value={stats.active}
          sub="Currently in use"
          tone="success"
          loading={listQuery.isLoading}
        />
        <StatCard
          icon={PauseCircle}
          label="Inactive Branches"
          value={stats.inactive}
          sub="Hidden from new assignments"
          tone="warning"
          loading={listQuery.isLoading}
        />
      </div>

      {showEmptyState ? (
        <Card>
          <CardHeader>
            <CardTitle>No branches yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              A branch is a campus your organisation runs — many schools have
              just one, while a trust may run several across different towns,
              boards or mediums. Every class belongs to a branch, so add your
              first one to get started.
            </p>
          </CardHeader>
          <CardContent>
            {canManage && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="size-4" />
                New Branch
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {listQuery.isLoading
                ? "Branches"
                : `${filtered.length} branch${filtered.length !== 1 ? "es" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by name, code, phone or address…"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={status || ALL_STATUSES}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DataTable
              columns={columns}
              data={pageItems}
              getRowId={(row) => row.id}
              isLoading={listQuery.isLoading}
              isError={listQuery.isError}
              onRetry={() => listQuery.refetch()}
              errorMessage="Couldn't load branches. Check your connection and retry."
              emptyMessage={
                hasFilters
                  ? "No branches match your filters."
                  : "No branches yet. Add one to get started."
              }
              sort={{ column: sortBy, direction: sortDir }}
              onSortChange={handleSortChange}
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                total: filtered.length,
                onPageChange: (next) => setPage(next),
              }}
            />
          </CardContent>
        </Card>
      )}

      <BranchFormModal
        open={isCreateOpen || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setIsCreateOpen(false);
            setEditing(null);
          }
        }}
        branch={editing}
      />

      <DeleteBranchDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        branch={deleting}
      />
    </div>
  );
}
