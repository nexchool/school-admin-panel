"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGrades } from "@/hooks/useGrades";
import { useProgrammes } from "@/hooks/useProgrammes";
import { schoolSetupKeys } from "@/hooks/useSchoolSetup";
import { useSubjects } from "@/hooks/useSubjects";
import {
  useApplySubjectContexts,
  useBulkUpsertSubjectContexts,
  useSubjectContexts,
} from "@/hooks/useSubjectContexts";
import { ApiException } from "@/services/api";
import type { SubjectContextUpsertInput } from "@/services/subjectContextsService";

const DEFAULT_PERIODS = 5;
const MIN_PERIODS = 1;
const MAX_PERIODS = 40;

export function SubjectsSetup() {
  const qc = useQueryClient();
  const { data: programmes = [] } = useProgrammes();
  const { data: grades = [] } = useGrades();
  const { data: subjects = [] } = useSubjects();

  const sortedGrades = useMemo(
    () => [...grades].sort((a, b) => a.sequence - b.sequence),
    [grades],
  );

  const [programmeId, setProgrammeId] = useState("");
  const [gradeId, setGradeId] = useState("");

  const enabled = !!programmeId && !!gradeId;
  const { data: serverContexts = [] } = useSubjectContexts(
    programmeId,
    gradeId,
    enabled,
  );

  const upsertMut = useBulkUpsertSubjectContexts();
  const applyMut = useApplySubjectContexts();

  // selected[subject_id] = weekly_periods. Hydrate from server when user
  // picks a (programme, grade) — they see what's already configured.
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const currentKey = enabled ? `${programmeId}/${gradeId}` : null;
  if (currentKey && currentKey !== hydratedKey) {
    const next: Record<string, number> = {};
    for (const c of serverContexts) {
      next[c.subject_id] = c.default_weekly_periods ?? DEFAULT_PERIODS;
    }
    setSelected(next);
    setHydratedKey(currentKey);
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: DEFAULT_PERIODS };
    });
  };

  const setPeriods = (id: string, raw: string) => {
    const n = parseInt(raw, 10);
    setSelected((prev) => ({
      ...prev,
      [id]: Number.isNaN(n)
        ? DEFAULT_PERIODS
        : Math.max(MIN_PERIODS, Math.min(MAX_PERIODS, n)),
    }));
  };

  const onSave = async () => {
    if (!enabled) return;
    if (Object.keys(selected).length === 0) {
      toast.error("Pick at least one subject.");
      return;
    }

    const contexts: SubjectContextUpsertInput[] = Object.entries(selected).map(
      ([subject_id, periods], idx) => ({
        subject_id,
        type: "mandatory",
        default_weekly_periods: periods,
        sort_order: idx,
        is_active: true,
      }),
    );

    try {
      await upsertMut.mutateAsync({
        programme_id: programmeId,
        grade_id: gradeId,
        contexts,
        delete_missing: true,
      });
      const result = await applyMut.mutateAsync({
        programme_id: programmeId,
        grade_id: gradeId,
      });
      toast.success(
        result.classes_matched === 0
          ? "Saved. No matching classes yet — they'll be picked up after class creation."
          : `Saved · ${result.created_count} new link(s) across ${result.classes_matched} class(es).`,
      );
      void qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
    } catch (e) {
      toast.error(
        e instanceof ApiException
          ? e.message
          : e instanceof Error
            ? e.message
            : "Save failed.",
      );
    }
  };

  const isPending = upsertMut.isPending || applyMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href="/school-setup">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to setup
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign subjects</CardTitle>
          <CardDescription>
            Pick a programme and grade, choose the subjects taught at that
            level, then save. We&rsquo;ll link them to all matching classes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Programme</Label>
            <Select value={programmeId} onValueChange={setProgrammeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select programme" />
              </SelectTrigger>
              <SelectContent>
                {programmes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {sortedGrades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!enabled ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pick a programme and grade above to assign subjects.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Subjects · {programmes.find((p) => p.id === programmeId)?.name} ·{" "}
              {sortedGrades.find((g) => g.id === gradeId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No subjects in your catalogue. Add them at{" "}
                <Link
                  href="/academics/subjects"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Subjects
                </Link>{" "}
                first.
              </p>
            ) : (
              <ul className="max-h-[26rem] divide-y overflow-y-auto rounded-md border">
                {subjects.map((s) => {
                  const checked = selected[s.id] !== undefined;
                  const periods = selected[s.id] ?? DEFAULT_PERIODS;
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 px-3 py-2 hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        id={`subj-${s.id}`}
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <label
                        htmlFor={`subj-${s.id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {s.name}
                        {s.code ? (
                          <span className="ml-1 text-muted-foreground">
                            ({s.code})
                          </span>
                        ) : null}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={MIN_PERIODS}
                          max={MAX_PERIODS}
                          value={periods}
                          onChange={(e) => setPeriods(s.id, e.target.value)}
                          disabled={!checked}
                          className="h-8 w-16 text-center"
                          aria-label={`${s.name} weekly periods`}
                        />
                        <span className="text-xs text-muted-foreground">
                          /wk
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={onSave}
                disabled={isPending || Object.keys(selected).length === 0}
                className="gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Save & assign to classes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
