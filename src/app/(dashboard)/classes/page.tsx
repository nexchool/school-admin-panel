"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Download,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/hooks";
import { useClassesList, useClassesStats } from "@/hooks/useClasses";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useActiveUnit } from "@/contexts/ActiveUnitContext";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useGrades } from "@/hooks/useGrades";
import { useDepartments } from "@/hooks/useDepartments";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isSchoolSetupEnabled } from "@/lib/featureFlags";
import { toastError } from "@/lib/errorToast";
import { classesService } from "@/services/classesService";
import { cn } from "@/lib/utils";
import type {
  ClassItem,
  ClassesListFilters,
  ClassesSortBy,
} from "@/types/class";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT: ClassesSortBy = "grade";

/** Radix Select forbids value="", so "any" stands in for "no filter". */
const ANY = "__all__";

export default function ClassesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("class.create");

  const { academicYearId } = useActiveAcademicYear();
  const { unitId } = useActiveUnit();

  // Branch defaults to the header's active unit so the page agrees with the
  // global switcher on load, but the in-page filter overrides it once touched.
  //
  // "All branches" needs its own marker rather than an absent param: dropping
  // the param would fall straight back through `?? unitId` and silently
  // re-apply the active unit, making the option a no-op.
  const branchParam = searchParams.get("branch");
  const branchId =
    branchParam === null ? unitId ?? "" : branchParam === ANY ? "" : branchParam;
  const programmeId = searchParams.get("programme") ?? "";
  const gradeId = searchParams.get("grade") ?? "";
  const departmentId = searchParams.get("department") ?? "";
  const sortBy = (searchParams.get("sort") as ClassesSortBy | null) ?? DEFAULT_SORT;
  const sortDir = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const page = Number(searchParams.get("page") ?? 1) || 1;
  const pageSize = Number(searchParams.get("size") ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
  const search = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const setParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") sp.delete(key);
        else sp.set(key, String(value));
      }
      router.replace(`/classes${sp.toString() ? `?${sp}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  // Any filter change resets to page 1 — otherwise you can land on a page that
  // no longer exists in the narrowed result set.
  //
  // Branch keeps the ANY marker in the URL (see above); the other two inherit
  // nothing, so for them "any" is just an absent param.
  const setFilter = useCallback(
    (key: string, value: string) => {
      const cleared = key === "branch" ? ANY : null;
      setParams({ [key]: value === ANY ? cleared : value, page: null });
    },
    [setParams]
  );

  // The search box and the URL have to stay in step in both directions, so
  // track the last value this component wrote to tell the two apart.
  const lastSyncedSearch = useRef(search);

  // Typing -> URL. In an effect, not in render: router.replace during render
  // would re-enter this component forever.
  useEffect(() => {
    if (debouncedSearch === lastSyncedSearch.current) return;
    lastSyncedSearch.current = debouncedSearch;
    setParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, setParams]);

  // URL -> search box, for changes this component didn't make (a deep link, or
  // hitting the sidebar's Classes link while a search is active). Without this
  // the stale input would just push its old term straight back.
  useEffect(() => {
    if (search !== lastSyncedSearch.current) {
      lastSyncedSearch.current = search;
      setSearchInput(search);
    }
  }, [search]);

  const filters: ClassesListFilters = useMemo(
    () => ({
      academic_year_id: academicYearId,
      school_unit_id: branchId || null,
      programme_id: programmeId || null,
      grade_id: gradeId || null,
      department_id: departmentId || null,
      search: search || null,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      per_page: pageSize,
    }),
    [
      academicYearId, branchId, programmeId, gradeId, departmentId, search,
      sortBy, sortDir, page, pageSize,
    ]
  );

  // Stats describe the whole filtered set, so they must not carry pagination.
  const statsFilters = useMemo(
    () => ({ ...filters, page: undefined, per_page: undefined }),
    [filters]
  );

  const { data, isLoading, isError, isFetching, refetch } = useClassesList(filters);
  const { data: stats, isLoading: statsLoading } = useClassesStats(statsFilters);

  const { data: units = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const { data: grades = [] } = useGrades();
  const { data: departmentsData } = useDepartments({
    status: "active",
    perPage: 100,
  });
  const departments = departmentsData?.items ?? [];

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await classesService.exportClasses(statsFilters);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `classes_${new Date().toISOString().slice(0, 10)}.csv`;
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

  // Only counts filters the user actually set. A branch inherited from the
  // header switcher isn't one, so it must not light up "Clear" or turn the
  // empty state into "no matches".
  const hasFilters = Boolean(
    branchParam !== null || programmeId || gradeId || departmentId || search
  );

  // The active-departments facet (used for the filter's option list) omits a
  // department that has since gone inactive. If the URL still carries its id,
  // it won't match any option and the Select would silently fall back to the
  // "All Departments" placeholder — indistinguishable from no filter being
  // applied at all, even though results are still narrowed. Recover a label
  // for it from the already-loaded rows (which carry department_name
  // regardless of the department's current status) so FilterSelect can show
  // it as a disabled, clearly-labeled entry instead. `departments` and
  // `items` are already fresh per-render derivations of query data, so this
  // gains nothing from useMemo.
  const currentDepartmentName =
    departmentId && !departments.some((d) => d.id === departmentId)
      ? items.find((i) => i.department_id === departmentId)?.department_name ?? undefined
      : undefined;

  const columns: DataTableColumn<ClassItem>[] = useMemo(
    () => [
      {
        key: "grade",
        header: "Class / Grade",
        sortable: true,
        cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <UsersRound className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {classLabel(row)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.stream || row.medium_name || row.academic_year || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "programme",
        header: "Programme",
        sortable: true,
        cell: (row) => row.programme_name ?? "—",
      },
      {
        key: "branch",
        header: "Branch",
        sortable: true,
        cell: (row) => row.school_unit_name ?? "—",
      },
      {
        key: "student_count",
        header: "Students",
        sortable: true,
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users className="size-3.5 text-muted-foreground" />
            {row.student_count ?? 0}
          </span>
        ),
      },
      {
        key: "teacher_count",
        header: "Teachers",
        sortable: true,
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <GraduationCap className="size-3.5 text-muted-foreground" />
            {row.teacher_count ?? 0}
          </span>
        ),
      },
      {
        key: "department",
        header: "Department",
        cell: (row) => row.department_name ?? "—",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusPill status={row.status} />,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Classes
            <BookOpen className="size-5 text-primary" />
          </h1>
          <p className="text-muted-foreground">
            Every class across your branches, programmes and grades.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {canCreate && isSchoolSetupEnabled() && (
            <Button asChild className="gap-2">
              <Link href="/school-setup">
                <Plus className="size-4" />
                Add classes
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Total Classes"
          value={stats?.total_classes}
          sub="Across all grades"
          tone="primary"
          loading={statsLoading}
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.total_students}
          sub="Enrolled in all classes"
          tone="success"
          loading={statsLoading}
        />
        <StatCard
          icon={GraduationCap}
          label="Total Teachers"
          value={stats?.total_teachers}
          sub="Teaching across classes"
          tone="info"
          loading={statsLoading}
        />
        <StatCard
          icon={UsersRound}
          label="Average Class Size"
          value={stats?.average_class_size}
          sub="Students per class"
          tone="warning"
          loading={statsLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={branchId}
                onChange={(v) => setFilter("branch", v)}
                placeholder="All Branches"
                options={units.map((u) => ({ id: u.id, name: u.name }))}
              />
              <FilterSelect
                value={programmeId}
                onChange={(v) => setFilter("programme", v)}
                placeholder="All Programmes"
                options={programmes.map((p) => ({ id: p.id, name: p.name }))}
              />
              <FilterSelect
                value={gradeId}
                onChange={(v) => setFilter("grade", v)}
                placeholder="All Grades"
                options={grades.map((g) => ({ id: g.id, name: g.name }))}
              />
              <FilterSelect
                value={departmentId}
                onChange={(v) => setFilter("department", v)}
                placeholder="All Departments"
                options={departments.map((d) => ({ id: d.id, name: d.name }))}
                unmatchedLabel={
                  currentDepartmentName
                    ? `${currentDepartmentName} (inactive)`
                    : undefined
                }
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    setParams({
                      branch: null, programme: null, grade: null,
                      department: null, q: null, page: null,
                    });
                  }}
                  className="h-9 gap-1.5 text-muted-foreground"
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search classes…"
                className="h-9 pl-9"
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
          <DataTable
            columns={columns}
            data={items}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            errorMessage="Couldn't load classes. Check your connection and retry."
            emptyMessage={
              hasFilters
                ? "No classes match these filters."
                : "No classes yet. Add your first batch from School Setup."
            }
            sort={{ column: sortBy, direction: sortDir }}
            onSortChange={(column, direction) =>
              setParams(
                direction === null
                  ? { sort: null, dir: null, page: null }
                  : { sort: column, dir: direction, page: null }
              )
            }
            pagination={{
              page,
              pageSize,
              total,
              onPageChange: (next) => setParams({ page: next }),
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onPageSizeChange: (size) => setParams({ size, page: null }),
            }}
            onRowClick={(row) => router.push(`/classes/${row.id}`)}
            className={cn(isFetching && !isLoading && "opacity-80")}
          />
        </CardContent>
      </Card>

      {!isLoading && total === 0 && !hasFilters && isSchoolSetupEnabled() && (
        <Card>
          <CardHeader>
            <CardTitle>No classes yet</CardTitle>
            <CardDescription>
              Use School Setup to add your first batch of classes via the guided
              builder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/school-setup">Open School Setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** "Grade 1 A", falling back through the legacy display fields. */
function classLabel(row: ClassItem): string {
  const grade =
    row.grade_name ??
    row.name ??
    (row.grade_level != null ? `Grade ${row.grade_level}` : "—");
  return row.section ? `${grade} ${row.section}` : grade;
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
      : "bg-muted text-muted-foreground ring-1 ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        tone
      )}
    >
      {status}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  unmatchedLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { id: string; name: string }[];
  /** Opt-in: when supplied, and `value` isn't present in `options`, renders
   *  a disabled entry with this label instead of letting Radix fall back to
   *  `placeholder` (which reads identically to "no filter" even though one
   *  is still applied) — e.g. a department that went inactive after a class
   *  was assigned to it. Omitted callers (Branch/Programme/Grade) keep the
   *  old fallback-to-placeholder behavior verbatim, since for them an
   *  unmatched `value` is normally just the pre-hydration render window
   *  before their options list has loaded, not a real orphaned reference. */
  unmatchedLabel?: string;
}) {
  // Gated on unmatchedLabel being supplied: Branch/Programme/Grade don't pass
  // it and must stay on their old behavior (fall back to the placeholder)
  // rather than surfacing a raw id — e.g. during the ordinary render window
  // before useSchoolUnits/useProgrammes/useGrades resolve, when `options` is
  // still `[]` but the URL already carries a value.
  const isUnmatched =
    !!unmatchedLabel && !!value && !options.some((o) => o.id === value);
  return (
    <Select value={value || ANY} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {isUnmatched && (
          // isUnmatched already implies unmatchedLabel is set.
          <SelectItem value={value} disabled>
            {unmatchedLabel}
          </SelectItem>
        )}
        {options
          .filter((o) => o.id !== ANY)
          .map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
