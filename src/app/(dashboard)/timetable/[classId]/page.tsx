"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertTriangle, Info } from "lucide-react";
import { TimetableEditor } from "@/components/timetable/TimetableEditor";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { VersionSidebar } from "@/components/timetable/VersionSidebar";
import { EntryDialog } from "@/components/timetable/EntryDialog";
import { GenerateDialog } from "@/components/timetable/GenerateDialog";
import { timetableService } from "@/services/timetableService";
import { useClass } from "@/hooks/useClasses";
import {
  useTimetableVersions,
  useTimetableBundle,
  useClassSubjectsForTimetable,
  useSubjectTeachersForTimetable,
  useCreateTimetableVersion,
  usePatchTimetableVersion,
  useActivateTimetableVersion,
  useCloneTimetableVersion,
  useDeleteTimetableVersion,
  useCreateTimetableEntry,
  usePatchTimetableEntry,
  useDeleteTimetableEntry,
  useMoveTimetableEntry,
  useSwapTimetableEntries,
  useGenerateTimetable,
} from "@/hooks/useTimetable";
import type { TimetableEntry, BellSchedulePeriod } from "@/types/timetable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { timetableKeys } from "@/hooks/useTimetable";
import { toast } from "sonner";
import { apiGet } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function derivePeriodsFromEntries(entries: TimetableEntry[]): BellSchedulePeriod[] {
  const nums = [...new Set(entries.map((e) => e.period_number))].sort((a, b) => a - b);
  return nums.map((n) => ({
    id: `derived-${n}`,
    bell_schedule_id: "",
    period_number: n,
    period_kind: "lesson",
    starts_at: null,
    ends_at: null,
    label: `P${n}`,
    sort_order: n,
  }));
}

