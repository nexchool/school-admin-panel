"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { GenerateTimetableResult } from "@/types/timetable";

interface BellOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** If provided, generates into an existing draft. Otherwise creates a new draft. */
  versionId?: string | null;
  versionLabel?: string | null;
  /** When true, user must pick a bell schedule (no school default and no bell on the draft yet). */
  needsBellSelection: boolean;
  bellSchedules: BellOption[];
  /** School default from academic settings — used to preselect when present. */
  tenantDefaultBellScheduleId: string | null;
  onGenerate: (opts?: { bell_schedule_id?: string | null }) => Promise<GenerateTimetableResult>;
}

type Phase = "confirm" | "result";

export function GenerateDialog({
  open,
  onOpenChange,
  versionId,
  versionLabel,
  needsBellSelection,
  bellSchedules,
  tenantDefaultBellScheduleId,
  onGenerate,
}: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [result, setResult] = useState<GenerateTimetableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickedBellId, setPickedBellId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setPhase("confirm");
    setResult(null);
    setError(null);
    setBusy(false);
    const pre =
      tenantDefaultBellScheduleId ||
      bellSchedules[0]?.id ||
      "";
    setPickedBellId(pre);
  }, [open, tenantDefaultBellScheduleId, bellSchedules]);

  const handleClose = () => {
    if (busy) return;
    onOpenChange(false);
    setPhase("confirm");
    setResult(null);
    setError(null);
  };

  const handleDialogOpenChange = (v: boolean) => {
    if (v) return;
    handleClose();
  };

  const handleGenerate = async () => {
    if (needsBellSelection && !pickedBellId) {
      setError("Select a bell schedule to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await onGenerate(
        needsBellSelection && pickedBellId ? { bell_schedule_id: pickedBellId } : undefined
      );
      setResult(r);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const placementOk = result && result.entries_placed === result.total_required;
  const generateDisabled =
    busy || (needsBellSelection && (!pickedBellId || bellSchedules.length === 0));

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            {versionId ? "Fill draft from subjects" : "Generate new draft"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {versionId
              ? `Fills "${versionLabel ?? "draft"}" using each subject's weekly periods, assigned teachers, and the bell schedule. Existing entries will be replaced.`
              : "Creates a brand-new draft by distributing subjects across available periods."}
          </DialogDescription>
        </DialogHeader>

        {phase === "confirm" && (
          <>
            {needsBellSelection && bellSchedules.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Bell schedule</Label>
                <p className="text-xs text-muted-foreground">
                  No school default is set. Choose which bell schedule defines period times for this run.
                </p>
                <Select value={pickedBellId} onValueChange={setPickedBellId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bell schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {bellSchedules.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {needsBellSelection && bellSchedules.length === 0 && (
              <p className="text-xs text-destructive">
                Create a bell schedule under Academics first, then try again.
              </p>
            )}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generateDisabled}>
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 size-4" />
                )}
                Generate
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "result" && result && (
          <>
            <div className="space-y-3">
              <div className={`flex items-center gap-2 rounded-md border p-3 ${placementOk ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {placementOk ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0" />
                )}
                <div className="text-xs">
                  <p className="font-medium">
                    {result.entries_placed} / {result.total_required} periods placed
                  </p>
                  {(result.unplaced_periods ?? 0) > 0 && (
                    <p>{result.unplaced_periods} periods could not be placed.</p>
                  )}
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1.5 text-xs font-medium text-amber-700">Warnings</p>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-600">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
