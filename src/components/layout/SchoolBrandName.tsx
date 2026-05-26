"use client";

import { cn } from "@/lib/utils";

type SchoolBrandNameProps = {
  name: string | null | undefined;
  /** When the school name is unknown */
  fallback?: string;
  className?: string;
  /** Sidebar: single line truncate. Login card: allow two lines. */
  lineClamp?: 1 | 2 | 3;
};

/**
 * School / tenant title with truncation and full text in `title` for hover.
 */
export function SchoolBrandName({
  name,
  fallback = "School",
  className,
  lineClamp = 1,
}: SchoolBrandNameProps) {
  const raw = name?.trim();
  const text = raw || fallback;
  return (
    <span
      className={cn(
        "min-w-0 shrink font-semibold",
        lineClamp === 1 && "block truncate",
        lineClamp === 2 && "line-clamp-2 break-words [overflow-wrap:anywhere]",
        lineClamp === 3 && "line-clamp-3 break-words [overflow-wrap:anywhere]",
        className
      )}
      title={text}
    >
      {text}
    </span>
  );
}