export default function ClassTimetablePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;
  const qc = useQueryClient();

  const { data: bellListData } = useQuery({
    queryKey: ["academics", "bell-schedules"],
    queryFn: () =>
      apiGet<{
        items: { id: string; name: string }[];
        tenant_default_bell_schedule_id?: string | null;
      }>("/api/academics/bell-schedules"),
  });
  const bellScheduleOptions = bellListData?.items ?? [];
  const tenantDefaultBellId = bellListData?.tenant_default_bell_schedule_id ?? null;

  const { data: cls } = useClass(classId);
  const { data: versions = [], isLoading: versionsLoading } = useTimetableVersions(classId);
  const { data: subjects = [] } = useClassSubjectsForTimetable(classId);
  const { data: subjectTeachers = [] } = useSubjectTeachersForTimetable(classId);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Auto-select: prefer first draft, fallback to active
  useEffect(() => {
    if (!versions.length) { setSelectedVersionId(null); return; }
    setSelectedVersionId((prev) => {
      if (prev && versions.some((v) => v.id === prev)) return prev;
      const draft = versions.find((v) => v.status === "draft");
      const active = versions.find((v) => v.status === "active");
      return (draft ?? active ?? versions[0]).id;
    });
  }, [versions]);

  const { data: bundle, isLoading: bundleLoading } = useTimetableBundle(classId, selectedVersionId);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? null,
    [versions, selectedVersionId]
  );
  const isEditable = bundle?.editable ?? selectedVersion?.status === "draft";
  const hasActive = versions.some((v) => v.status === "active");

  const lessonPeriods = useMemo(() => {
    if (bundle?.bell_schedule?.lesson_periods?.length)
      return bundle.bell_schedule.lesson_periods;
    if (bundle?.items?.length) return derivePeriodsFromEntries(bundle.items);
    return [];
  }, [bundle]);

  const workingDays = useMemo(
    () => bundle?.working_days?.length ? bundle.working_days : [1, 2, 3, 4, 5, 6],
    [bundle]
  );

  const conflictCount = useMemo(
    () => (bundle?.items ?? []).filter((e) => (e.conflict_flags?.length ?? 0) > 0).length,
    [bundle]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createVersion = useCreateTimetableVersion(classId);
  const patchVersion = usePatchTimetableVersion(classId);
  const activateVersion = useActivateTimetableVersion(classId);
  const cloneVersion = useCloneTimetableVersion(classId);
  const deleteVersion = useDeleteTimetableVersion(classId);
  const createEntry = useCreateTimetableEntry(classId, selectedVersionId);
  const patchEntry = usePatchTimetableEntry(classId, selectedVersionId);
  const deleteEntry = useDeleteTimetableEntry(classId, selectedVersionId);
  const moveEntry = useMoveTimetableEntry(classId, selectedVersionId);
  const swapEntries = useSwapTimetableEntries(classId, selectedVersionId);
  const generateTimetable = useGenerateTimetable(classId);

  // ── Entry dialog state ────────────────────────────────────────────────────

  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    day: number;
    period: number;
    editing: TimetableEntry | null;
  }>({ open: false, day: 1, period: 1, editing: null });

  const openAdd = useCallback((day: number, period: number) => {
    setEntryDialog({ open: true, day, period, editing: null });
  }, []);

  const openEdit = useCallback((entry: TimetableEntry) => {
    setEntryDialog({ open: true, day: entry.day_of_week, period: entry.period_number, editing: entry });
  }, []);

  // ── Generate dialog ───────────────────────────────────────────────────────

  const [generateDialog, setGenerateDialog] = useState<{
    open: boolean;
    forCurrentDraft: boolean;
  }>({ open: false, forCurrentDraft: false });

  const [newDraftBellOpen, setNewDraftBellOpen] = useState(false);
  const [newDraftBellId, setNewDraftBellId] = useState<string>("");

  const generateNeedsBellSelection = useMemo(() => {
    if (!generateDialog.open) return false;
    if (generateDialog.forCurrentDraft) {
      return !(selectedVersion?.bell_schedule_id || tenantDefaultBellId);
    }
    return !tenantDefaultBellId;
  }, [generateDialog.open, generateDialog.forCurrentDraft, selectedVersion?.bell_schedule_id, tenantDefaultBellId]);

  // ── Version sidebar actions ───────────────────────────────────────────────

  const handleNewDraft = async () => {
    if (tenantDefaultBellId) {
      try {
        const v = await createVersion.mutateAsync({
          label: "Draft",
          status: "draft",
          bell_schedule_id: tenantDefaultBellId,
        });
        setSelectedVersionId(v.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create draft");
      }
      return;
    }
    if (bellScheduleOptions.length === 0) {
      toast.error("Create a bell schedule under Academics → Bell schedules first.");
      return;
    }
    setNewDraftBellId(bellScheduleOptions[0]?.id ?? "");
    setNewDraftBellOpen(true);
  };

  const confirmNewDraftWithBell = async () => {
    if (!newDraftBellId) {
      toast.error("Select a bell schedule.");
      return;
    }
    try {
      const v = await createVersion.mutateAsync({
        label: "Draft",
        status: "draft",
        bell_schedule_id: newDraftBellId,
      });
      setSelectedVersionId(v.id);
      setNewDraftBellOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create draft");
    }
  };

  const handleCloneActive = async () => {
    try {
      const v = await cloneVersion.mutateAsync({ label: "Copy of active" });
      setSelectedVersionId(v.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clone timetable");
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateVersion.mutateAsync(id);
      setSelectedVersionId(id);
      toast.success("Timetable activated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate");
      throw e;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion.mutateAsync(id);
      const remaining = versions.filter((v) => v.id !== id);
      const next = remaining.find((v) => v.status === "draft") ?? remaining[0] ?? null;
      setSelectedVersionId(next?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete draft");
    }
  };

  const handleRename = async (id: string, label: string) => {
    try {
      await patchVersion.mutateAsync({ versionId: id, body: { label } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename");
    }
  };

  // ── Entry save / delete ───────────────────────────────────────────────────

  const handleEntrySave = async (body: Parameters<typeof timetableService.createEntry>[1]) => {
    if (entryDialog.editing) {
      await patchEntry.mutateAsync({
        entryId: entryDialog.editing.id,
        body: {
          class_subject_id: body.class_subject_id,
          teacher_id: body.teacher_id,
          day_of_week: body.day_of_week,
          period_number: body.period_number,
          room: body.room,
        },
      });
    } else {
      await createEntry.mutateAsync(body);
    }
    qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, selectedVersionId) });
  };

  const handleEntryDelete = async (entryId: string) => {
    await deleteEntry.mutateAsync(entryId);
    qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, selectedVersionId) });
  };

  // ── DnD handlers ─────────────────────────────────────────────────────────

  const handleMove = useCallback(async (entryId: string, day: number, period: number) => {
    try {
      await moveEntry.mutateAsync({ entryId, day, period });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move entry", {
        description: "The slot may already be occupied or the teacher has a conflict.",
      });
    }
  }, [moveEntry]);

  const handleSwap = useCallback(async (entryAId: string, entryBId: string) => {
    try {
      await swapEntries.mutateAsync({ entry_a_id: entryAId, entry_b_id: entryBId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not swap entries", {
        description: "Check for teacher conflicts at the target slots.",
      });
    }
  }, [swapEntries]);

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async (opts?: { bell_schedule_id?: string | null }) => {
    const forDraft = generateDialog.forCurrentDraft;
    const vid = forDraft ? selectedVersionId : undefined;
    const body: {
      timetable_version_id?: string;
      bell_schedule_id?: string | null;
    } = {};
    if (vid) body.timetable_version_id = vid;
    if (opts?.bell_schedule_id) body.bell_schedule_id = opts.bell_schedule_id;
    const result = await generateTimetable.mutateAsync(
      Object.keys(body).length ? body : undefined
    );
    setSelectedVersionId(result.timetable_version.id);
    qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, result.timetable_version.id) });
    return result;
  };

  const isBundleBusy =
    moveEntry.isPending ||
    swapEntries.isPending ||
    createEntry.isPending ||
    patchEntry.isPending ||
    deleteEntry.isPending;

  if (!classId) return null;

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/timetable">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {cls ? `${cls.name} – ${cls.section}` : "Class Timetable"}
            </h1>
            {cls?.academic_year && (
              <p className="text-xs text-muted-foreground">{cls.academic_year}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-10 sm:pl-0">
          {conflictCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5" />
              {conflictCount} conflict{conflictCount > 1 ? "s" : ""}
            </div>
          )}
          {selectedVersion && (
            <div className="flex items-center gap-2">
              {selectedVersion.status === "active" ? (
                <Badge className="bg-green-50 text-green-700 hover:bg-green-50">active</Badge>
              ) : selectedVersion.status === "draft" ? (
                <Badge variant="outline" className="text-muted-foreground">draft</Badge>
              ) : (
                <Badge variant="secondary">archived</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {selectedVersion.label || "Version"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body: sidebar + editor */}
      <div className="flex flex-1 gap-0 overflow-hidden pt-4">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border pr-4 lg:flex">
          <VersionSidebar
            versions={versions}
            selectedId={selectedVersionId}
            onSelect={setSelectedVersionId}
            onNewDraft={handleNewDraft}
            onNewDraftAuto={() => setGenerateDialog({ open: true, forCurrentDraft: false })}
            onCloneActive={handleCloneActive}
            onActivate={handleActivate}
            onDelete={handleDelete}
            onRename={handleRename}
            hasActive={hasActive}
            loading={versionsLoading}
          />
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col gap-4 overflow-auto lg:pl-6">
          {/* Mobile version selector */}
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVersionId(v.id)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedVersionId === v.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {v.label || "Version"}
                {v.status === "draft" && " (draft)"}
                {v.status === "active" && " ✓"}
              </button>
            ))}
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setGenerateDialog({ open: true, forCurrentDraft: false })}>
              Auto-generate
            </Button>
          </div>

          {/* Content area */}
          {bundleLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedVersion ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <p className="text-sm">No timetable version yet.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleNewDraft}>New draft</Button>
                <Button size="sm" onClick={() => setGenerateDialog({ open: true, forCurrentDraft: false })}>Auto-generate</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Read-only banner */}
              {!isEditable && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="size-3.5 shrink-0" />
                  {selectedVersion.status === "active"
                    ? "This is the active timetable. Clone it or create a new draft to make changes."
                    : "Archived — read only. Clone or create a new draft to edit."}
                </div>
              )}

              {/* Actions for draft */}
              {isEditable && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      setGenerateDialog({ open: true, forCurrentDraft: true })
                    }
                  >
                    Fill from subjects
                  </Button>
                </div>
              )}

              {/* Conflict summary */}
              {conflictCount > 0 && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="size-4" />
                    {conflictCount} conflict{conflictCount > 1 ? "s" : ""} detected
                  </div>
                  <p className="mt-1 text-xs text-destructive/80">
                    Cells with a warning icon indicate teacher double-booking or other scheduling conflicts. Resolve by moving or swapping affected slots.
                  </p>
                  <div className="mt-2 space-y-1">
                    {(bundle?.items ?? [])
                      .filter((e) => (e.conflict_flags?.length ?? 0) > 0)
                      .map((e) => (
                        <div key={e.id} className="text-xs text-destructive/80">
                          <span className="font-medium">{e.subject_name}</span>
                          {" · "}
                          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][e.day_of_week - 1]} P{e.period_number}
                          {" · "}
                          {e.conflict_flags?.join(", ")}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Grid: editable (DnD) or read-only */}
              {isEditable ? (
                <TimetableEditor
                  entries={bundle?.items ?? []}
                  periods={lessonPeriods}
                  workingDays={workingDays}
                  onMove={handleMove}
                  onSwap={handleSwap}
                  onAdd={openAdd}
                  onEdit={openEdit}
                  busy={isBundleBusy}
                />
              ) : (
                <TimetableGrid
                  entries={bundle?.items ?? []}
                  periods={lessonPeriods}
                  workingDays={workingDays}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Entry dialog */}
      {selectedVersionId && (
        <EntryDialog
          open={entryDialog.open}
          onOpenChange={(v) => setEntryDialog((p) => ({ ...p, open: v }))}
          classId={classId}
          versionId={selectedVersionId}
          day={entryDialog.day}
          period={entryDialog.period}
          editing={entryDialog.editing}
          subjects={subjects}
          subjectTeachers={subjectTeachers}
          workingDays={workingDays}
          onSave={handleEntrySave}
          onDelete={handleEntryDelete}
        />
      )}

      {/* Generate dialog */}
      <GenerateDialog
        open={generateDialog.open}
        onOpenChange={(v) => setGenerateDialog((p) => ({ ...p, open: v }))}
        versionId={generateDialog.forCurrentDraft ? selectedVersionId : undefined}
        versionLabel={selectedVersion?.label}
        needsBellSelection={generateNeedsBellSelection}
        bellSchedules={bellScheduleOptions}
        tenantDefaultBellScheduleId={tenantDefaultBellId}
        onGenerate={handleGenerate}
      />

      <Dialog open={newDraftBellOpen} onOpenChange={setNewDraftBellOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New draft</DialogTitle>
            <DialogDescription className="text-xs">
              No school-wide default bell schedule is set. Choose which bell schedule defines period times for this class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-medium">Bell schedule</Label>
            <Select value={newDraftBellId} onValueChange={setNewDraftBellId}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {bellScheduleOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDraftBellOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmNewDraftWithBell} disabled={!newDraftBellId || createVersion.isPending}>
              {createVersion.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
