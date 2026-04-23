"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, HelpCircle, Loader2 } from "lucide-react";
import { apiGet } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formatBuilderToPattern,
  getDefaultBuilderState,
  patternToBuilder,
  renderSampleId,
  validateBuilderPatternClient,
  type IdFormatBuilderState,
  type YearMode,
} from "@/utils/idFormat/patternFromBuilder";

const SEP_OPTIONS: { v: string; label: string }[] = [
  { v: "", label: "None" },
  { v: "-", label: "Hyphen (-)" },
  { v: "/", label: "Slash (/)" },
];

const DIGIT_OPTIONS = [2, 3, 4, 5, 6] as const;

export type IdFormatKind = "student" | "teacher";

export interface IdFormatBuilderProps {
  kind: IdFormatKind;
  pattern: string | null;
  onChange: (pattern: string | null) => void;
  onMarkDirty: () => void;
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          value ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export function IdFormatBuilder({ kind, pattern, onChange, onMarkDirty }: IdFormatBuilderProps) {
  const isStudent = kind === "student";
  const title = isStudent ? "Student admission number" : "Teacher employee ID";
  const [builder, setBuilder] = useState<IdFormatBuilderState>(() => getDefaultBuilderState(kind));
  const [advOpen, setAdvOpen] = useState(false);
  const [rawPattern, setRawPattern] = useState("");

  const useCustom = pattern !== null;

  useEffect(() => {
    if (pattern === null) {
      setBuilder(getDefaultBuilderState(kind));
      setRawPattern("");
      return;
    }
    const { state, ok } = patternToBuilder(pattern, kind);
    setBuilder(ok ? state : getDefaultBuilderState(kind));
    setRawPattern(pattern);
  }, [pattern, kind]);

  const builtPattern = useMemo(() => formatBuilderToPattern(builder), [builder]);
  const clientError = useMemo(() => validateBuilderPatternClient(builtPattern), [builtPattern]);

  const y = new Date().getFullYear();
  const localExample = useMemo(
    () => (clientError ? "" : renderSampleId(builtPattern, y, 1)),
    [builtPattern, y, clientError]
  );

  const commitPattern = useCallback(
    (p: string) => {
      onChange(p);
      onMarkDirty();
    },
    [onChange, onMarkDirty]
  );

  const updateBuilder = useCallback(
    (next: IdFormatBuilderState) => {
      setBuilder(next);
      commitPattern(formatBuilderToPattern(next));
    },
    [commitPattern]
  );

  const setUseCustom = (on: boolean) => {
    if (on) {
      const def = getDefaultBuilderState(kind);
      setBuilder(def);
      commitPattern(formatBuilderToPattern(def));
    } else {
      onChange(null);
      onMarkDirty();
    }
  };

  const advPatternForApi = useMemo(() => {
    if (!useCustom) return null;
    if (advOpen) return rawPattern.trim() || builtPattern;
    return builtPattern;
  }, [useCustom, advOpen, rawPattern, builtPattern]);

  const queryEnabled =
    !useCustom || (useCustom && advPatternForApi ? validateBuilderPatternClient(advPatternForApi) === null : false);

  const previewQuery = useQuery({
    queryKey: ["academics", "id-preview", kind, useCustom, advPatternForApi ?? "default"],
    queryFn: () => {
      const t = kind === "student" ? "student" : "teacher";
      const base = "/api/academics/id-preview?type=" + encodeURIComponent(t);
      const u =
        advPatternForApi && useCustom
          ? base + `&pattern=${encodeURIComponent(advPatternForApi)}`
          : base;
      return apiGet<{ preview: string }>(u);
    },
    enabled: queryEnabled,
    staleTime: 15_000,
  });

  const displayPreview = previewQuery.data?.preview;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {isStudent
              ? "How new students are numbered. Does not change existing records."
              : "How new staff are numbered. Does not change existing records."}
          </p>
        </div>
        <span
          title="We create these numbers for you. This screen only changes how they look — not whether they are created."
          className="mt-0.5 inline-flex size-5 shrink-0 text-muted-foreground"
        >
          <HelpCircle className="size-4" />
        </span>
      </div>

      <ToggleRow
        label="Use a custom number style for this school"
        description="When off, the app’s standard style is used. When on, you set the format below."
        value={useCustom}
        onChange={setUseCustom}
      />

      {useCustom && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Layout</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => updateBuilder({ ...builder, yearBeforeCode: !builder.yearBeforeCode })}
            >
              <ChevronsUpDown className="size-3" />
              {builder.yearBeforeCode
                ? "Year first, then your code"
                : "Your code first, then year"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Code / prefix</Label>
              <Input
                value={builder.prefix}
                onChange={(e) => updateBuilder({ ...builder, prefix: e.target.value.replace(/[{}]/g, "") })}
                maxLength={12}
                className="h-8 font-mono text-sm"
                placeholder={isStudent ? "ADM" : "TCH"}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">How the year appears</Label>
              <select
                className={cn(
                  "flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                )}
                value={builder.yearMode}
                onChange={(e) => updateBuilder({ ...builder, yearMode: e.target.value as YearMode })}
              >
                <option value="full">Full year (e.g. 2025)</option>
                <option value="short">Short year (e.g. 25)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Separator after the first part</Label>
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={builder.sep1 || ""}
                onChange={(e) => updateBuilder({ ...builder, sep1: e.target.value })}
              >
                {SEP_OPTIONS.map((o) => (
                  <option key={o.v || "a"} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Separator before the number</Label>
              <select
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={builder.sep2 || ""}
                onChange={(e) => updateBuilder({ ...builder, sep2: e.target.value })}
              >
                {SEP_OPTIONS.map((o) => (
                  <option key={o.v || "b"} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Running number length</Label>
              <select
                className="max-w-xs flex h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={builder.digits}
                onChange={(e) => updateBuilder({ ...builder, digits: parseInt(e.target.value, 10) })}
              >
                {DIGIT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} digits (for example: {String(1).padStart(d, "0")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-dashed border-border/80 bg-background/80 p-2.5">
            <p className="text-xs text-muted-foreground">Sample for a new {isStudent ? "student" : "teacher"}</p>
            <p className="font-mono text-sm font-medium text-foreground">{clientError ? "—" : localExample || "—"}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Next one the system will assign (based on your list):</span>
              {previewQuery.isFetching && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
              <span className="font-mono text-foreground">
                {clientError
                  ? "—"
                  : !queryEnabled
                    ? "—"
                    : previewQuery.isFetching
                      ? "…"
                      : (displayPreview ?? "—")}
              </span>
            </p>
          </div>

          {clientError && <p className="text-xs text-amber-700 dark:text-amber-500">{clientError}</p>}

          <div>
            <button
              type="button"
              onClick={() => {
                if (!advOpen) {
                  setRawPattern(builtPattern);
                  setAdvOpen(true);
                } else {
                  setAdvOpen(false);
                }
              }}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              {advOpen ? "Hide" : "Show"} technical format
            </button>
            {advOpen && (
              <div className="mt-2 space-y-1.5">
                <Label className="text-xs">Reference string (for support)</Label>
                <Input
                  value={rawPattern}
                  onChange={(e) => setRawPattern(e.target.value)}
                  onBlur={() => {
                    const t = rawPattern.trim();
                    if (!t) {
                      commitPattern(builtPattern);
                      return;
                    }
                    const { state, ok } = patternToBuilder(t, kind);
                    if (ok) {
                      setBuilder(state);
                      commitPattern(formatBuilderToPattern(state));
                    } else {
                      commitPattern(t);
                    }
                  }}
                  className="h-8 font-mono text-xs"
                  spellCheck={false}
                  autoComplete="off"
                />
                {(() => {
                  const e = validateBuilderPatternClient(rawPattern.trim() || "x");
                  if (rawPattern.trim() && e) {
                    return <p className="text-xs text-destructive">{e}</p>;
                  }
                  return null;
                })()}
                <p className="text-[11px] text-muted-foreground">Most schools never need to edit this.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!useCustom && (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-2.5 text-xs text-muted-foreground">
          <p className="mb-1">Standard style — next {isStudent ? "admission" : "ID"} the system will assign:</p>
          <p className="font-mono text-foreground">
            {previewQuery.isFetching && <Loader2 className="inline size-3 animate-spin" />}{" "}
            {displayPreview ?? (previewQuery.isError ? "—" : "…")}
          </p>
        </div>
      )}
    </div>
  );
}
