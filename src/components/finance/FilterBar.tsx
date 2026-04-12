"use client";

import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "unpaid",  label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid",    label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export interface FeeFilters {
  academic_year_id: string;
  class_id: string;
  status: string;
  search: string;
}

interface FilterBarProps {
  filters: FeeFilters;
  onChange: (filters: FeeFilters) => void;
  academicYears: { id: string; name: string }[];
  classes: { id: string; name: string; section?: string }[];
}

export function FilterBar({ filters, onChange, academicYears, classes }: FilterBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFilter = useCallback(
    <K extends keyof FeeFilters>(key: K, value: FeeFilters[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange]
  );

  const handleSearchChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilter("search", value), 350);
  };

  const hasActiveFilters =
    filters.academic_year_id || filters.class_id || filters.status || filters.search;

  const clearAll = () =>
    onChange({ academic_year_id: "", class_id: "", status: "", search: "" });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Academic Year */}
        <Select
          value={filters.academic_year_id || "__all__"}
          onValueChange={(v) => setFilter("academic_year_id", v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Years</SelectItem>
            {academicYears.map((ay) => (
              <SelectItem key={ay.id} value={ay.id}>
                {ay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Class */}
        <Select
          value={filters.class_id || "__all__"}
          onValueChange={(v) => setFilter("class_id", v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.section ? `-${c.section}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 w-52 pl-8"
            placeholder="Search student…"
            defaultValue={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={clearAll}>
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter("status", opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filters.status === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
