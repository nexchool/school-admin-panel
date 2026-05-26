"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useActiveUnit } from "@/contexts/ActiveUnitContext";
import { useUpdateDefaultUnit } from "@/hooks/useDefaultUnit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function UnitSwitcher() {
  const { data: units = [] } = useSchoolUnits();
  const { unitId, setUnitId } = useActiveUnit();
  const update = useUpdateDefaultUnit();

  if (units.length <= 1) return null;

  const active =
    units.find((u) => u.id === unitId) ??
    units.find((u) => u.status === "active") ??
    units[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="size-4" />
          <span className="font-medium">{active.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            {active.type}
          </Badge>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {units.map((u) => (
          <DropdownMenuItem
            key={u.id}
            onClick={() => {
              setUnitId(u.id);
              update.mutate(u.id);
            }}
          >
            <Building2 className="mr-2 size-4" />
            <span className="flex-1">{u.name}</span>
            <Badge variant="outline" className="ml-2 text-[10px]">
              {u.type}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
