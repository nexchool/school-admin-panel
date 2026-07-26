"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
  useStudents,
  useCreateStudent,
  useBulkDeleteStudents,
  useBulkUpdateStudentStatus,
} from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useAuth } from "@/components/providers/AuthProvider";
import { BulkImportStudents } from "@/components/students/BulkImportStudents";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BulkActionBar } from "@/components/tables/BulkActionBar";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
} from "@/components/tables/DataTable";
import { studentsService } from "@/services/studentsService";
import type {
  StudentsSearchField,
  StudentsSortBy,
} from "@/services/studentsService";
import type { Student } from "@/types/student";
import { STUDENT_STATUS_OPTIONS } from "@/constants/studentStatus";
import {
  FileUp,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Download,
  Trash2,
  GraduationCap,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toastError } from "@/lib/errorToast";
import { cn } from "@/lib/utils";

const SEARCH_FIELD_OPTIONS: { value: StudentsSearchField; label: string }[] = [
  { value: "all", label: "All fields" },
  { value: "name", label: "Name" },
  { value: "admission_number", label: "Admission #" },
  { value: "email", label: "Email" },
  { value: "guardian_phone", label: "Guardian phone" },
  { value: "programme", label: "Programme" },
];
const VALID_SEARCH_FIELDS: StudentsSearchField[] = SEARCH_FIELD_OPTIONS.map(
  (o) => o.value
);

const VALID_SORT_BYS: StudentsSortBy[] = [
  "admission_number",
  "name",
  "class",
  "programme",
  "roll_number",
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
  { value: "alumni", label: "Alumni" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY: StudentsSortBy = "admission_number";
const DEFAULT_SORT_DIR: SortDirection = "asc";
const DEFAULT_SEARCH_FIELD: StudentsSearchField = "all";

// URL param names — kept in sync with backend query-param names so a URL can
// be shared with engineers or inspected in DevTools without translation.
const PARAM = {
  page: "page",
  perPage: "per_page",
  sortBy: "sort_by",
  sortDir: "sort_dir",
  search: "search",
  searchField: "search_field",
  classIds: "class_ids",
  academicYearId: "academic_year_id",
  programmeId: "programme_id",
  gender: "gender",
  studentStatus: "student_status",
  isTransportOpted: "is_transport_opted",
  admissionFrom: "admission_date_from",
  admissionTo: "admission_date_to",
} as const;

// ---------- small utilities ----------

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function formatClassName(c: {
  name: string;
  section?: string;
  grade_name?: string | null;
}): string {
  // Class.name is a legacy nullable display label — grade-based classes carry
  // their label on grade_name (the service coalesces null name to "").
  const label = c.name || c.grade_name || "";
  return [label, c.section].filter(Boolean).join("-");
}

function genderBadge(g?: string) {
  if (!g) return <span className="text-muted-foreground">—</span>;
  const short = g.charAt(0).toUpperCase();
  const key = g.toLowerCase();
  const tone =
    key === "male"
      ? "bg-blue-600 text-white"
      : key === "female"
      ? "bg-pink-600 text-white"
      : "bg-slate-500 text-white";
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
        tone
      )}
      title={g}
    >
      {short}
    </span>
  );
}

function statusPill(status?: string) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const key = status.toLowerCase();
  const map: Record<string, string> = {
    active: "bg-emerald-600 text-white",
    inactive: "bg-slate-500 text-white",
    transferred: "bg-amber-600 text-white",
    alumni: "bg-violet-600 text-white",
  };
  const tone = map[key] ?? "bg-slate-500 text-white";
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

// ---------- URL <-> state helpers ----------

type TransportFilter = "" | "yes" | "no";

