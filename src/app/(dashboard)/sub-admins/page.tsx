"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Plus,
  Search,
  ShieldX,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/tables/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SubAdminFormModal } from "@/components/sub-admins/SubAdminFormModal";
import { ResetPasswordDialog } from "@/components/sub-admins/ResetPasswordDialog";
import {
  useCreateSubAdmin,
  useDeleteSubAdmin,
  useResetSubAdminPassword,
  useRestoreSubAdmin,
  useSubAdminModules,
  useSubAdmins,
  useSuspendSubAdmin,
  useUpdateSubAdmin,
} from "@/hooks/useSubAdmins";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import type {
  SubAdmin,
  SubAdminModuleSelection,
} from "@/services/subAdminsService";
import { toastError, toastSuccess } from "@/lib/errorToast";
import { cn } from "@/lib/utils";

const REQUIRED_PERMISSION = "subadmin.manage";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function StatusBadge({ status }: { status: SubAdmin["status"] }) {
  const isActive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        isActive ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
      )}
    >
      {status}
    </span>
  );
}

function ModuleChips({ modules }: { modules: SubAdmin["modules"] }) {
  if (!modules.length) {
    return <span className="text-muted-foreground">No modules</span>;
  }
  const visible = modules.slice(0, 3);
  const extra = modules.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((mod) => (
        <Badge key={mod.key} variant="secondary" className="font-normal">
          {mod.label}
          <span className="ml-1 text-[10px] uppercase opacity-70">
            {mod.level}
          </span>
        </Badge>
      ))}
      {extra > 0 && (
        <Badge variant="outline" className="font-normal">
          +{extra} more
        </Badge>
      )}
    </div>
  );
}

export default function SubAdminsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(REQUIRED_PERMISSION);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const listParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      page,
      per_page: pageSize,
    }),
    [debouncedSearch, page, pageSize]
  );

  // Reset to first page when the search term changes — derived during render
  // (avoids set-state-in-effect; mirrors teachers/page.tsx).
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const { data, isLoading, isError, isFetching, refetch } = useSubAdmins(
    listParams,
    canManage
  );
  const { data: catalog = [], isLoading: isCatalogLoading } =
    useSubAdminModules(canManage);
  // Branches selectable in "Specific branches" mode — already limited to the
  // acting admin's allowed units by the backend.
  const { data: units = [], isLoading: isUnitsLoading } = useSchoolUnits({
    enabled: canManage,
  });

  const createMutation = useCreateSubAdmin();
  const updateMutation = useUpdateSubAdmin();
  const suspendMutation = useSuspendSubAdmin();
  const restoreMutation = useRestoreSubAdmin();
  const resetPasswordMutation = useResetSubAdminPassword();
  const deleteMutation = useDeleteSubAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubAdmin | null>(null);
  const [resetTarget, setResetTarget] = useState<SubAdmin | null>(null);
  const [statusTarget, setStatusTarget] = useState<SubAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubAdmin | null>(null);

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldX className="size-10 text-muted-foreground" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            You don&apos;t have permission to manage sub-admins. Contact your
            school administrator if you believe this is a mistake.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.pagination.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (subAdmin: SubAdmin) => {
    setEditing(subAdmin);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: {
    name: string;
    email: string;
    password?: string;
    modules: SubAdminModuleSelection[];
    branch_unit_ids: string[];
  }) => {
    if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        payload: {
          name: payload.name,
          modules: payload.modules,
          branch_unit_ids: payload.branch_unit_ids,
        },
      });
      toastSuccess("Sub-admin updated");
    } else {
      // Create-mode validation (SubAdminFormModal) guarantees a ≥8-char
      // password; guard narrows the optional field to a required string.
      if (!payload.password) return;
      await createMutation.mutateAsync({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        modules: payload.modules,
        branch_unit_ids: payload.branch_unit_ids,
      });
      toastSuccess("Sub-admin created");
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    await resetPasswordMutation.mutateAsync({ id: resetTarget.id, password });
    toastSuccess("Password reset");
    setResetTarget(null);
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const isSuspended = statusTarget.status === "suspended";
    try {
      if (isSuspended) {
        await restoreMutation.mutateAsync(statusTarget.id);
        toastSuccess("Sub-admin restored");
      } else {
        await suspendMutation.mutateAsync(statusTarget.id);
        toastSuccess("Sub-admin suspended");
      }
      setStatusTarget(null);
    } catch (err) {
      toastError(err, "Failed to update status");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toastSuccess("Sub-admin deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastError(err, "Failed to delete sub-admin");
      throw err;
    }
  };

  const columns: DataTableColumn<SubAdmin>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => <span>{row.email}</span>,
    },
    {
      key: "modules",
      header: "Modules",
      cell: (row) => <ModuleChips modules={row.modules} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (row) => {
        const isSuspended = row.status === "suspended";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Row actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => openEdit(row)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResetTarget(row)}>
                Reset password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusTarget(row)}>
                {isSuspended ? "Restore" : "Suspend"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(row)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sub-Admins</h1>
          <p className="text-muted-foreground">
            Create limited admin accounts and control which modules they can
            access.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Create sub-admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sub-admin list</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading sub-admins…"
              : `${total.toLocaleString()} ${total === 1 ? "sub-admin" : "sub-admins"}`}
          </CardDescription>

          <div className="pt-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email…"
                className="h-10 pl-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load sub-admins.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              getRowId={(row) => row.id}
              isLoading={isLoading}
              emptyMessage={
                debouncedSearch
                  ? "No sub-admins match your search."
                  : "No sub-admins yet. Create one to delegate module access."
              }
              pagination={{
                page,
                pageSize,
                total,
                onPageChange: setPage,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
              className={cn(isFetching && !isLoading && "opacity-80")}
            />
          )}
        </CardContent>
      </Card>

      <SubAdminFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        subAdmin={editing}
        catalog={catalog}
        isCatalogLoading={isCatalogLoading}
        units={units}
        isUnitsLoading={isUnitsLoading}
        saving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleFormSubmit}
      />

      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        subAdminName={resetTarget?.name ?? resetTarget?.email}
        saving={resetPasswordMutation.isPending}
        onSubmit={handleResetPassword}
      />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget?.status === "suspended"
            ? "Restore sub-admin?"
            : "Suspend sub-admin?"
        }
        description={
          statusTarget?.status === "suspended"
            ? `${statusTarget?.name ?? "This sub-admin"} will be able to sign in again.`
            : `${statusTarget?.name ?? "This sub-admin"} will be signed out and blocked from signing in until restored.`
        }
        confirmLabel={
          statusTarget?.status === "suspended" ? "Restore" : "Suspend"
        }
        variant={statusTarget?.status === "suspended" ? "default" : "destructive"}
        loading={suspendMutation.isPending || restoreMutation.isPending}
        onConfirm={handleToggleStatus}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete sub-admin?"
        description={`${deleteTarget?.name ?? "This sub-admin"} will be permanently removed and signed out of all sessions. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
