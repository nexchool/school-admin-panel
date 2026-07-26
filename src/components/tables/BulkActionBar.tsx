"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  /** How many rows are currently selected. The bar hides itself at 0. */
  selectedCount: number;
  /** Clears the selection. Always rendered as the trailing action. */
  onClear: () => void;
  /**
   * The entity being acted on, singular ("student", "teacher"). Used for the
   * count label — a bare number reads as ambiguous once a page has more than
   * one kind of selectable list.
   */
  noun?: string;
  /**
   * Action buttons. Callers decide which to render based on their own
   * permission checks — this component deliberately knows nothing about RBAC,
   * so a page can never accidentally show an action its user cannot perform by
   * getting a prop wrong here.
   */
  children?: ReactNode;
}

/**
 * Toolbar shown above a table once rows are selected.
 *
 * Standardises the selection→action pattern across list pages: the count on the
 * left, actions on the right, Clear always last and always available. Pages
 * supply their own actions; everything else stays identical so admins learn the
 * pattern once.
 */
export function BulkActionBar({
  selectedCount,
  onClear,
  noun,
  children,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  const label = noun
    ? `${selectedCount} ${noun}${selectedCount === 1 ? "" : "s"} selected`
    : `${selectedCount} selected`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium" aria-live="polite">
        {label}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
