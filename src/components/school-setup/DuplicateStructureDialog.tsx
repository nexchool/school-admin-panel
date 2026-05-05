"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useGrades } from "@/hooks/useGrades";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useDuplicateStructure } from "@/hooks/useSchoolSetup";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { ApiException } from "@/services/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateStructureDialog({ open, onOpenChange }: Props) {
  const { data: units = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const { data: grades = [] } = useGrades();
  const { data: years = [] } = useAcademicYears(false);
  const mut = useDuplicateStructure();

  const [tab, setTab] = useState<"unit" | "programme">("unit");

  // Unit → Unit
  const [sourceUnit, setSourceUnit] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [unitProgramme, setUnitProgramme] = useState<string>("__all__");
  const [unitYear, setUnitYear] = useState("");

  // Programme → Programme
  const [sourceProg, setSourceProg] = useState("");
  const [targetProg, setTargetProg] = useState("");
  const [gradeIds, setGradeIds] = useState<Set<string>>(new Set());

  const reset = () => {
    setSourceUnit("");
    setTargetUnit("");
    setUnitProgramme("__all__");
    setUnitYear("");
    setSourceProg("");
    setTargetProg("");
    setGradeIds(new Set());
  };

  const submit = () => {
    if (tab === "unit") {
      if (!sourceUnit || !targetUnit || !unitYear) {
        toast.error("Pick source unit, target unit, and academic year.");
        return;
      }
      if (sourceUnit === targetUnit) {
        toast.error("Source and target unit must differ.");
        return;
      }
      mut.mutate(
        {
          mode: "unit_to_unit",
          source_unit_id: sourceUnit,
          target_unit_id: targetUnit,
          academic_year_id: unitYear,
          ...(unitProgramme && unitProgramme !== "__all__"
            ? { programme_id: unitProgramme }
            : {}),
        },
        {
          onSuccess: (res) => {
            toast.success(
              `Created ${res.created_count} class(es); skipped ${res.skipped_count}.`,
            );
            onOpenChange(false);
            reset();
          },
          onError: (e) =>
            toast.error(
              e instanceof ApiException
                ? e.message
                : e instanceof Error
                  ? e.message
                  : "Duplicate failed.",
            ),
        },
      );
    } else {
      if (!sourceProg || !targetProg) {
        toast.error("Pick source and target programme.");
        return;
      }
      if (sourceProg === targetProg) {
        toast.error("Source and target programme must differ.");
        return;
      }
      mut.mutate(
        {
          mode: "programme_to_programme",
          source_programme_id: sourceProg,
          target_programme_id: targetProg,
          ...(gradeIds.size > 0 ? { grade_ids: Array.from(gradeIds) } : {}),
        },
        {
          onSuccess: (res) => {
            toast.success(
              `Copied ${res.created_count} offering(s); skipped ${res.skipped_count}.`,
            );
            onOpenChange(false);
            reset();
          },
          onError: (e) =>
            toast.error(
              e instanceof ApiException
                ? e.message
                : e instanceof Error
                  ? e.message
                  : "Duplicate failed.",
            ),
        },
      );
    }
  };

  const toggleGrade = (id: string) => {
    setGradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate structure</DialogTitle>
          <DialogDescription>
            Copy classes between units, or subject offerings between
            programmes. Existing rows are skipped — re-running is safe.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "unit" | "programme")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="unit">Unit → Unit</TabsTrigger>
            <TabsTrigger value="programme">Programme → Programme</TabsTrigger>
          </TabsList>

          <TabsContent value="unit" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label>Source unit</Label>
              <Select value={sourceUnit} onValueChange={setSourceUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Target unit</Label>
              <Select value={targetUnit} onValueChange={setTargetUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Programme (optional)</Label>
                <Select value={unitProgramme} onValueChange={setUnitProgramme}>
                  <SelectTrigger>
                    <SelectValue placeholder="All programmes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All programmes</SelectItem>
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Academic year</Label>
                <Select value={unitYear} onValueChange={setUnitYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="programme" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label>Source programme</Label>
              <Select value={sourceProg} onValueChange={setSourceProg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Target programme</Label>
              <Select value={targetProg} onValueChange={setTargetProg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Grades (optional — empty = all)</Label>
              <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
                {grades.map((g) => {
                  const active = gradeIds.has(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGrade(g.id)}
                      className={
                        "rounded-full border px-2 py-0.5 text-xs " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted")
                      }
                    >
                      {g.name}
                    </button>
                  );
                })}
                {grades.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No grades defined.
                  </span>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Duplicating…
              </>
            ) : (
              "Duplicate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
