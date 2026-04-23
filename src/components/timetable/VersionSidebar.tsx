"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Wand2,
  Copy,
  Trash2,
  Zap,
  Loader2,
  ChevronRight,
  PenLine,
} from "lucide-react";
import type { TimetableVersion } from "@/types/timetable";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Props {
  versions: TimetableVersion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewDraft: () => Promise<void>;
  onNewDraftAuto: () => void;
  onCloneActive: () => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, label: string) => Promise<void>;
  hasActive: boolean;
  loading?: boolean;
}

function statusBadge(status: string) {
  if (status === "active")
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">active</Badge>;
  if (status === "draft")
    return <Badge variant="outline" className="text-muted-foreground">draft</Badge>;
  return <Badge variant="secondary">archived</Badge>;
}

export function VersionSidebar({
  versions,
  selectedId,
  onSelect,
  onNewDraft,
  onNewDraftAuto,
  onCloneActive,
  onActivate,
  onDelete,
  onRename,
  hasActive,
  loading,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const startRename = (v: TimetableVersion) => {
    setRenaming(v.id);
    setRenameValue(v.label ?? "");
  };

  const commitRename = async (id: string) => {
    const v = versions.find((x) => x.id === id);
    const emptyFallback = v?.status === "active" ? "Timetable" : "Draft";
    await run(`rename-${id}`, () => onRename(id, renameValue.trim() || emptyFallback));
    setRenaming(null);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Versions
        </span>
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>

      {/* Action row */}
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => run("new", onNewDraft)}
          disabled={busy === "new"}
        >
          {busy === "new" ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          New draft
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={onNewDraftAuto}
        >
          <Wand2 className="size-3.5" />
          Auto-generate
        </Button>
        {hasActive && (
          <Button
            size="sm"
            variant="outline"
            className="col-span-2 gap-1.5 text-xs"
            onClick={() => run("clone", onCloneActive)}
            disabled={busy === "clone"}
          >
            {busy === "clone" ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
            Clone active
          </Button>
        )}
      </div>

      {/* Version list */}
      <div className="flex flex-col gap-1 overflow-y-auto">
        {versions.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            No versions yet. Create a draft or use auto-generate.
          </p>
        )}
        {versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              "group rounded-lg border p-2 transition-colors",
              selectedId === v.id
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:bg-muted/30 cursor-pointer"
            )}
            onClick={() => onSelect(v.id)}
          >
            <div className="flex items-center justify-between gap-1">
              {renaming === v.id ? (
                <input
                  autoFocus
                  className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-xs"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(v.id);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate text-xs font-medium text-foreground">
                  {v.label || "Version"}
                </span>
              )}
              <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", selectedId === v.id && "rotate-90")} />
            </div>

            <div className="mt-1 flex items-center gap-1">
              {statusBadge(v.status)}
              {v.effective_from && (
                <span className="text-[10px] text-muted-foreground">from {v.effective_from.slice(0, 10)}</span>
              )}
            </div>

            {selectedId === v.id && (
              <div className="mt-2 flex flex-wrap gap-1">
                {v.status === "draft" && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmActivateId(v.id);
                    }}
                    disabled={busy === `activate-${v.id}`}
                  >
                    {busy === `activate-${v.id}` ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                    Activate
                  </button>
                )}
                {(v.status === "draft" || v.status === "active") && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                    onClick={(e) => { e.stopPropagation(); startRename(v); }}
                  >
                    <PenLine className="size-3" />
                    Rename
                  </button>
                )}
                {v.status === "draft" && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-destructive/30 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(v.id);
                    }}
                    disabled={busy === `delete-${v.id}`}
                  >
                    {busy === `delete-${v.id}` ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmActivateId}
        onOpenChange={(o) => !o && setConfirmActivateId(null)}
        title="Activate this timetable?"
        description="The current active version will be archived."
        confirmLabel="Activate"
        loading={!!confirmActivateId && busy === `activate-${confirmActivateId}`}
        onConfirm={async () => {
          const id = confirmActivateId;
          if (!id) return;
          await run(`activate-${id}`, () => onActivate(id));
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="Delete this draft permanently?"
        description="This removes the draft version and its entries. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={!!confirmDeleteId && busy === `delete-${confirmDeleteId}`}
        onConfirm={async () => {
          const id = confirmDeleteId;
          if (!id) return;
          await run(`delete-${id}`, () => onDelete(id));
        }}
      />
    </div>
  );
}
