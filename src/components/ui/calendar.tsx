"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = DayPickerProps;

/**
 * DayPicker wrapper — keeps every `rdp-*` class so the library's
 * positioning/layout CSS stays intact, then adds visual overrides.
 *
 * Critical rule: any classNames entry MUST start with the matching
 * `rdp-<slot>` class before any Tailwind additions, otherwise
 * navLayout="around" and captionLayout="dropdown" break.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rdp-root",
        // ─── CSS custom properties ───────────────────────────────────────
        "[--rdp-accent-color:hsl(221_83%_53%)]",
        "[--rdp-accent-background-color:hsl(221_83%_53%/0.08)]",
        "[--rdp-today-color:hsl(221_83%_53%)]",
        "[--rdp-day-height:2.25rem]",
        "[--rdp-day-width:2.25rem]",
        "[--rdp-day_button-height:2rem]",
        "[--rdp-day_button-width:2rem]",
        "[--rdp-day_button-border-radius:0.375rem]",
        "[--rdp-day_button-border:none]",
        "[--rdp-selected-border:none]",
        "[--rdp-nav-height:2.5rem]",
        "[--rdp-nav_button-width:2rem]",
        "[--rdp-nav_button-height:2rem]",
        "[--rdp-disabled-opacity:0.38]",
        "[--rdp-outside-opacity:0.4]",
        "[--rdp-weekday-opacity:1]",
        // ─── layout ──────────────────────────────────────────────────────
        "px-4 pb-4 pt-3",
        className
      )}
      classNames={{
        months: "rdp-months",
        month: "rdp-month space-y-3",
        month_caption: "rdp-month_caption",
        caption_label: cn(
          "rdp-caption_label",
          "text-sm font-semibold text-foreground"
        ),
        // ── Dropdowns (month / year selects) ────────────────────────────
        dropdowns: cn("rdp-dropdowns", "gap-1.5"),
        dropdown_root: cn(
          "rdp-dropdown_root",
          // container is relative + inline-flex so the invisible <select> sits on top
          "h-8 cursor-pointer rounded-lg border border-border/70 bg-muted/30 px-2.5",
          "transition-colors duration-150 hover:border-border hover:bg-muted/60",
          "inline-flex items-center"
        ),
        dropdown: "rdp-dropdown",
        months_dropdown: "rdp-months_dropdown",
        years_dropdown: "rdp-years_dropdown",
        // ── Navigation arrows ────────────────────────────────────────────
        nav: "rdp-nav z-[6]",
        button_previous: cn(
          "rdp-button_previous",
          "inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground",
          "transition-all duration-150 hover:border-border hover:bg-muted/70 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-40"
        ),
        button_next: cn(
          "rdp-button_next",
          "inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground",
          "transition-all duration-150 hover:border-border hover:bg-muted/70 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-40"
        ),
        // ── Grid ─────────────────────────────────────────────────────────
        month_grid: "rdp-month_grid w-full",
        weekdays: "rdp-weekdays",
        weekday: cn(
          "rdp-weekday",
          "w-9 pb-1 text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground"
        ),
        week: "rdp-week",
        day: "rdp-day p-0",
        // ── Day button ───────────────────────────────────────────────────
        // NOTE: `.rdp-selected` in style.css sets `font-size: large` — we reset
        // it with `!text-sm` on the button so selected days don't grow.
        day_button: cn(
          "rdp-day_button",
          "!text-sm rounded-md font-normal text-foreground transition-colors duration-100",
          "hover:bg-muted/80 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        ),
        // ── State modifiers ──────────────────────────────────────────────
        selected: cn(
          "rdp-selected",
          "[&_.rdp-day_button]:!bg-primary [&_.rdp-day_button]:!text-white",
          "[&_.rdp-day_button]:!font-medium [&_.rdp-day_button]:!text-sm",
          "[&_.rdp-day_button]:hover:!bg-primary/90"
        ),
        today: cn(
          "rdp-today",
          "[&_.rdp-day_button]:font-semibold",
        ),
        outside: "rdp-outside",
        disabled: "rdp-disabled",
        hidden: "rdp-hidden",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" strokeWidth={1.8} />
          ) : orientation === "right" ? (
            <ChevronRight className="size-4" strokeWidth={1.8} />
          ) : (
            // dropdown indicator (down chevron)
            <ChevronRight
              className="size-3 rotate-90 opacity-55 transition-transform"
              strokeWidth={1.8}
            />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
