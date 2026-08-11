"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/data/referenceData";

interface ComboboxProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** When true, a value typed by the user that is not in `options` can be committed. */
  allowCustom?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Searchable, pre-filled dropdown. Controlled by a plain string `value` so it
 * drops into react-hook-form via a Controller. Uses Radix Popover only — no
 * extra dependency — with a filter input and (optionally) free custom entry.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  allowCustom = false,
  disabled = false,
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );
  // A custom (not-in-list) value should still render as its own label.
  const selectedLabel = selected?.label ?? (value ? value : "");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const hasExactMatch = React.useMemo(
    () => options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()),
    [options, query]
  );

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) {
        commit(filtered[0].value);
      } else if (allowCustom && query.trim()) {
        commit(query.trim());
      }
    }
  };

  return (
    <Popover
      // Every use of this sits inside a form dialog, and Radix's own guidance
      // for a popover nested in a modal dialog is to mark it modal: the dialog
      // puts `pointer-events: none` on <body> and this content is portalled to
      // <body>, so it lands outside the interactive layer. Clicking an option
      // still worked — the content re-enables pointer events — but scrolling a
      // long list did not, which is the shape of the bug reported against the
      // grade picker and applies equally to the ~200-entry nationality list.
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !selectedLabel && "text-muted-foreground",
            className
          )}
        >
          <span className="line-clamp-1 text-left">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 opacity-50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => commit(o.value)}
              className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-muted focus:bg-muted"
            >
              <span className="absolute left-2 flex size-3.5 items-center justify-center">
                {o.value === value && <Check className="size-4" />}
              </span>
              {o.label}
            </button>
          ))}

          {allowCustom && query.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={() => commit(query.trim())}
              className="flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus:bg-muted"
            >
              Use “{query.trim()}”
            </button>
          )}

          {filtered.length === 0 && !(allowCustom && query.trim()) && (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
