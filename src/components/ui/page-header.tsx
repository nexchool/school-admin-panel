import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The top of a page: what this screen is, and what you can do here.
 *
 * Every screen had been writing its own, which is how the Academics module
 * ended up with two title sizes, three conventions for the line underneath
 * (a description, a breadcrumb, or nothing at all) and three screens with no
 * page title whatsoever — those opened straight into a card whose heading
 * stood in for one, so the eye had nowhere consistent to land.
 *
 * `title` and `description` are the whole contract. Anything a user can *do*
 * to the page as a whole goes in `actions`, right-aligned; anything that acts
 * on one row belongs on the row, not here.
 *
 * Deliberately not offered:
 *
 * - **A breadcrumb.** Two screens had one — "Academics › Academic Years" —
 *   which restates the sidebar item already highlighted a few centimetres to
 *   the left. At depth two it is decoration.
 * - **A back button.** Every one of these is a destination in the sidebar, so
 *   "back" has no single answer. Bell Schedules had one pointing at Academic
 *   Years, left from when that was the only way in.
 */
export interface PageHeaderProps {
  /** What this screen is, in the school's words. Sentence case. */
  title: React.ReactNode;
  /** One line on what a person does here. Optional, but prefer having one. */
  description?: React.ReactNode;
  /** Page-level actions — usually a single primary button. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        // Wraps rather than squashes: a long title and a wide action button
        // together overflow a narrow window, and a stacked header reads fine
        // where a clipped one does not.
        "flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
