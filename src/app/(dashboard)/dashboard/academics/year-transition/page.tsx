"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks";
import { academicYearsService } from "@/services/academicYearsService";
import { academicYearsKeys } from "@/hooks/useAcademicYears";
import { classesService } from "@/services/classesService";
import {
  yearTransitionService,
  type PromotionPreviewResult,
  type PromotionPreviewSummary,
  type CopyTimetableResult,
  type FinanceRolloverResult,
  type TransportRolloverResult,
  type CopyHolidaysResult,
  type TeacherGapsResult,
} from "@/services/yearTransitionService";
import type { ClassItem } from "@/types/class";
import { ApiException } from "@/services/api";
import { YearTransitionStepper } from "@/components/academics/year-transition/YearTransitionStepper";
import { MappingTable } from "@/components/academics/year-transition/MappingTable";
import {
  autoMapClassesBetweenYears,
  type MappingSelectionValue,
  selectionToApiValue,
} from "@/components/academics/year-transition/mappingUtils";
import { SummaryCards } from "@/components/academics/year-transition/SummaryCards";
import { ConfirmDialog } from "@/components/academics/year-transition/ConfirmDialog";
import { RolloverPanel } from "@/components/academics/year-transition/RolloverPanel";
import { TransitionComplete } from "@/components/academics/year-transition/TransitionComplete";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  History,
  Loader2,
  Play,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPreviewApiError(e: unknown): string {
  if (e instanceof ApiException) {
    let msg = e.message || "Preview request failed.";
    const data = e.data;
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      const details = d.details;
      if (details !== undefined && details !== null) {
        const extra =
          typeof details === "string" ? details : JSON.stringify(details);
        if (extra && extra !== "{}") msg = `${msg} ${extra}`;
      }
    }
    return msg;
  }
  return e instanceof Error ? e.message : "Preview request failed.";
}

function buildApiClassMapping(
  fromClasses: ClassItem[],
  selections: Record<string, MappingSelectionValue | null>,
  copyMap: Record<string, string> | null,
  nextClasses: ClassItem[]
): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const c of fromClasses) {
    const sel = selections[c.id];
    const v = selectionToApiValue(sel ?? null, c, copyMap, nextClasses);
    if (!v) return null;
    out[c.id] = v;
  }
  return out;
}

/** Match old → new class by (name, section) when classes already exist on the
 *  target year, so admins can resume without re-running copy. */
function buildResumeCopyMap(
  fromClasses: ClassItem[],
  nextClasses: ClassItem[]
): Record<string, string> {
  const byKey = new Map<string, string>();
  for (const n of nextClasses) {
    const key = `${(n.name ?? "").trim().toLowerCase()}|${(n.section ?? "")
      .trim()
      .toLowerCase()}`;
    byKey.set(key, n.id);
  }
  const out: Record<string, string> = {};
  for (const c of fromClasses) {
    const key = `${(c.name ?? "").trim().toLowerCase()}|${(c.section ?? "")
      .trim()
      .toLowerCase()}`;
    const target = byKey.get(key);
    if (target && target !== c.id) out[c.id] = target;
  }
  return out;
}

// ── Wizard-state persistence (localStorage, scoped per from/to pair) ──────────

const WIZ_STORAGE_PREFIX = "school-erp:year-transition:v1";

type RolloverState<T = unknown> = {
  loading: boolean;
  done: boolean;
  summary: string | null;
  error: string | null;
  data: T | null;
};

const emptyRollover: RolloverState = {
  loading: false,
  done: false,
  summary: null,
  error: null,
  data: null,
};

interface PersistedWizard {
  step: number;
  copyMap: Record<string, string> | null;
  selections: Record<string, MappingSelectionValue | null>;
  promotionBatchId: string | null;
  promotionSummary: Record<string, unknown> | null;
  rollover: {
    timetable: { done: boolean; summary: string | null };
    finance: { done: boolean; summary: string | null };
    transport: { done: boolean; summary: string | null };
    holidays: { done: boolean; summary: string | null };
  };
  yearActivated: boolean;
}

