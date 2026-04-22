"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeachers, useCreateTeacher } from "@/hooks/useTeachers";
import { TeacherFormModal } from "@/components/teachers/TeacherFormModal";
import { BulkImportTeachers } from "@/components/teachers/BulkImportTeachers";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
} from "@/components/tables/DataTable";
import { teacherLeaveService } from "@/services/teacherConstraintService";
import type {
  TeachersSortBy,
  TeachersSearchField,
} from "@/services/teachersService";
import type { Teacher, TeacherLeave } from "@/types/teacher";
import {
  Plus,
  Search,
  Upload,
  ClipboardList,
  Users,
  Check,
  X,
  Loader2,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { TabNav, type TabNavItem } from "@/components/detail";
import { cn } from "@/lib/utils";

type PageView = "teachers" | "leaves";

// ---------- Leave requests view (unchanged) ----------

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const LEAVE_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

function AllLeavesView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["teacher-leaves-all", statusFilter],
    queryFn: () =>
      teacherLeaveService.listLeaves(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 30_000,
  });

  const handleApprove = async (leaveId: string) => {
    setApproving(leaveId);
    try {
      await teacherLeaveService.approveLeave(leaveId);
      qc.invalidateQueries({ queryKey: ["teacher-leaves-all"] });
      toast.success("Leave approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    setRejecting(leaveId);
    try {
      await teacherLeaveService.rejectLeave(leaveId);
      qc.invalidateQueries({ queryKey: ["teacher-leaves-all"] });
      toast.success("Leave rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setRejecting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>
              Review and manage leave requests from all teachers.
            </CardDescription>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {LEAVE_STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaves.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} leave requests.`
              : "No leave requests found."}
          </p>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave: TeacherLeave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">
                      {leave.start_date} – {leave.end_date}
                    </p>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        LEAVE_STATUS_COLORS[leave.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {leave.leave_type}
                    {leave.working_days != null && ` • ${leave.working_days} days`}
                    {leave.reason && ` • ${leave.reason}`}
                  </p>
                  <button
                    type="button"
                    className="mt-1 text-xs text-primary hover:underline"
                    onClick={() => router.push(`/teachers/${leave.teacher_id}?tab=leaves`)}
                  >
                    View teacher profile →
                  </button>
                </div>
                {leave.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(leave.id)}
                      disabled={approving === leave.id}
                      title="Approve"
                    >
                      {approving === leave.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleReject(leave.id)}
                      disabled={rejecting === leave.id}
                      title="Reject"
                    >
                      {rejecting === leave.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Teachers list constants ----------

const SEARCH_FIELD_OPTIONS: { value: TeachersSearchField; label: string }[] = [
  { value: "all", label: "All fields" },
  { value: "name", label: "Name" },
  { value: "employee_id", label: "Employee ID" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];
const VALID_SEARCH_FIELDS: TeachersSearchField[] = SEARCH_FIELD_OPTIONS.map(
  (o) => o.value
);

const VALID_SORT_BYS: TeachersSortBy[] = [
  "employee_id",
  "name",
  "designation",
  "department",
  "date_of_joining",
];

const TEACHER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY: TeachersSortBy = "employee_id";
const DEFAULT_SORT_DIR: SortDirection = "asc";
const DEFAULT_SEARCH_FIELD: TeachersSearchField = "all";

const PARAM = {
  page: "page",
  perPage: "per_page",
  sortBy: "sort_by",
  sortDir: "sort_dir",
  search: "search",
  searchField: "search_field",
  status: "status",
  department: "department",
  designation: "designation",
  joiningFrom: "date_of_joining_from",
  joiningTo: "date_of_joining_to",
} as const;

// ---------- Utilities ----------

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function statusPill(status?: string) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const key = status.toLowerCase();
  const tone =
    key === "active"
      ? "bg-emerald-600 text-white"
      : "bg-slate-500 text-white";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        tone
      )}
    >
      {status}
    </span>
  );
}

// ---------- URL state ----------

type UrlState = {
  page: number;
  pageSize: number;
  sortBy: TeachersSortBy;
  sortDir: SortDirection;
  search: string;
  searchField: TeachersSearchField;
  status: string;
  department: string;
  designation: string;
  joiningDateFrom: string;
  joiningDateTo: string;
};

function parseIntSafe(
  value: string | null,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {}
): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

function readUrlState(sp: URLSearchParams): UrlState {
  const sortByRaw = sp.get(PARAM.sortBy);
  const sortDirRaw = sp.get(PARAM.sortDir);
  const searchFieldRaw = sp.get(PARAM.searchField);

  return {
    page: parseIntSafe(sp.get(PARAM.page), DEFAULT_PAGE),
    pageSize: parseIntSafe(sp.get(PARAM.perPage), DEFAULT_PAGE_SIZE, {
      min: 1,
      max: 100,
    }),
    sortBy: (VALID_SORT_BYS as string[]).includes(sortByRaw ?? "")
      ? (sortByRaw as TeachersSortBy)
      : DEFAULT_SORT_BY,
    sortDir: sortDirRaw === "desc" ? "desc" : "asc",
    search: sp.get(PARAM.search) ?? "",
    searchField: (VALID_SEARCH_FIELDS as string[]).includes(searchFieldRaw ?? "")
      ? (searchFieldRaw as TeachersSearchField)
      : DEFAULT_SEARCH_FIELD,
    status: sp.get(PARAM.status) ?? "",
    department: sp.get(PARAM.department) ?? "",
    designation: sp.get(PARAM.designation) ?? "",
    joiningDateFrom: sp.get(PARAM.joiningFrom) ?? "",
    joiningDateTo: sp.get(PARAM.joiningTo) ?? "",
  };
}

function activeFilterCount(s: UrlState): number {
  return (
    (s.status ? 1 : 0) +
    (s.department ? 1 : 0) +
    (s.designation ? 1 : 0) +
    (s.joiningDateFrom || s.joiningDateTo ? 1 : 0)
  );
}

// ---------- Page ----------

export default function TeachersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<PageView>("teachers");

  const url = useMemo(
    () => readUrlState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [searchInput, setSearchInput] = useState(url.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const [prevCommittedSearch, setPrevCommittedSearch] = useState(url.search);
  if (prevCommittedSearch !== url.search) {
    setPrevCommittedSearch(url.search);
    setSearchInput(url.search);
  }

  const setUrlParams = useCallback(
    (updates: Partial<Record<keyof typeof PARAM, string | null>>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        const paramName = PARAM[key as keyof typeof PARAM];
        if (value === null || value === undefined || value === "") {
          next.delete(paramName);
        } else {
          next.set(paramName, value);
        }
      }
      const stripIfDefault = (name: string, defaultValue: string) => {
        if (next.get(name) === defaultValue) next.delete(name);
      };
      stripIfDefault(PARAM.page, String(DEFAULT_PAGE));
      stripIfDefault(PARAM.perPage, String(DEFAULT_PAGE_SIZE));
      stripIfDefault(PARAM.sortBy, DEFAULT_SORT_BY);
      stripIfDefault(PARAM.sortDir, DEFAULT_SORT_DIR);
      stripIfDefault(PARAM.searchField, DEFAULT_SEARCH_FIELD);

      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (debouncedSearch === url.search) return;
    setUrlParams({ search: debouncedSearch || null });
  }, [debouncedSearch, url.search, setUrlParams]);

  const queryParams = useMemo(
    () => ({
      page: url.page,
      per_page: url.pageSize,
      sort_by: url.sortBy,
      sort_dir: url.sortDir,
      search: url.search || undefined,
      search_field: url.searchField,
      status: url.status || undefined,
      department: url.department || undefined,
      designation: url.designation || undefined,
      date_of_joining_from: url.joiningDateFrom || undefined,
      date_of_joining_to: url.joiningDateTo || undefined,
    }),
    [url]
  );

  const { data, isLoading, isFetching } = useTeachers(queryParams);
  const createMutation = useCreateTeacher();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const departments = data?.departments ?? [];
  const designations = data?.designations ?? [];

  useEffect(() => {
    if (!data) return;
    if (totalPages >= 1 && url.page > totalPages) {
      setUrlParams({ page: String(totalPages) });
    }
  }, [data, totalPages, url.page, setUrlParams]);

  // Count pending leaves for the badge
  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ["teacher-leaves-all", "pending"],
    queryFn: () => teacherLeaveService.listLeaves({ status: "pending" }),
    refetchInterval: 30_000,
  });
  const pendingCount = (pendingLeaves as TeacherLeave[]).length;

  const sortIsDefault =
    url.sortBy === DEFAULT_SORT_BY && url.sortDir === DEFAULT_SORT_DIR;
  const activeCount = activeFilterCount(url);

  // ---------- URL mutators ----------

  const setPage = (next: number) => setUrlParams({ page: String(next) });

  const handlePageSizeChange = (nextSize: number) => {
    const firstItemIndex = (url.page - 1) * url.pageSize;
    const nextPage = Math.max(1, Math.floor(firstItemIndex / nextSize) + 1);
    setUrlParams({ perPage: String(nextSize), page: String(nextPage) });
  };

  const setSort = (nextBy: TeachersSortBy, nextDir: SortDirection) =>
    setUrlParams({ sortBy: nextBy, sortDir: nextDir });

  const clearSort = () => setUrlParams({ sortBy: null, sortDir: null });

  const setSearchField = (next: TeachersSearchField) =>
    setUrlParams({ searchField: next });

  const clearSearch = () => {
    setSearchInput("");
    setUrlParams({ search: null, searchField: null });
  };

  const setStatus = (next: string) => setUrlParams({ status: next || null });

  const setDepartment = (next: string) =>
    setUrlParams({ department: next || null });

  const setDesignation = (next: string) =>
    setUrlParams({ designation: next || null });

  const setJoiningDate = (from: string, to: string) =>
    setUrlParams({ joiningFrom: from || null, joiningTo: to || null });

  const clearAllFilters = () =>
    setUrlParams({
      status: null,
      department: null,
      designation: null,
      joiningFrom: null,
      joiningTo: null,
    });

  const handleCreate = async (
    input: Parameters<typeof createMutation.mutateAsync>[0]
  ) => {
    try {
      await createMutation.mutateAsync(input);
      toast.success("Teacher created");
      setCreateOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create teacher");
      throw e;
    }
  };

  const columns: DataTableColumn<Teacher>[] = [
    {
      key: "employee_id",
      header: "Employee ID",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs">{row.employee_id}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (row) =>
        row.email ? (
          <span>{row.email}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      cell: (row) =>
        row.designation ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      cell: (row) =>
        row.department ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => statusPill(row.status),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and assignments.
          </p>
        </div>
        {view === "teachers" && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
            >
              <Upload className="size-4" />
              Bulk import
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add Teacher
            </Button>
          </div>
        )}
      </div>

      <TabNav
        tabs={
          [
            { id: "teachers", label: "All Teachers", icon: Users },
            {
              id: "leaves",
              label: "Leave Requests",
              icon: ClipboardList,
              badge: pendingCount,
              badgeTone: "destructive",
            },
          ] satisfies TabNavItem<PageView>[]
        }
        active={view}
        onChange={setView}
      />

      {view === "teachers" && (
        <Card>
          <CardHeader>
            <CardTitle>Teacher List</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading teachers…"
                : `${total.toLocaleString()} ${total === 1 ? "teacher" : "teachers"}${
                    activeCount > 0 || url.search
                      ? " match current filters"
                      : " total"
                  }`}
            </CardDescription>

            {/* Search + filter row */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <div className="flex min-w-0 flex-1 items-stretch rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                <Select
                  value={url.searchField}
                  onValueChange={(v) =>
                    setSearchField(v as TeachersSearchField)
                  }
                >
                  <SelectTrigger className="h-10 w-[150px] shrink-0 rounded-l-lg rounded-r-none border-0 border-r border-input bg-transparent shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_FIELD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={
                      url.searchField === "all"
                        ? "Search name, employee ID, email, phone…"
                        : `Search by ${
                            SEARCH_FIELD_OPTIONS.find(
                              (o) => o.value === url.searchField
                            )?.label.toLowerCase() ?? "field"
                          }…`
                    }
                    className="h-10 rounded-l-none border-0 pl-9 shadow-none focus-visible:ring-0"
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

              {/* Filters popover */}
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2">
                    <SlidersHorizontal className="size-4" />
                    Filters
                    {activeCount > 0 && (
                      <Badge className="ml-1 h-5 min-w-5 justify-center px-1.5">
                        {activeCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Filters</h4>
                      {activeCount > 0 && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Status
                      </label>
                      <Select
                        value={url.status || "__all__"}
                        onValueChange={(v) =>
                          setStatus(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Any</SelectItem>
                          {TEACHER_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Department
                      </label>
                      <Select
                        value={url.department || "__all__"}
                        onValueChange={(v) =>
                          setDepartment(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Any</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                          {url.department &&
                            !departments.includes(url.department) && (
                              <SelectItem value={url.department}>
                                {url.department}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Designation
                      </label>
                      <Select
                        value={url.designation || "__all__"}
                        onValueChange={(v) =>
                          setDesignation(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Any</SelectItem>
                          {designations.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                          {url.designation &&
                            !designations.includes(url.designation) && (
                              <SelectItem value={url.designation}>
                                {url.designation}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date of joining range */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Date of joining
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={url.joiningDateFrom}
                          onChange={(e) =>
                            setJoiningDate(e.target.value, url.joiningDateTo)
                          }
                          className="h-9"
                        />
                        <Input
                          type="date"
                          value={url.joiningDateTo}
                          onChange={(e) =>
                            setJoiningDate(url.joiningDateFrom, e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {!sortIsDefault && (
                <Button
                  variant="ghost"
                  className="h-10 gap-2 text-muted-foreground"
                  onClick={clearSort}
                >
                  <RotateCcw className="size-3.5" />
                  Clear sort
                </Button>
              )}
            </div>

            {/* Active filter pills */}
            {(activeCount > 0 || url.search) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3">
                {url.search && (
                  <FilterPill
                    label={`${
                      SEARCH_FIELD_OPTIONS.find(
                        (o) => o.value === url.searchField
                      )?.label ?? "Search"
                    }: "${url.search}"`}
                    onRemove={clearSearch}
                  />
                )}
                {url.status && (
                  <FilterPill
                    label={`Status: ${url.status}`}
                    onRemove={() => setStatus("")}
                  />
                )}
                {url.department && (
                  <FilterPill
                    label={`Department: ${url.department}`}
                    onRemove={() => setDepartment("")}
                  />
                )}
                {url.designation && (
                  <FilterPill
                    label={`Designation: ${url.designation}`}
                    onRemove={() => setDesignation("")}
                  />
                )}
                {(url.joiningDateFrom || url.joiningDateTo) && (
                  <FilterPill
                    label={`Joined: ${url.joiningDateFrom || "…"} → ${url.joiningDateTo || "…"}`}
                    onRemove={() => setJoiningDate("", "")}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearAllFilters();
                    clearSearch();
                  }}
                  className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              getRowId={(row) => row.id}
              isLoading={isLoading}
              emptyMessage={
                url.search || activeCount > 0
                  ? "No teachers match the current filters."
                  : "No teachers found. Add a teacher to get started."
              }
              sort={{ column: url.sortBy, direction: url.sortDir }}
              onSortChange={(column, direction) => {
                if (direction === null) {
                  clearSort();
                  return;
                }
                setSort(column as TeachersSortBy, direction);
              }}
              pagination={{
                page: url.page,
                pageSize: url.pageSize,
                total,
                onPageChange: setPage,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                onPageSizeChange: handlePageSizeChange,
              }}
              onRowClick={(row) => router.push(`/teachers/${row.id}`)}
              className={cn(isFetching && !isLoading && "opacity-80")}
            />
          </CardContent>
        </Card>
      )}

      {view === "leaves" && <AllLeavesView />}

      <TeacherFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <BulkImportTeachers open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="inline-flex size-4 items-center justify-center rounded-full hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
