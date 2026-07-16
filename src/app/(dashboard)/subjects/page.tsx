"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";

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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/tables/DataTable";
import { SubjectFormModal } from "@/components/subjects/SubjectFormModal";
import { AssignClassesModal } from "@/components/subjects/AssignClassesModal";
import {
  useSubjectsList,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from "@/hooks/useSubjects";
import { useAuth } from "@/hooks";
import { toastError } from "@/lib/errorToast";
import type {
  CreateSubjectInput,
  SubjectListItem,
  SubjectType,
} from "@/types/subject";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const ALL_TYPES = "__all__";

const TYPE_LABELS: Record<string, string> = {
  core: "Core",
  elective: "Elective",
  language: "Language",
  activity: "Activity",
  co_curricular: "Co-curricular",
  other: "Other",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function parseIntSafe(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export default function SubjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("subject.manage");
  const canAssign = hasPermission("class_subject.manage");

  // URL-backed list state.
  const urlState = useMemo(
    () => ({
      page: parseIntSafe(searchParams?.get("page") ?? null, 1),
      pageSize: parseIntSafe(searchParams?.get("pageSize") ?? null, DEFAULT_PAGE_SIZE),
      search: searchParams?.get("search") ?? "",
      type: searchParams?.get("type") ?? "",
    }),
    [searchParams]
  );

  const [searchInput, setSearchInput] = useState(urlState.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Sync external URL changes (back/forward) into the input.
  const [lastUrlSearch, setLastUrlSearch] = useState(urlState.search);
  if (urlState.search !== lastUrlSearch) {
    setLastUrlSearch(urlState.search);
    setSearchInput(urlState.search);
  }

  const setUrlParams = (
    partial: Partial<{ page: number; pageSize: number; search: string; type: string }>
  ) => {
    const next = new URLSearchParams(searchParams?.toString());
    const merged = { ...urlState, ...partial };
    const setOrDelete = (key: string, value: string, isDefault: boolean) => {
      if (isDefault) next.delete(key);
      else next.set(key, value);
    };
    setOrDelete("page", String(merged.page), merged.page === 1);
    setOrDelete("pageSize", String(merged.pageSize), merged.pageSize === DEFAULT_PAGE_SIZE);
    setOrDelete("search", merged.search, merged.search === "");
    setOrDelete("type", merged.type, merged.type === "");
    const qs = next.toString();
    router.replace(qs ? `/subjects?${qs}` : "/subjects", { scroll: false });
  };

  // Push the debounced search into the URL (resets to page 1).
  useEffect(() => {
    if (debouncedSearch !== urlState.search) {
      setUrlParams({ search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const listQuery = useSubjectsList({
    page: urlState.page,
    perPage: urlState.pageSize,
    search: urlState.search || undefined,
    subjectType: (urlState.type || undefined) as SubjectType | undefined,
  });
  const result = listQuery.data;
  const subjects = result?.items ?? [];

  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();

  const [formOpen, setFormOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<SubjectListItem | null>(null);
  const [assignSubject, setAssignSubject] = useState<SubjectListItem | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<SubjectListItem | null>(null);

  const handleFormSubmit = async (data: CreateSubjectInput) => {
    try {
      if (editSubject) {
        await updateMutation.mutateAsync({ id: editSubject.id, input: data });
        toast.success("Subject updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success(
          data.class_ids?.length
            ? `Subject created and assigned to ${data.class_ids.length} class${data.class_ids.length === 1 ? "" : "es"}`
            : "Subject created"
        );
      }
      setFormOpen(false);
      setEditSubject(null);
    } catch (e) {
      toastError(e, "Failed to save subject");
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteSubject) return;
    try {
      await deleteMutation.mutateAsync(deleteSubject.id);
      toast.success("Subject deleted");
      setDeleteSubject(null);
    } catch (e) {
      toastError(e, "Failed to delete subject");
    }
  };

  const columns: DataTableColumn<SubjectListItem>[] = [
    { key: "name", header: "Name" },
    {
      key: "code",
      header: "Code",
      cell: (r) => (r.code ? <span className="font-mono text-xs">{r.code}</span> : "—"),
    },
    {
      key: "subject_type",
      header: "Type",
      cell: (r) => TYPE_LABELS[r.subject_type ?? ""] ?? r.subject_type ?? "—",
    },
    {
      key: "classes",
      header: "Classes",
      cell: (r) =>
        r.classes.length === 0 ? (
          <span className="text-muted-foreground">Not assigned</span>
        ) : (
          <div className="flex max-w-72 flex-wrap gap-1">
            {r.classes.slice(0, 4).map((c) => (
              <Badge key={c.class_subject_id} variant="secondary" className="font-normal">
                {/* Seeded classes often have no display name — "Grade-Section"
                    keeps chips unambiguous across grades. */}
                {c.grade_name && c.class_name && !c.class_name.includes(c.grade_name)
                  ? `${c.grade_name}-${c.class_name}`
                  : c.class_name ?? c.class_id}
              </Badge>
            ))}
            {r.classes.length > 4 && (
              <Badge variant="outline" className="font-normal">
                +{r.classes.length - 4} more
              </Badge>
            )}
          </div>
        ),
    },
    {
      key: "programmes",
      header: "Programmes",
      cell: (r) =>
        r.programmes.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-sm">
            {r.programmes.map((p) => p.name).filter(Boolean).join(", ")}
          </span>
        ),
    },
    ...(canManage || canAssign
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: SubjectListItem) => (
              <div className="flex justify-end gap-1">
                {canAssign && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Assign to classes"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignSubject(r);
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit subject"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditSubject(r);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete subject"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSubject(r);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          } satisfies DataTableColumn<SubjectListItem>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Master catalogue of subjects — create, edit, and assign them to classes.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditSubject(null);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            Add subject
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {result ? `${result.total} subject${result.total !== 1 ? "s" : ""}` : "Subjects"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by name, code or description…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={urlState.type || ALL_TYPES}
              onValueChange={(v) =>
                setUrlParams({ type: v === ALL_TYPES ? "" : v, page: 1 })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={subjects}
            getRowId={(row) => row.id}
            isLoading={listQuery.isLoading}
            isError={listQuery.isError}
            onRetry={() => listQuery.refetch()}
            errorMessage="Couldn't load subjects. Check your connection and retry."
            emptyMessage={
              urlState.search || urlState.type
                ? "No subjects match your filters."
                : "No subjects yet. Add one to get started."
            }
            pagination={{
              page: urlState.page,
              pageSize: urlState.pageSize,
              total: result?.total ?? 0,
              onPageChange: (page) => setUrlParams({ page }),
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onPageSizeChange: (pageSize) => setUrlParams({ pageSize, page: 1 }),
            }}
          />
        </CardContent>
      </Card>

      <SubjectFormModal
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditSubject(null);
        }}
        initialData={editSubject ?? undefined}
        onSubmit={handleFormSubmit}
        canAssignClasses={canAssign}
      />

      <AssignClassesModal
        open={!!assignSubject}
        onOpenChange={(o) => !o && setAssignSubject(null)}
        subject={assignSubject}
      />

      <Dialog open={!!deleteSubject} onOpenChange={(o) => !o && setDeleteSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete subject</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &quot;{deleteSubject?.name}&quot;? Subjects still assigned to a
            class can&apos;t be deleted — remove them from those classes first.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubject(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
