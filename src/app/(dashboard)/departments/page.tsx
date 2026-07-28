"use client";

import { useMemo, useState } from "react";
import { Building, BookOpen, Plus, Pencil, Trash2, GraduationCap, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DepartmentFormModal } from "@/components/departments/DepartmentFormModal";
import { DeleteDepartmentDialog } from "@/components/departments/DeleteDepartmentDialog";
import { useDepartments, useDepartmentStats } from "@/hooks/useDepartments";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/hooks";
import type {
  Department,
  DepartmentsListParams,
  DepartmentStatus,
} from "@/types/department";

type DepartmentSortBy = NonNullable<DepartmentsListParams["sortBy"]>;
type DepartmentSortDir = NonNullable<DepartmentsListParams["sortDir"]>;

const PAGE_SIZE = 20;
const ALL_STATUSES = "__all__";
const DEFAULT_SORT_BY: DepartmentSortBy = "display_order";
const DEFAULT_SORT_DIR: DepartmentSortDir = "asc";

function StatusPill({ status }: { status: DepartmentStatus }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className="font-normal capitalize"
    >
      {status}
    </Badge>
  );
}

function formatCreatedAt(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function DepartmentsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("department.manage");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<DepartmentStatus | "">("");
  const [sortBy, setSortBy] = useState<DepartmentSortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<DepartmentSortDir>(DEFAULT_SORT_DIR);

  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const search = useDebouncedValue(searchInput, 300);

  const listParams: DepartmentsListParams = useMemo(
    () => ({
      page,
      perPage: PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      sortBy,
      sortDir,
    }),
    [page, search, status, sortBy, sortDir]
  );

  const listQuery = useDepartments(listParams);
  const statsQuery = useDepartmentStats();

  const result = listQuery.data;
  const departments = result?.items ?? [];
  const stats = statsQuery.data;

  const hasFilters = Boolean(search || status);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === ALL_STATUSES ? "" : (value as DepartmentStatus));
    setPage(1);
  };

  const handleSortChange = (column: string, direction: "asc" | "desc" | null) => {
    if (direction === null) {
      setSortBy(DEFAULT_SORT_BY);
      setSortDir(DEFAULT_SORT_DIR);
    } else {
      setSortBy(column as DepartmentSortBy);
      setSortDir(direction);
    }
    setPage(1);
  };

  const columns: DataTableColumn<Department>[] = [
    { key: "name", header: "Name", sortable: true },
    {
      key: "code",
      header: "Code",
      cell: (r) => (r.code ? <span className="font-mono text-xs">{r.code}</span> : "—"),
    },
    {
      key: "description",
      header: "Description",
      cell: (r) =>
        r.description ? (
          <span className="line-clamp-1 max-w-72" title={r.description}>
            {r.description}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "teacher_count",
      header: "Teachers",
      cell: (r) => <span className="tabular-nums">{r.teacher_count}</span>,
    },
    {
      key: "class_count",
      header: "Classes",
      cell: (r) => <span className="tabular-nums">{r.class_count}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusPill status={r.status} />,
    },
    {
      key: "created_at",
      header: "Created On",
      sortable: true,
      cell: (r) => formatCreatedAt(r.created_at),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: Department) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Edit department"
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
                  title="Delete department"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleting(r);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<Department>,
        ]
      : []),
  ];

  const showEmptyState = !listQuery.isLoading && result?.total === 0 && !hasFilters;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Departments
            <Building className="size-5 text-primary" />
          </h1>
          <p className="text-muted-foreground">
            Academic divisions used to organize teachers and classes — for example
            Primary, Secondary or Higher Secondary.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setIsCreateOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            New Department
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building}
          label="Total Departments"
          value={stats?.total}
          sub="Across your school"
          tone="primary"
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Departments"
          value={stats?.active}
          sub="Currently in use"
          tone="success"
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={GraduationCap}
          label="Total Teachers Assigned"
          value={stats?.teachers_assigned}
          sub="Across all departments"
          tone="info"
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={BookOpen}
          label="Total Classes Assigned"
          value={stats?.classes_assigned}
          sub="Across all departments"
          tone="warning"
          loading={statsQuery.isLoading}
        />
      </div>

      {showEmptyState ? (
        <Card>
          <CardHeader>
            <CardTitle>No departments yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Departments are the academic divisions your school is organized into
              — Primary, Middle School, Higher Secondary, Junior Wing, and so on.
              Teachers and classes are assigned to them. Create your first
              department to get started.
            </p>
          </CardHeader>
          <CardContent>
            {canManage && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setIsCreateOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="size-4" />
                New Department
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {result ? `${result.total} department${result.total !== 1 ? "s" : ""}` : "Departments"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by name, code or description…"
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
              data={departments}
              getRowId={(row) => row.id}
              isLoading={listQuery.isLoading}
              isError={listQuery.isError}
              onRetry={() => listQuery.refetch()}
              errorMessage="Couldn't load departments. Check your connection and retry."
              emptyMessage={
                hasFilters
                  ? "No departments match your filters."
                  : "No departments yet. Add one to get started."
              }
              sort={{ column: sortBy, direction: sortDir }}
              onSortChange={handleSortChange}
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                total: result?.total ?? 0,
                onPageChange: (next) => setPage(next),
              }}
            />
          </CardContent>
        </Card>
      )}

      <DepartmentFormModal
        open={isCreateOpen || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setIsCreateOpen(false);
            setEditing(null);
          }
        }}
        department={editing}
      />

      <DeleteDepartmentDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        department={deleting}
      />
    </div>
  );
}