function persistKey(fromYearId: string, toYearId: string) {
  return `${WIZ_STORAGE_PREFIX}:${fromYearId}->${toYearId}`;
}

function loadPersistedWizard(
  fromYearId: string,
  toYearId: string
): PersistedWizard | null {
  if (typeof window === "undefined" || !fromYearId || !toYearId) return null;
  try {
    const raw = window.localStorage.getItem(persistKey(fromYearId, toYearId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedWizard;
  } catch {
    return null;
  }
}

function persistWizard(
  fromYearId: string,
  toYearId: string,
  state: PersistedWizard
) {
  if (typeof window === "undefined" || !fromYearId || !toYearId) return;
  try {
    window.localStorage.setItem(
      persistKey(fromYearId, toYearId),
      JSON.stringify(state)
    );
  } catch {
    /* ignore quota errors */
  }
}

function clearPersistedWizard(fromYearId: string, toYearId: string) {
  if (typeof window === "undefined" || !fromYearId || !toYearId) return;
  try {
    window.localStorage.removeItem(persistKey(fromYearId, toYearId));
  } catch {
    /* ignore */
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function YearTransitionPage() {
  const { hasPermission } = useAuth();
  const canPromote = hasPermission("student.update");
  const canCopy = hasPermission("class.create");
  const canRunRollovers = hasPermission("academics.manage");
  const canActivateYear = hasPermission("academics.manage") || hasPermission("class.manage");
  const canAccess = canPromote;

  const [step, setStep] = useState(0);
  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [copyMap, setCopyMap] = useState<Record<string, string> | null>(null);
  const [selections, setSelections] = useState<
    Record<string, MappingSelectionValue | null>
  >({});
  const [preview, setPreview] = useState<PromotionPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyLoadingMessage, setCopyLoadingMessage] = useState<string | null>(
    null
  );
  const [autoMappedViaCopy, setAutoMappedViaCopy] = useState(false);
  const [resumeDetected, setResumeDetected] = useState(false);
  const qc = useQueryClient();
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [promotionFilters, setPromotionFilters] = useState({
    exclude_leaving: false,
    include_failed: true,
  });

  // Promotion result kept for the completion screen.
  const [promotionBatchId, setPromotionBatchId] = useState<string | null>(null);
  const [promotionSummary, setPromotionSummary] = useState<
    Record<string, unknown> | null
  >(null);

  // Rollover state — one per kind.
  const [timetableRollover, setTimetableRollover] = useState<
    RolloverState<CopyTimetableResult>
  >(emptyRollover as RolloverState<CopyTimetableResult>);
  const [financeRollover, setFinanceRollover] = useState<
    RolloverState<FinanceRolloverResult>
  >(emptyRollover as RolloverState<FinanceRolloverResult>);
  const [transportRollover, setTransportRollover] = useState<
    RolloverState<TransportRolloverResult>
  >(emptyRollover as RolloverState<TransportRolloverResult>);
  const [holidaysRollover, setHolidaysRollover] = useState<
    RolloverState<CopyHolidaysResult>
  >(emptyRollover as RolloverState<CopyHolidaysResult>);

  // Activate / completion state.
  const [yearActivated, setYearActivated] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [teacherGaps, setTeacherGaps] = useState<TeacherGapsResult | null>(
    null
  );
  const [teacherGapsLoading, setTeacherGapsLoading] = useState(false);

  const { data: years = [], isLoading: yearsLoading } = useQuery({
    queryKey: academicYearsKeys.list(false),
    queryFn: () => academicYearsService.getAcademicYears(false),
  });

  const { data: fromClasses = [], isLoading: fromClassesLoading } = useQuery({
    queryKey: ["classes", fromYearId],
    queryFn: () => classesService.getClasses({ academic_year_id: fromYearId }),
    enabled: !!fromYearId,
  });

  const { data: nextClasses = [], isLoading: nextClassesLoading } = useQuery({
    queryKey: ["classes", toYearId],
    queryFn: () => classesService.getClasses({ academic_year_id: toYearId }),
    enabled: !!toYearId,
  });

  const { data: settings } = useQuery({
    queryKey: ["academics", "settings"],
    queryFn: () => yearTransitionService.getAcademicSettings(),
  });

  const fromYearName =
    years.find((y) => y.id === fromYearId)?.name ?? "Current year";
  const toYearName = years.find((y) => y.id === toYearId)?.name ?? "Next year";

  const apiMap = useMemo(
    () => buildApiClassMapping(fromClasses, selections, copyMap, nextClasses),
    [fromClasses, selections, copyMap, nextClasses]
  );

  const mappingComplete = apiMap !== null;
  const summary: PromotionPreviewSummary | null = preview?.summary ?? null;
  const previewHasBlockingIssues =
    (summary?.unmapped ?? 0) > 0 ||
    (summary?.blocked_double_promotion ?? 0) > 0;

  const invalidatePreview = useCallback(() => {
    setPreview(null);
    setPreviewError(null);
  }, []);

  // Detect a resumable transition: target-year already has classes that match
  // source-year by (name, section). Auto-build copyMap + repeat selections.
  useEffect(() => {
    if (!fromYearId || !toYearId) return;
    if (fromClassesLoading || nextClassesLoading) return;
    if (copyMap) return; // already running through wizard
    if (fromClasses.length === 0 || nextClasses.length === 0) return;
    const detected = buildResumeCopyMap(fromClasses, nextClasses);
    if (Object.keys(detected).length === 0) return;
    setCopyMap(detected);
    setSelections((prev) => {
      const next = { ...prev };
      for (const fromId of Object.keys(detected)) {
        if (!next[fromId]) next[fromId] = { kind: "repeat" };
      }
      return next;
    });
    setResumeDetected(true);
  }, [
    fromYearId,
    toYearId,
    fromClasses,
    nextClasses,
    fromClassesLoading,
    nextClassesLoading,
    copyMap,
  ]);

  // Restore persisted state when from/to pair is settled.
  useEffect(() => {
    if (!fromYearId || !toYearId) return;
    const persisted = loadPersistedWizard(fromYearId, toYearId);
    if (!persisted) return;
    setStep(persisted.step ?? 0);
    if (persisted.copyMap) setCopyMap(persisted.copyMap);
    if (persisted.selections) setSelections(persisted.selections);
    if (persisted.promotionBatchId)
      setPromotionBatchId(persisted.promotionBatchId);
    if (persisted.promotionSummary)
      setPromotionSummary(persisted.promotionSummary);
    if (persisted.yearActivated) setYearActivated(true);
    if (persisted.rollover) {
      const lift = (
        slot: { done: boolean; summary: string | null },
        prev: RolloverState
      ): RolloverState => ({ ...prev, done: !!slot.done, summary: slot.summary });
      setTimetableRollover((prev) =>
        lift(persisted.rollover.timetable, prev) as RolloverState<CopyTimetableResult>
      );
      setFinanceRollover((prev) =>
        lift(persisted.rollover.finance, prev) as RolloverState<FinanceRolloverResult>
      );
      setTransportRollover((prev) =>
        lift(persisted.rollover.transport, prev) as RolloverState<TransportRolloverResult>
      );
      setHolidaysRollover((prev) =>
        lift(persisted.rollover.holidays, prev) as RolloverState<CopyHolidaysResult>
      );
    }
    // Only consume the persisted record once when the from/to pair settles.
  }, [fromYearId, toYearId]);

  // Persist whenever wizard state changes.
  useEffect(() => {
    if (!fromYearId || !toYearId) return;
    persistWizard(fromYearId, toYearId, {
      step,
      copyMap,
      selections,
      promotionBatchId,
      promotionSummary,
      yearActivated,
      rollover: {
        timetable: {
          done: timetableRollover.done,
          summary: timetableRollover.summary,
        },
        finance: {
          done: financeRollover.done,
          summary: financeRollover.summary,
        },
        transport: {
          done: transportRollover.done,
          summary: transportRollover.summary,
        },
        holidays: {
          done: holidaysRollover.done,
          summary: holidaysRollover.summary,
        },
      },
    });
  }, [
    fromYearId,
    toYearId,
    step,
    copyMap,
    selections,
    promotionBatchId,
    promotionSummary,
    yearActivated,
    timetableRollover.done,
    timetableRollover.summary,
    financeRollover.done,
    financeRollover.summary,
    transportRollover.done,
    transportRollover.summary,
    holidaysRollover.done,
    holidaysRollover.summary,
  ]);

  // Sync 'yearActivated' flag with server settings when settings load.
  useEffect(() => {
    if (!settings || !toYearId) return;
    if (settings.current_academic_year_id === toYearId) {
      setYearActivated(true);
    }
  }, [settings, toYearId]);

  const setSelection = useCallback(
    (fromClassId: string, sel: MappingSelectionValue | null) => {
      setSelections((s) => ({ ...s, [fromClassId]: sel }));
      invalidatePreview();
    },
    [invalidatePreview]
  );

  const handleAutoMap = useCallback(() => {
    const { mapping, unmappedClassIds } = autoMapClassesBetweenYears(
      fromClasses,
      nextClasses
    );
    setSelections((prev) => {
      const merged = { ...prev };
      for (const [fromId, to] of Object.entries(mapping)) {
        merged[fromId] =
          to === "GRADUATED"
            ? { kind: "graduated" }
            : { kind: "class", classId: to };
      }
      return merged;
    });
    setAutoMappedViaCopy(false);
    invalidatePreview();
    const mapped = Object.keys(mapping).length;
    toast.message(
      `Auto-map: ${mapped} class(es) mapped${
        unmappedClassIds.length
          ? `, ${unmappedClassIds.length} need manual mapping`
          : ""
      }.`
    );
  }, [fromClasses, nextClasses, invalidatePreview]);

  const resetWizardState = useCallback(() => {
    if (fromYearId && toYearId) clearPersistedWizard(fromYearId, toYearId);
    setStep(0);
    setFromYearId("");
    setToYearId("");
    setCopyMap(null);
    setSelections({});
    setPreview(null);
    setPreviewError(null);
    setAutoMappedViaCopy(false);
    setResumeDetected(false);
    setPromotionBatchId(null);
    setPromotionSummary(null);
    setTimetableRollover(emptyRollover as RolloverState<CopyTimetableResult>);
    setFinanceRollover(emptyRollover as RolloverState<FinanceRolloverResult>);
    setTransportRollover(emptyRollover as RolloverState<TransportRolloverResult>);
    setHolidaysRollover(emptyRollover as RolloverState<CopyHolidaysResult>);
    setYearActivated(false);
    setTeacherGaps(null);
  }, [fromYearId, toYearId]);

  const onSelectFromYear = (v: string) => {
    setFromYearId(v);
    setCopyMap(null);
    setSelections({});
    setAutoMappedViaCopy(false);
    setResumeDetected(false);
    invalidatePreview();
  };

  const onSelectToYear = (v: string) => {
    setToYearId(v);
    setCopyMap(null);
    setSelections({});
    setAutoMappedViaCopy(false);
    setResumeDetected(false);
    invalidatePreview();
  };

  const handleCopyClasses = async () => {
    if (!fromYearId || !toYearId || fromYearId === toYearId) {
      toast.error("Select two different academic years.");
      return;
    }
    setCopyLoading(true);
    setCopyLoadingMessage("Copying classes...");
    try {
      const res = await yearTransitionService.copyClasses(fromYearId, toYearId);
      const newCopyMap = res.class_mapping ?? {};
      setCopyMap(newCopyMap);
      toast.success(
        `Copied classes: ${res.created} new, ${res.reused_existing} already existed.`
      );

      if (Object.keys(newCopyMap).length === 0) {
        return;
      }

      setCopyLoadingMessage("Copying academic structure...");
      try {
        await yearTransitionService.copyAcademicStructure(newCopyMap);
        toast.success("Subjects and teacher assignments copied");

        const repeatSelections: Record<string, MappingSelectionValue | null> =
          {};
        for (const c of fromClasses) {
          repeatSelections[c.id] = newCopyMap[c.id]
            ? { kind: "repeat" }
            : null;
        }
        setSelections(repeatSelections);
        setAutoMappedViaCopy(true);
        setResumeDetected(false);
        invalidatePreview();
        await qc.invalidateQueries({ queryKey: ["classes", toYearId] });
      } catch (e) {
        const msg =
          e instanceof ApiException
            ? e.message
            : "Could not copy academic structure.";
        toast.error(msg);
      }
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : "Could not copy classes.";
      toast.error(msg);
    } finally {
      setCopyLoading(false);
      setCopyLoadingMessage(null);
    }
  };

  const handlePreview = async () => {
    setPreviewError(null);

    const fy = fromYearId?.trim() ?? "";
    const ty = toYearId?.trim() ?? "";
    if (!fy || !ty) {
      toast.error("Select both the current and next academic year (step 1).");
      setPreviewError("Missing from_year_id or to_year_id.");
      return;
    }
    if (fy === ty) {
      toast.error("From and to years must be different.");
      return;
    }

    const classMapping = buildApiClassMapping(
      fromClasses,
      selections,
      copyMap,
      nextClasses
    );
    if (!classMapping) {
      toast.error(
        "Complete class mapping for every class (including repeat / graduate)."
      );
      setPreviewError(
        "class_mapping is incomplete: resolve every row in step 2, then run preview again."
      );
      return;
    }
    if (Object.keys(classMapping).length === 0) {
      toast.error(
        "Class mapping is empty. There are no from-year classes to map."
      );
      setPreviewError("class_mapping has no entries.");
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await yearTransitionService.previewPromotion(
        fy,
        ty,
        classMapping,
        {
          exclude_leaving: promotionFilters.exclude_leaving,
          include_failed: promotionFilters.include_failed,
        }
      );
      setPreview(res);
      setPreviewError(null);
      toast.success("Preview ready.");
    } catch (e) {
      const msg = formatPreviewApiError(e);
      toast.error(msg, { duration: 10_000 });
      setPreviewError(msg);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!fromYearId || !toYearId || !apiMap || previewHasBlockingIssues) return;
    setPromoteLoading(true);
    try {
      const res = await yearTransitionService.executePromotion(
        fromYearId,
        toYearId,
        apiMap,
        {
          exclude_leaving: promotionFilters.exclude_leaving,
          include_failed: promotionFilters.include_failed,
        }
      );
      toast.success(
        `Promotion completed. Batch ${res.promotion_batch_id?.slice(0, 8)}…`
      );
      setPromotionBatchId(res.promotion_batch_id);
      setPromotionSummary(res.summary);
      setConfirmOpen(false);
      setStep(4); // advance to rollovers
    } catch (e) {
      const msg = e instanceof ApiException ? e.message : "Promotion failed.";
      toast.error(msg);
    } finally {
      setPromoteLoading(false);
    }
  };

  // ── Rollover handlers (idempotent — server handles duplicate detection) ────

  const runTimetableRollover = useCallback(async () => {
    if (!apiMap) {
      toast.error("Class mapping is incomplete.");
      return;
    }
    setTimetableRollover((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await yearTransitionService.copyTimetable(apiMap);
      setTimetableRollover({
        loading: false,
        done: true,
        summary: `${res.versions_created} timetable(s) copied, ${res.entries_created} entries — ${res.skipped.classes_target_has_version} target class(es) already had a timetable.`,
        error: null,
        data: res,
      });
      toast.success("Timetables copied.");
    } catch (e) {
      const msg = e instanceof ApiException ? e.message : "Timetable rollover failed.";
      setTimetableRollover((s) => ({
        ...s,
        loading: false,
        error: msg,
      }));
      toast.error(msg);
    }
  }, [apiMap]);

  const runFinanceRollover = useCallback(async () => {
    if (!apiMap) {
      toast.error("Class mapping is incomplete.");
      return;
    }
    setFinanceRollover((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await yearTransitionService.rolloverFinance(
        fromYearId,
        toYearId,
        apiMap
      );
      setFinanceRollover({
        loading: false,
        done: true,
        summary:
          `${res.structures_created} new fee structure(s), ${res.structures_reused} reused, ` +
          `${res.class_links_created} class link(s) added` +
          (res.class_links_skipped_conflict
            ? `, ${res.class_links_skipped_conflict} skipped (class already in another structure)`
            : "") +
          ".",
        error: null,
        data: res,
      });
      toast.success("Fee structures copied.");
    } catch (e) {
      const msg = e instanceof ApiException ? e.message : "Finance rollover failed.";
      setFinanceRollover((s) => ({ ...s, loading: false, error: msg }));
      toast.error(msg);
    }
  }, [apiMap, fromYearId, toYearId]);

  const runTransportRollover = useCallback(async () => {
    setTransportRollover((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await yearTransitionService.rolloverTransport(
        fromYearId,
        toYearId
      );
      setTransportRollover({
        loading: false,
        done: true,
        summary: `${res.fee_plans_created} fee plan(s) created, ${res.enrollments_created} enrollment(s) carried over (${res.enrollments_skipped_graduated} skipped — graduated).`,
        error: null,
        data: res,
      });
      toast.success("Transport rollover complete.");
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : "Transport rollover failed.";
      setTransportRollover((s) => ({ ...s, loading: false, error: msg }));
      toast.error(msg);
    }
  }, [fromYearId, toYearId]);

  const runHolidaysRollover = useCallback(async () => {
    setHolidaysRollover((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await yearTransitionService.copyHolidays(
        fromYearId,
        toYearId
      );
      setHolidaysRollover({
        loading: false,
        done: true,
        summary: `${res.holidays_created} holiday(s) copied (${res.skipped_existing} skipped — already exist).`,
        error: null,
        data: res,
      });
      toast.success("Holidays copied.");
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : "Holiday rollover failed.";
      setHolidaysRollover((s) => ({ ...s, loading: false, error: msg }));
      toast.error(msg);
    }
  }, [fromYearId, toYearId]);

  const handleActivateYear = useCallback(async () => {
    if (!toYearId) return;
    setActivateLoading(true);
    try {
      await yearTransitionService.setActiveYear(toYearId);
      setYearActivated(true);
      toast.success(`${toYearName} is now the active year.`);
      qc.invalidateQueries({ queryKey: ["academics", "settings"] });
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : "Could not activate year.";
      toast.error(msg);
    } finally {
      setActivateLoading(false);
    }
  }, [toYearId, toYearName, qc]);

  // Pull teacher gaps when entering the completion step.
  useEffect(() => {
    if (step !== 5 || !toYearId) return;
    if (teacherGaps || teacherGapsLoading) return;
    setTeacherGapsLoading(true);
    yearTransitionService
      .getTeacherGaps(toYearId)
      .then((res) => setTeacherGaps(res))
      .catch(() => {
        // teacher-gap is informational; failure isn't blocking.
      })
      .finally(() => setTeacherGapsLoading(false));
  }, [step, toYearId, teacherGaps, teacherGapsLoading]);

  const step0Valid = !!fromYearId && !!toYearId && fromYearId !== toYearId;

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access denied</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          You need <code className="text-xs">student.update</code> to run year
          transition.
        </p>
        <Button asChild variant="outline">
          <Link href="/academics">Back to academics</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <Link href="/academics">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Academics
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Academic year transition
          </h1>
          <p className="text-sm text-muted-foreground">
            Copy classes, map promotions, preview, promote, then roll over the
            new year and activate it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/academics/year-transition/history">
              <History className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        </div>
      </div>

      <YearTransitionStepper activeStep={step} />

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Academic years</CardTitle>
            <CardDescription>
              Choose the year you are leaving and the next year. Create new
              years in{" "}
              <Link
                href="/academics/academic-years"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Academic years
              </Link>{" "}
              if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Current (from) year</Label>
                <Select
                  value={fromYearId || undefined}
                  onValueChange={onSelectFromYear}
                  disabled={yearsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next (to) year</Label>
                <Select
                  value={toYearId || undefined}
                  onValueChange={onSelectToYear}
                  disabled={yearsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {resumeDetected && copyMap && (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                Detected {Object.keys(copyMap).length} class match(es) already
                present in {toYearName}. We auto-mapped them as &quot;repeat
                year&quot; — you can adjust mappings in the next step.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyClasses}
                disabled={
                  !step0Valid || !canCopy || copyLoading || yearsLoading
                }
              >
                {copyLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copyLoading
                  ? copyLoadingMessage ?? "Copying classes..."
                  : "Copy classes"}
              </Button>
              {!canCopy && (
                <span className="text-xs text-muted-foreground">
                  Requires <code className="text-xs">class.create</code>
                </span>
              )}
              {copyMap && (
                <span className="text-xs text-muted-foreground">
                  Mapping loaded: {Object.keys(copyMap).length} class link(s)
                </span>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setStep(1)}
              disabled={!step0Valid}
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Class mapping</CardTitle>
            <CardDescription>
              From <strong>{fromYearName}</strong> →{" "}
              <strong>{toYearName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fromClassesLoading || nextClassesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading classes…
              </div>
            ) : fromClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes in the current year. Add classes or pick another
                year.
              </p>
            ) : (
              <>
                {autoMappedViaCopy && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                    Auto-mapped using copied classes
                  </div>
                )}
                <MappingTable
                  fromClasses={fromClasses}
                  nextClasses={nextClasses}
                  selections={selections}
                  onChange={setSelection}
                  copyMap={copyMap}
                  onAutoMap={handleAutoMap}
                />
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!mappingComplete || fromClasses.length === 0}
              >
                Continue to preview
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Preview</CardTitle>
            <CardDescription>
              Validate enrollment counts before promoting students.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium">Promotion filters</p>
              <p className="text-xs text-muted-foreground">
                Applied to preview and execute. Skipped students keep their
                current year enrollment unchanged.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={promotionFilters.exclude_leaving}
                  onChange={(e) => {
                    setPromotionFilters((f) => ({
                      ...f,
                      exclude_leaving: e.target.checked,
                    }));
                    invalidatePreview();
                  }}
                />
                Exclude <code className="text-xs">student_status</code> = leaving
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={promotionFilters.include_failed}
                  onChange={(e) => {
                    setPromotionFilters((f) => ({
                      ...f,
                      include_failed: e.target.checked,
                    }));
                    invalidatePreview();
                  }}
                />
                Include students with{" "}
                <code className="text-xs">academic_result</code> = fail (off =
                skip)
              </label>
            </div>
            <Button
              type="button"
              onClick={() => {
                void handlePreview();
              }}
              disabled={
                previewLoading ||
                !step0Valid ||
                !mappingComplete ||
                fromClasses.length === 0
              }
            >
              {previewLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run preview
            </Button>
            <SummaryCards summary={summary} />
            {previewError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {previewError}
              </div>
            ) : null}
            {preview && preview.unmapped_source_class_ids?.length ? (
              <p className="text-xs text-destructive">
                Unmapped sources:{" "}
                {preview.unmapped_source_class_ids.join(", ")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={!preview || previewHasBlockingIssues}
              >
                Continue to confirm
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {previewHasBlockingIssues && preview && summary && (
              <p className="text-sm text-destructive">
                Fix mapping issues before continuing (unmapped: {summary.unmapped},
                blocked: {summary.blocked_double_promotion}).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Promote students</CardTitle>
            <CardDescription>
              Promote students using the preview you just ran. Re-run preview if
              you changed mapping.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards summary={summary} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={
                  !preview ||
                  previewHasBlockingIssues ||
                  !canPromote ||
                  promoteLoading
                }
                onClick={() => setConfirmOpen(true)}
              >
                Open confirm…
              </Button>
              {promotionBatchId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(4)}
                >
                  Skip to rollovers
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Optional rollovers</CardTitle>
            <CardDescription>
              Carry forward year-scoped data into{" "}
              <strong>{toYearName}</strong>. Each rollover is idempotent — safe
              to re-run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canRunRollovers && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                You need <code className="text-xs">academics.manage</code> to
                run rollovers. You can still continue without running them.
              </div>
            )}
            <RolloverPanel
              title="Timetables"
              description="Clone active timetable versions and entries from each old class to its mapped new class. Creates draft versions on the new classes."
              required
              done={timetableRollover.done}
              loading={timetableRollover.loading}
              disabled={!apiMap || !canRunRollovers}
              onRun={runTimetableRollover}
              summary={timetableRollover.summary}
              error={timetableRollover.error}
            />
            <RolloverPanel
              title="Fee structures"
              description="Clone fee structures + components and remap class links. Does not auto-create student fees — generate those from Finance after review."
              required
              done={financeRollover.done}
              loading={financeRollover.loading}
              disabled={!apiMap || !canRunRollovers}
              onRun={runFinanceRollover}
              summary={financeRollover.summary}
              error={financeRollover.error}
            />
            <RolloverPanel
              title="Transport"
              description="Clone fee plans and carry forward active transport enrollments for promoted students only. Graduated students are skipped."
              done={transportRollover.done}
              loading={transportRollover.loading}
              disabled={!canRunRollovers}
              onRun={runTransportRollover}
              summary={transportRollover.summary}
              error={transportRollover.error}
            />
            <RolloverPanel
              title="Holidays"
              description="Copy holidays bound to the source year, shifting non-recurring dates by one year."
              done={holidaysRollover.done}
              loading={holidaysRollover.loading}
              disabled={!canRunRollovers}
              onRun={runHolidaysRollover}
              summary={holidaysRollover.summary}
              error={holidaysRollover.error}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
              >
                Back
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Continue to activation
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <TransitionComplete
          fromYearName={fromYearName}
          toYearName={toYearName}
          promotionBatchId={promotionBatchId}
          promotionSummary={promotionSummary}
          isYearActivated={yearActivated}
          rollovers={{
            timetable: timetableRollover.summary,
            finance: financeRollover.summary,
            transport: transportRollover.summary,
            holidays: holidaysRollover.summary,
          }}
          teacherGaps={teacherGaps}
          onActivateYear={handleActivateYear}
          activateLoading={activateLoading}
          canActivate={canActivateYear}
          onStartAnother={resetWizardState}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handlePromote}
        loading={promoteLoading}
        disabled={!preview || previewHasBlockingIssues || !apiMap}
        fromYearName={fromYearName}
        toYearName={toYearName}
        totalEnrollments={summary?.total_enrollments ?? 0}
      />
    </div>
  );
}