type UrlState = {
  page: number;
  pageSize: number;
  sortBy: StudentsSortBy;
  sortDir: SortDirection;
  search: string;
  searchField: StudentsSearchField;
  classIds: string[];
  academicYearId: string;
  programmeId: string;
  gender: string;
  studentStatus: string;
  transportOpted: TransportFilter;
  admissionDateFrom: string;
  admissionDateTo: string;
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
  const transportRaw = sp.get(PARAM.isTransportOpted);
  const classIdsRaw = sp.get(PARAM.classIds);

  return {
    page: parseIntSafe(sp.get(PARAM.page), DEFAULT_PAGE),
    pageSize: parseIntSafe(sp.get(PARAM.perPage), DEFAULT_PAGE_SIZE, {
      min: 1,
      max: 100,
    }),
    sortBy: (VALID_SORT_BYS as string[]).includes(sortByRaw ?? "")
      ? (sortByRaw as StudentsSortBy)
      : DEFAULT_SORT_BY,
    sortDir: sortDirRaw === "desc" ? "desc" : "asc",
    search: sp.get(PARAM.search) ?? "",
    searchField: (VALID_SEARCH_FIELDS as string[]).includes(searchFieldRaw ?? "")
      ? (searchFieldRaw as StudentsSearchField)
      : DEFAULT_SEARCH_FIELD,
    classIds: classIdsRaw
      ? classIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    academicYearId: sp.get(PARAM.academicYearId) ?? "",
    programmeId: sp.get(PARAM.programmeId) ?? "",
    gender: sp.get(PARAM.gender) ?? "",
    studentStatus: sp.get(PARAM.studentStatus) ?? "",
    transportOpted:
      transportRaw === "true" ? "yes" : transportRaw === "false" ? "no" : "",
    admissionDateFrom: sp.get(PARAM.admissionFrom) ?? "",
    admissionDateTo: sp.get(PARAM.admissionTo) ?? "",
  };
}

function activeFilterCount(s: UrlState): number {
  return (
    (s.classIds.length > 0 ? 1 : 0) +
    (s.academicYearId ? 1 : 0) +
    (s.programmeId ? 1 : 0) +
    (s.gender ? 1 : 0) +
    (s.studentStatus ? 1 : 0) +
    (s.transportOpted ? 1 : 0) +
    (s.admissionDateFrom || s.admissionDateTo ? 1 : 0)
  );
}

// ---------- page ----------

