"use client";

import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RolloverPanelProps {
  title: string;
  description: string;
  /** When true, show a 'completed' badge and disable the Run button. */
  done: boolean;
  /** When true, the entire panel is disabled (e.g. promotion not yet executed). */
  disabled?: boolean;
  loading: boolean;
  onRun: () => void;
  /** Optional summary line shown after the panel runs successfully. */
  summary?: string | null;
  error?: string | null;
  required?: boolean;
}

export function RolloverPanel({
  title,
  description,
  done,
  disabled,
  loading,
  onRun,
  summary,
  error,
  required,
}: RolloverPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
        disabled && "opacity-60"
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {required ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              recommended
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              optional
            </span>
          )}
          {done && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              completed
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {summary && (
          <p className="text-xs text-foreground">
            <span className="font-medium">Result:</span> {summary}
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant={done ? "outline" : "secondary"}
          size="sm"
          onClick={onRun}
          disabled={disabled || loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {done ? "Run again" : "Run"}
        </Button>
      </div>
    </div>
  );
}
