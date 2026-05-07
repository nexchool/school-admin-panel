"use client";

import { useState, useMemo } from "react";
import { X, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTemplates, useTemplateItems } from "@/hooks/useSchoolSetup";
import { useCreateSubject } from "@/hooks/useSubjects";

// ── Local types ───────────────────────────────────────────────────────

type EditedItem = {
  subject_name: string;
  subject_code: string;
  is_elective: boolean;
};

type AddedRow = {
  tempId: string;
  grade_number: number;
  subject_name: string;
  subject_code: string;
  is_elective: boolean;
};

// ── Props ─────────────────────────────────────────────────────────────

type TemplateDetailModalProps = {
  templateId: string;
  onClose: () => void;
};

// ── Component ─────────────────────────────────────────────────────────

export function TemplateDetailModal({
  templateId,
  onClose,
}: TemplateDetailModalProps) {
  const { data: templatesResult } = useTemplates();
  const { data: itemsResult, isLoading: itemsLoading } =
    useTemplateItems(templateId);

  const createSubject = useCreateSubject();

  // ── Modal state ───────────────────────────────────────────────────
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editedItems, setEditedItems] = useState<Map<string, EditedItem>>(
    new Map(),
  );
  const [addedRows, setAddedRows] = useState<AddedRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────
  const templateGroup = useMemo(
    () => templatesResult?.data?.find((g) => g.id === templateId),
    [templatesResult, templateId],
  );

  const allItems = itemsResult?.data ?? [];

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.subject_name.toLowerCase().includes(q) ||
        (item.subject_code ?? "").toLowerCase().includes(q),
    );
  }, [allItems, searchQuery]);

  // Group items by grade_number
  const itemsByGrade = useMemo(() => {
    const map = new Map<number, typeof filteredItems>();
    for (const item of filteredItems) {
      if (!map.has(item.grade_number)) {
        map.set(item.grade_number, []);
      }
      map.get(item.grade_number)!.push(item);
    }
    // Also include added rows for matching grades
    for (const row of addedRows) {
      if (
        searchQuery &&
        !row.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !row.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        continue;
      }
      if (!map.has(row.grade_number)) {
        map.set(row.grade_number, []);
      }
    }
    return new Map([...map.entries()].sort(([a], [b]) => a - b));
  }, [filteredItems, addedRows, searchQuery]);

  // Count total visible items (excluding deleted)
  const totalCount = useMemo(() => {
    const baseCount = allItems.filter((i) => !deletedIds.has(i.id)).length;
    return baseCount + addedRows.length;
  }, [allItems, deletedIds, addedRows]);

  const unsavedCount =
    editedItems.size + addedRows.length + deletedIds.size;

  // ── Helpers ───────────────────────────────────────────────────────

  function getEffectiveName(itemId: string, original: string): string {
    return editedItems.get(itemId)?.subject_name ?? original;
  }

  function getEffectiveCode(itemId: string, original: string): string {
    return editedItems.get(itemId)?.subject_code ?? (original ?? "");
  }

  function getEffectiveElective(itemId: string, original: boolean): boolean {
    return editedItems.get(itemId)?.is_elective ?? original;
  }

  function handleDiscardEdit() {
    setMode("view");
    setEditedItems(new Map());
    setAddedRows([]);
    setDeletedIds(new Set());
  }

  function updateItemField(
    itemId: string,
    field: keyof EditedItem,
    value: string | boolean,
    original: { subject_name: string; subject_code: string; is_elective: boolean },
  ) {
    setEditedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId) ?? {
        subject_name: original.subject_name,
        subject_code: original.subject_code ?? "",
        is_elective: original.is_elective,
      };
      next.set(itemId, { ...existing, [field]: value });
      return next;
    });
  }

  function toggleDelete(itemId: string) {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function addRowForGrade(grade: number) {
    const tempId = `new-${Date.now()}-${Math.random()}`;
    setAddedRows((prev) => [
      ...prev,
      {
        tempId,
        grade_number: grade,
        subject_name: "",
        subject_code: "",
        is_elective: false,
      },
    ]);
  }

  function updateAddedRow(
    tempId: string,
    field: keyof Omit<AddedRow, "tempId" | "grade_number">,
    value: string | boolean,
  ) {
    setAddedRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r)),
    );
  }

  function removeAddedRow(tempId: string) {
    setAddedRows((prev) => prev.filter((r) => r.tempId !== tempId));
  }

  // ── Apply / Save ──────────────────────────────────────────────────

  async function buildSubjectList(): Promise<
    Array<{ name: string; code?: string; subject_type: "core" | "elective" }>
  > {
    const result: Array<{
      name: string;
      code?: string;
      subject_type: "core" | "elective";
    }> = [];

    for (const item of allItems) {
      if (deletedIds.has(item.id)) continue;
      const name = getEffectiveName(item.id, item.subject_name);
      const code = getEffectiveCode(item.id, item.subject_code ?? "");
      const isElective = getEffectiveElective(item.id, item.is_elective);
      if (!name.trim()) continue;
      result.push({
        name: name.trim(),
        code: code.trim() || undefined,
        subject_type: isElective ? "elective" : "core",
      });
    }

    for (const row of addedRows) {
      if (!row.subject_name.trim()) continue;
      result.push({
        name: row.subject_name.trim(),
        code: row.subject_code.trim() || undefined,
        subject_type: row.is_elective ? "elective" : "core",
      });
    }

    return result;
  }

  async function handleUseTemplate() {
    setSaving(true);
    try {
      const subjects = await buildSubjectList();
      let created = 0;
      for (const s of subjects) {
        try {
          await createSubject.mutateAsync(s);
          created++;
        } catch {
          // skip duplicates / errors silently; parent invalidation handles refresh
        }
      }
      toast.success(`Template applied: ${created} subject${created !== 1 ? "s" : ""} created`);
      // Modal stays open per spec Q8
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndUse() {
    setSaving(true);
    try {
      const subjects = await buildSubjectList();
      let created = 0;
      for (const s of subjects) {
        try {
          await createSubject.mutateAsync(s);
          created++;
        } catch {
          // skip
        }
      }
      toast.success(
        `Saved & applied: ${created} subject${created !== 1 ? "s" : ""} created`,
      );
      setMode("view");
      setEditedItems(new Map());
      setAddedRows([]);
      setDeletedIds(new Set());
    } finally {
      setSaving(false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────

  function renderViewRow(item: (typeof allItems)[number]) {
    const name = getEffectiveName(item.id, item.subject_name);
    const code = getEffectiveCode(item.id, item.subject_code ?? "");
    const isElective = getEffectiveElective(item.id, item.is_elective);
    return (
      <tr
        key={item.id}
        className="border-b last:border-0 hover:bg-muted/20 text-sm"
      >
        <td className="px-3 py-2 font-medium">{name}</td>
        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
          {code || "—"}
        </td>
        <td className="px-3 py-2">
          <Badge variant={isElective ? "outline" : "secondary"}>
            {isElective ? "Elective" : "Core"}
          </Badge>
        </td>
        <td className="px-3 py-2 text-muted-foreground text-center">
          {item.periods_per_week ?? "—"}
        </td>
      </tr>
    );
  }

  function renderEditRow(item: (typeof allItems)[number]) {
    const isDeleted = deletedIds.has(item.id);
    return (
      <tr
        key={item.id}
        className={`border-b last:border-0 text-sm ${isDeleted ? "opacity-40 line-through" : ""}`}
      >
        <td className="px-3 py-1.5">
          <Input
            value={getEffectiveName(item.id, item.subject_name)}
            onChange={(e) =>
              updateItemField(item.id, "subject_name", e.target.value, {
                subject_name: item.subject_name,
                subject_code: item.subject_code ?? "",
                is_elective: item.is_elective,
              })
            }
            disabled={isDeleted}
            className="h-7 text-sm"
            placeholder="Subject name"
          />
        </td>
        <td className="px-3 py-1.5">
          <Input
            value={getEffectiveCode(item.id, item.subject_code ?? "")}
            onChange={(e) =>
              updateItemField(item.id, "subject_code", e.target.value, {
                subject_name: item.subject_name,
                subject_code: item.subject_code ?? "",
                is_elective: item.is_elective,
              })
            }
            disabled={isDeleted}
            className="h-7 text-sm font-mono"
            placeholder="Code"
          />
        </td>
        <td className="px-3 py-1.5 text-center">
          <input
            type="checkbox"
            checked={getEffectiveElective(item.id, item.is_elective)}
            onChange={(e) =>
              updateItemField(item.id, "is_elective", e.target.checked, {
                subject_name: item.subject_name,
                subject_code: item.subject_code ?? "",
                is_elective: item.is_elective,
              })
            }
            disabled={isDeleted}
            className="accent-primary"
            aria-label="Elective"
          />
        </td>
        <td className="px-3 py-1.5 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleDelete(item.id)}
            aria-label={isDeleted ? "Restore subject" : "Delete subject"}
          >
            {isDeleted ? (
              <span className="text-xs">↩</span>
            ) : (
              <X className="size-3 text-destructive" />
            )}
          </Button>
        </td>
      </tr>
    );
  }

  function renderAddedRow(row: AddedRow) {
    return (
      <tr key={row.tempId} className="border-b last:border-0 text-sm bg-muted/10">
        <td className="px-3 py-1.5">
          <Input
            value={row.subject_name}
            onChange={(e) =>
              updateAddedRow(row.tempId, "subject_name", e.target.value)
            }
            className="h-7 text-sm"
            placeholder="New subject name"
          />
        </td>
        <td className="px-3 py-1.5">
          <Input
            value={row.subject_code}
            onChange={(e) =>
              updateAddedRow(row.tempId, "subject_code", e.target.value)
            }
            className="h-7 text-sm font-mono"
            placeholder="Code"
          />
        </td>
        <td className="px-3 py-1.5 text-center">
          <input
            type="checkbox"
            checked={row.is_elective}
            onChange={(e) =>
              updateAddedRow(row.tempId, "is_elective", e.target.checked)
            }
            className="accent-primary"
            aria-label="Elective"
          />
        </td>
        <td className="px-3 py-1.5 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => removeAddedRow(row.tempId)}
            aria-label="Remove new row"
          >
            <Trash2 className="size-3 text-destructive" />
          </Button>
        </td>
      </tr>
    );
  }

  // ── Main render ───────────────────────────────────────────────────

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-auto"
        onClose={onClose}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="text-xl">
                {templateGroup?.name ?? "Template"}
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {templateGroup?.board_code
                  ? `Board: ${templateGroup.board_code}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                Total: {totalCount} subject{totalCount !== 1 ? "s" : ""}
              </span>
              {mode === "view" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("edit")}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit Template
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {unsavedCount > 0 && (
                    <span className="text-xs text-amber-600">
                      {unsavedCount} unsaved change{unsavedCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscardEdit}
                    disabled={saving}
                  >
                    Discard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Search bar */}
        <div className="mt-2">
          <Input
            placeholder="Search by subject name or code…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Body — accordion by grade */}
        <div className="mt-4 space-y-2">
          {itemsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading subjects…
            </p>
          ) : itemsByGrade.size === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subjects found.
            </p>
          ) : (
            Array.from(itemsByGrade.entries()).map(([grade, gradeItems]) => {
              const visibleItems = gradeItems.filter(
                (i) => mode === "edit" || !deletedIds.has(i.id),
              );
              const addedForGrade = addedRows.filter(
                (r) => r.grade_number === grade,
              );
              const totalForGrade =
                visibleItems.filter((i) => !deletedIds.has(i.id)).length +
                addedForGrade.length;

              return (
                <details key={grade} className="rounded-lg border">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 hover:bg-muted/30 rounded-lg">
                    <span className="font-medium text-sm">
                      Standard {grade}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {totalForGrade} subject{totalForGrade !== 1 ? "s" : ""}
                    </span>
                  </summary>

                  <div className="border-t">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                            Code
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">
                            {mode === "view" ? "Type" : "Elective?"}
                          </th>
                          {mode === "view" ? (
                            <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">
                              Periods/wk
                            </th>
                          ) : (
                            <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs w-10">
                              Del
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleItems.map((item) =>
                          mode === "view"
                            ? renderViewRow(item)
                            : renderEditRow(item),
                        )}
                        {mode === "edit" &&
                          addedForGrade.map((row) => renderAddedRow(row))}
                      </tbody>
                    </table>

                    {mode === "edit" && (
                      <div className="px-4 py-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => addRowForGrade(grade)}
                        >
                          <Plus className="size-3.5" />
                          Add subject to Standard {grade}
                        </Button>
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="mt-4 flex gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </Button>

          {mode === "view" ? (
            <Button
              type="button"
              onClick={handleUseTemplate}
              disabled={saving || itemsLoading}
            >
              {saving ? "Applying…" : "Use This Template →"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscardEdit}
                disabled={saving}
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={handleSaveAndUse}
                disabled={saving || itemsLoading}
              >
                {saving ? "Saving…" : "Save & Use Template →"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
