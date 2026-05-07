"use client";

import { Calendar, ChevronDown } from "lucide-react";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function AcademicYearSwitcher() {
  const { data: years = [], isLoading } = useAcademicYears();
  const { academicYearId, setAcademicYearId } = useActiveAcademicYear();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Calendar className="size-4" />
        Loading…
      </Button>
    );
  }

  if (years.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-2"
        aria-label="No academic year configured"
      >
        <Calendar className="size-4" />
        <span className="text-muted-foreground">No academic year</span>
      </Button>
    );
  }

  const active =
    years.find((y) => y.id === academicYearId) ??
    years.find((y) => y.is_active) ??
    years[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="size-4" />
          <span className="font-medium">{active.name}</span>
          {active.is_active && (
            <Badge variant="secondary" className="text-[10px]">
              active
            </Badge>
          )}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {years.map((y) => (
          <DropdownMenuItem
            key={y.id}
            onClick={() => setAcademicYearId(y.id)}
          >
            <Calendar className="mr-2 size-4" />
            <span className="flex-1">{y.name}</span>
            {y.is_active && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