export default function StudentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Everything that should survive reload/share lives in the URL.
  const url = useMemo(
    () => readUrlState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  // Ephemeral UI state (not URL-backed).
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Search input is typed locally, then debounced into the URL. Keeping it
  // local avoids writing to the URL on every keystroke.
  const [searchInput, setSearchInput] = useState(url.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // External URL changes (Clear all, back button, page reload) need to flow
  // back into the input. "Adjust state during render" keeps this lint-clean.
  const [prevCommittedSearch, setPrevCommittedSearch] = useState(url.search);
  if (prevCommittedSearch !== url.search) {
    setPrevCommittedSearch(url.search);
    setSearchInput(url.search);
  }

  // `setUrlParams` writes a partial update to the URL, dropping keys whose
  // value equals the default so the bar stays clean.
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

      // Any change to what is being listed invalidates the current page number:
      // clearing a filter while on page 3 of the filtered set would otherwise
      // leave you on page 3 of the unfiltered set (often past the end, showing
      // nothing) — which reads as "the clear button did nothing".
      const changesResultSet = Object.keys(updates).some((k) => k !== "page");
      if (changesResultSet) next.delete(PARAM.page);
      // Strip any param that's at its default.
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

  // Push the debounced search value into the URL (only when it diverges from
  // what's already there to avoid loops / pointless history churn).
  useEffect(() => {
    // Ignore a debounced value that no longer matches the box. Clearing sets
    // `searchInput` to "" immediately while `debouncedSearch` still holds the
    // old term for up to 300ms; without this guard the URL change re-runs this
    // effect and writes the old term straight back, resurrecting the search the
    // user just cleared until the debounce catches up. That race is why Clear
    // appeared to do nothing on the first click.
    if (debouncedSearch !== searchInput) return;
    if (debouncedSearch === url.search) return;
    setUrlParams({ search: debouncedSearch || null });
  }, [debouncedSearch, searchInput, url.search, setUrlParams]);

  // Build the server query from URL state.
  const queryParams = useMemo(
    () => ({
      page: url.page,
      per_page: url.pageSize,
      sort_by: url.sortBy,
      sort_dir: url.sortDir,
      search: url.search || undefined,
      search_field: url.searchField,
      class_ids: url.classIds.length ? url.classIds : undefined,
      academic_year_id: url.academicYearId || undefined,
      programme_id: url.programmeId || undefined,
      gender: url.gender || undefined,
      student_status: url.studentStatus || undefined,
      is_transport_opted:
        url.transportOpted === "yes"
          ? true
          : url.transportOpted === "no"
          ? false
          : undefined,
      admission_date_from: url.admissionDateFrom || undefined,
      admission_date_to: url.admissionDateTo || undefined,
    }),
    [url]
  );

  const { data, isLoading, isFetching, isError, refetch } = useStudents(queryParams);
  const { data: classes = [] } = useClasses();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: programmes = [] } = useProgrammes();
  const createMutation = useCreateStudent();
  const bulkDeleteMutation = useBulkDeleteStudents();
  const bulkStatusMutation = useBulkUpdateStudentStatus();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("student.update");
  const canDelete = hasPermission("student.delete");

  // Row selection (persists across pages; ids may span pages).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback((visibleIds: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const handleBulkStatus = async (status: string) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await bulkStatusMutation.mutateAsync({
        studentIds: ids,
        studentStatus: status,
      });
      // Success + error toasts owned by useBulkUpdateStudentStatus.
      clearSelection();
    } catch {
      // Keep the selection so the user can retry.
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // One request for the whole selection — this used to fire a DELETE per
      // row, so deleting a full page meant 100 concurrent calls.
      await bulkDeleteMutation.mutateAsync(ids);
      // Success + error toasts owned by useBulkDeleteStudents.
      clearSelection();
    } catch {
      // Keep the selection so the user can retry.
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await studentsService.exportStudents(queryParams);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e: unknown) {
      toastError(e, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const selectedCount = selectedIds.size;

  // Clamp to the last page whenever the filtered result has fewer pages than
  // the current page (e.g. after tightening filters while on page 5).
  useEffect(() => {
    if (!data) return;
    if (totalPages >= 1 && url.page > totalPages) {
      setUrlParams({ page: String(totalPages) });
    }
  }, [data, totalPages, url.page, setUrlParams]);

  const classLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classes) m.set(c.id, formatClassName(c));
    return m;
  }, [classes]);

  const selectedClassLabel =
    url.classIds.length === 0
      ? null
      : url.classIds.length === 1
      ? classLabelById.get(url.classIds[0]) ?? "1 class"
      : `${url.classIds.length} classes`;

  const academicYearLabel = useMemo(
    () => academicYears.find((ay) => ay.id === url.academicYearId)?.name,
    [academicYears, url.academicYearId]
  );

  const programmeLabel = useMemo(
    () => programmes.find((p) => p.id === url.programmeId)?.name,
    [programmes, url.programmeId]
  );

  const sortIsDefault =
    url.sortBy === DEFAULT_SORT_BY && url.sortDir === DEFAULT_SORT_DIR;
  const activeCount = activeFilterCount(url);

  // ---------- URL mutators ----------

  const setPage = (next: number) => setUrlParams({ page: String(next) });

  const handlePageSizeChange = (nextSize: number) => {
    // Preserve the first visible row when changing page size.
    const firstItemIndex = (url.page - 1) * url.pageSize;
    const nextPage = Math.max(1, Math.floor(firstItemIndex / nextSize) + 1);
    setUrlParams({
      perPage: String(nextSize),
      page: String(nextPage),
    });
  };

  const setSort = (nextBy: StudentsSortBy, nextDir: SortDirection) =>
    setUrlParams({ sortBy: nextBy, sortDir: nextDir });

  const clearSort = () =>
    setUrlParams({ sortBy: null, sortDir: null });

  const setSearchField = (next: StudentsSearchField) =>
    setUrlParams({ searchField: next });

  const clearSearch = () => {
    setSearchInput("");
    setUrlParams({ search: null, searchField: null });
  };

  const toggleClassId = (classId: string, checked: boolean) => {
    const next = checked
      ? [...url.classIds, classId]
      : url.classIds.filter((id) => id !== classId);
    setUrlParams({ classIds: next.length ? next.join(",") : null });
  };

  const setAcademicYearId = (next: string) =>
    setUrlParams({ academicYearId: next || null });

  const setProgrammeId = (next: string) =>
    setUrlParams({ programmeId: next || null });

  const setGender = (next: string) =>
    setUrlParams({ gender: next || null });

  const setStudentStatus = (next: string) =>
    setUrlParams({ studentStatus: next || null });

  const setTransportOpted = (next: TransportFilter) =>
    setUrlParams({
      isTransportOpted:
        next === "yes" ? "true" : next === "no" ? "false" : null,
    });

  const setAdmissionDate = (from: string, to: string) =>
    setUrlParams({
      admissionFrom: from || null,
      admissionTo: to || null,
    });

  const clearAllFilters = () =>
    setUrlParams({
      classIds: null,
      academicYearId: null,
      programmeId: null,
      gender: null,
      studentStatus: null,
      isTransportOpted: null,
      admissionFrom: null,
      admissionTo: null,
    });

  const handleCreate = async (
    input: Parameters<typeof createMutation.mutateAsync>[0]
  ) => {
    await createMutation.mutateAsync(input);
    setCreateOpen(false);
  };

  const columns: DataTableColumn<Student>[] = [
    {
      key: "admission_number",
      header: "Admission #",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs">{row.admission_number}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "class",
      sortKey: "class",
      header: "Class",
      sortable: true,
      cell: (row) =>
        row.class_name ? (
          row.class_name
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "programme",
      header: "Programme",
      sortable: true,
      cell: (row) =>
        row.programme_name ? (
          row.programme_name
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "roll_number",
      header: "Roll #",
      sortable: true,
      cell: (row) =>
        row.roll_number !== undefined && row.roll_number !== null ? (
          <span className="tabular-nums">{row.roll_number}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "gender",
      header: "Gender",
      cell: (row) => genderBadge(row.gender),
    },
    {
      key: "guardian_phone",
      header: "Guardian phone",
      cell: (row) =>
        row.guardian_phone ? (
          <a
            href={`tel:${row.guardian_phone}`}
            onClick={(e) => e.stopPropagation()}
            className="tabular-nums hover:underline"
          >
            {row.guardian_phone}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "student_status",
      header: "Status",
      cell: (row) => statusPill(row.student_status),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage student records and enrollment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add Student
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2"
          >
            {/* Document-with-arrow vs. the tray-with-arrow on Export: lucide's
                Upload/Download pair are mirror images of one another, which is
                what made these two read as interchangeable. Differing by
                silhouette, not just arrow direction, tells them apart at a
                glance — and a document glyph matches what Bulk Import takes. */}
            <FileUp className="size-4" />
            Bulk Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export
          </Button>
          {canUpdate && (
            <Link href="/dashboard/academics/year-transition">
              <Button variant="outline" className="gap-2">
                <GraduationCap className="size-4" />
                Promote
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading students…"
              : `${total.toLocaleString()} ${total === 1 ? "student" : "students"}${
                  activeCount > 0 || url.search ? " match current filters" : " total"
                }`}
          </CardDescription>

          {/* Search + filter row */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="flex min-w-0 flex-1 items-stretch rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <Select
                value={url.searchField}
                onValueChange={(v) =>
                  setSearchField(v as StudentsSearchField)
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
                      ? "Search name, admission #, email, phone, programme…"
                      : `Search by ${
                          SEARCH_FIELD_OPTIONS.find((o) => o.value === url.searchField)?.label.toLowerCase() ?? "field"
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
              {/* The panel is taller than a short viewport (or a laptop screen
                  with the browser chrome expanded), so it is capped to the space
                  Radix reports as available and scrolls internally instead of
                  being clipped at the bottom. collisionPadding keeps it off the
                  viewport edge. */}
              <PopoverContent
                align="end"
                collisionPadding={16}
                className="max-h-[var(--radix-popover-content-available-height)] w-[340px] overflow-y-auto p-4"
              >
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

                  {/* Class (multi) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Class
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-9 w-full justify-between"
                        >
                          <span className="truncate text-sm">
                            {selectedClassLabel ?? "All classes"}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[300px] max-h-64 overflow-y-auto">
                        <DropdownMenuLabel>Select classes</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {classes.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No classes available
                          </div>
                        ) : (
                          classes.map((c) => {
                            const checked = url.classIds.includes(c.id);
                            return (
                              <DropdownMenuCheckboxItem
                                key={c.id}
                                checked={checked}
                                onCheckedChange={(v) => toggleClassId(c.id, v)}
                                onSelect={(e) => e.preventDefault()}
                              >
                                {formatClassName(c)}
                              </DropdownMenuCheckboxItem>
                            );
                          })
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Programme */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Programme
                    </label>
                    <Select
                      value={url.programmeId || "__all__"}
                      onValueChange={(v) =>
                        setProgrammeId(v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any</SelectItem>
                        {programmes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Academic year */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Academic year
                    </label>
                    <Select
                      value={url.academicYearId || "__all__"}
                      onValueChange={(v) =>
                        setAcademicYearId(v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any</SelectItem>
                        {academicYears.map((ay) => (
                          <SelectItem key={ay.id} value={ay.id}>
                            {ay.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender + Status in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Gender
                      </label>
                      <Select
                        value={url.gender || "__all__"}
                        onValueChange={(v) =>
                          setGender(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Any</SelectItem>
                          {GENDER_OPTIONS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Status
                      </label>
                      <Select
                        value={url.studentStatus || "__all__"}
                        onValueChange={(v) =>
                          setStudentStatus(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Any</SelectItem>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Transport opted */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Transport
                    </label>
                    <div className="flex gap-1.5">
                      {[
                        { v: "" as const, label: "Any" },
                        { v: "yes" as const, label: "Opted" },
                        { v: "no" as const, label: "Not opted" },
                      ].map((opt) => (
                        <button
                          key={opt.v || "any"}
                          type="button"
                          onClick={() => setTransportOpted(opt.v)}
                          className={cn(
                            "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                            url.transportOpted === opt.v
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Admission date range */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Admission date
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={url.admissionDateFrom}
                        onChange={(e) =>
                          setAdmissionDate(e.target.value, url.admissionDateTo)
                        }
                        className="h-9"
                      />
                      <Input
                        type="date"
                        value={url.admissionDateTo}
                        onChange={(e) =>
                          setAdmissionDate(url.admissionDateFrom, e.target.value)
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
                    SEARCH_FIELD_OPTIONS.find((o) => o.value === url.searchField)?.label ?? "Search"
                  }: "${url.search}"`}
                  onRemove={clearSearch}
                />
              )}
              {url.classIds.length > 0 && (
                <FilterPill
                  label={`Class: ${selectedClassLabel}`}
                  onRemove={() => setUrlParams({ classIds: null })}
                />
              )}
              {url.academicYearId && (
                <FilterPill
                  label={`Year: ${academicYearLabel ?? url.academicYearId}`}
                  onRemove={() => setAcademicYearId("")}
                />
              )}
              {url.programmeId && (
                <FilterPill
                  label={`Programme: ${programmeLabel ?? url.programmeId}`}
                  onRemove={() => setProgrammeId("")}
                />
              )}
              {url.gender && (
                <FilterPill
                  label={`Gender: ${url.gender}`}
                  onRemove={() => setGender("")}
                />
              )}
              {url.studentStatus && (
                <FilterPill
                  label={`Status: ${url.studentStatus}`}
                  onRemove={() => setStudentStatus("")}
                />
              )}
              {url.transportOpted && (
                <FilterPill
                  label={`Transport: ${url.transportOpted === "yes" ? "Opted" : "Not opted"}`}
                  onRemove={() => setTransportOpted("")}
                />
              )}
              {(url.admissionDateFrom || url.admissionDateTo) && (
                <FilterPill
                  label={`Admitted: ${url.admissionDateFrom || "…"} → ${url.admissionDateTo || "…"}`}
                  onRemove={() => setAdmissionDate("", "")}
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
          {(canUpdate || canDelete) && (
            <BulkActionBar
              selectedCount={selectedCount}
              onClear={clearSelection}
              noun="student"
            >
              {canUpdate && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={bulkStatusMutation.isPending}
                      >
                        Change status
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Set status to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {STUDENT_STATUS_OPTIONS.map((o) => (
                        <DropdownMenuItem
                          key={o.value}
                          onClick={() => handleBulkStatus(o.value)}
                        >
                          {o.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              )}
            </BulkActionBar>
          )}
          <DataTable
            columns={columns}
            data={items}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            errorMessage="Couldn't load students. Check your connection and retry."
            emptyMessage={
              url.search || activeCount > 0
                ? "No students match the current filters."
                : "No students found. Add a student or use Bulk Import."
            }
            sort={{ column: url.sortBy, direction: url.sortDir }}
            onSortChange={(column, direction) => {
              if (direction === null) {
                clearSort();
                return;
              }
              setSort(column as StudentsSortBy, direction);
            }}
            pagination={{
              page: url.page,
              pageSize: url.pageSize,
              total,
              onPageChange: setPage,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onPageSizeChange: handlePageSizeChange,
            }}
            selection={
              canUpdate || canDelete
                ? {
                    selectedIds,
                    onToggle: toggleRow,
                    onToggleAll: toggleAllVisible,
                  }
                : undefined
            }
            onRowClick={(row) => router.push(`/students/${row.id}`)}
            className={cn(isFetching && !isLoading && "opacity-80")}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedCount} student${selectedCount === 1 ? "" : "s"}?`}
        description="This permanently removes the selected students along with their logins, uploaded documents, and fee records. This cannot be undone."
        confirmLabel="Delete permanently"
        variant="destructive"
        loading={bulkDeleteMutation.isPending}
        onConfirm={handleBulkDelete}
      />

      <BulkImportStudents open={importOpen} onOpenChange={setImportOpen} />

      <StudentFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        classes={classes}
        onSubmit={handleCreate}
      />
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
