"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BulkGenerateDialog } from "@/components/school-setup/BulkGenerateDialog";
import { useCreateProgramme } from "@/hooks/useProgrammes";
import { useCreateGrade } from "@/hooks/useGrades";
import { useCreateSchoolUnit } from "@/hooks/useSchoolUnits";

// ── Constants ─────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { label: "Nursery", value: "Nursery" },
  { label: "Jr KG", value: "Jr KG" },
  { label: "Sr KG", value: "Sr KG" },
  { label: "Std 1", value: "Std 1" },
  { label: "Std 2", value: "Std 2" },
  { label: "Std 3", value: "Std 3" },
  { label: "Std 4", value: "Std 4" },
  { label: "Std 5", value: "Std 5" },
  { label: "Std 6", value: "Std 6" },
  { label: "Std 7", value: "Std 7" },
  { label: "Std 8", value: "Std 8" },
  { label: "Std 9", value: "Std 9" },
  { label: "Std 10", value: "Std 10" },
  { label: "Std 11", value: "Std 11" },
  { label: "Std 12", value: "Std 12" },
] as const;

const DEFAULT_SECTION_LABELS: Record<number, string> = {
  1: "A",
  2: "A, B",
  3: "A, B, C",
  4: "A, B, C, D",
};

const BOARD_OPTIONS = ["CBSE", "ICSE", "GSEB", "State Board", "Other"] as const;
const MEDIUM_OPTIONS = ["English", "Gujarati", "Hindi", "Semi-English"] as const;

// ── Component ─────────────────────────────────────────────────────────────

export default function SchoolProfilePage() {
  const router = useRouter();

  const createProgramme = useCreateProgramme();
  const createGrade = useCreateGrade();
  const createUnit = useCreateSchoolUnit();

  const [board, setBoard] = useState<string>("CBSE");
  const [medium, setMedium] = useState<string>("English");
  const [gradeFrom, setGradeFrom] = useState<string>("Nursery");
  const [gradeTo, setGradeTo] = useState<string>("Std 12");
  const [sections, setSections] = useState<number>(3);
  const [branchCount, setBranchCount] = useState<number>(1);

  const [generating, setGenerating] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [initialCells, setInitialCells] = useState<Record<string, Record<string, string>>>({});

  const fromIdx = GRADE_OPTIONS.findIndex((g) => g.value === gradeFrom);
  const toIdx = GRADE_OPTIONS.findIndex((g) => g.value === gradeTo);
  const gradeCount = fromIdx >= 0 && toIdx >= fromIdx ? toIdx - fromIdx + 1 : 0;

  const selectedGrades = useMemo(
    () => (fromIdx >= 0 && toIdx >= fromIdx ? GRADE_OPTIONS.slice(fromIdx, toIdx + 1) : []),
    [fromIdx, toIdx],
  );

  const handleGenerate = async () => {
    if (gradeCount === 0) {
      toast.error("Select a valid grade range.");
      return;
    }
    setGenerating(true);
    try {
      // 1. Create branches
      const unitIds: string[] = [];
      for (let i = 0; i < branchCount; i++) {
        const name = branchCount === 1 ? "Main Branch" : `Branch ${i + 1}`;
        const unit = await createUnit.mutateAsync({ name, type: "campus" });
        unitIds.push(unit.id);
      }

      // 2. Create programme
      const code = board.toUpperCase().replace(/\s+/g, "_").slice(0, 10);
      const prog = await createProgramme.mutateAsync({
        name: `${board} · ${medium}`,
        board,
        medium,
        code,
      });

      // 3. Create grades in order
      const gradeIds: string[] = [];
      for (let i = 0; i < selectedGrades.length; i++) {
        const grade = await createGrade.mutateAsync({
          name: selectedGrades[i].value,
          sequence: i + 1,
        });
        gradeIds.push(grade.id);
      }

      // 4. Build initialCells for BulkGenerateDialog
      const cells: Record<string, Record<string, string>> = {};
      const sectionStr = DEFAULT_SECTION_LABELS[sections] ?? "A, B, C";
      for (const gradeId of gradeIds) {
        cells[gradeId] = {};
        for (const unitId of unitIds) {
          cells[gradeId][`${unitId}::${prog.id}`] = sectionStr;
        }
      }
      setInitialCells(cells);
      setBulkDialogOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-2xl p-6 flex flex-col gap-8">
        <div>
          <p className="text-sm text-muted-foreground">Step 0 of 8</p>
          <h1 className="text-2xl font-semibold">School Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us about your school. We&apos;ll generate grades, classes, and
            load your subject template. You review and adjust each step.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 flex flex-col gap-6">
          {/* Board */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Board <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {BOARD_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBoard(b)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    board === b
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Medium */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Medium <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MEDIUM_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedium(m)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    medium === m
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Range */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Grade Range <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-3">
              <select
                value={gradeFrom}
                onChange={(e) => setGradeFrom(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <span className="text-muted-foreground">→</span>
              <select
                value={gradeTo}
                onChange={(e) => setGradeTo(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {gradeCount > 0 && (
                <span className="shrink-0 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  {gradeCount} grades
                </span>
              )}
            </div>
          </div>

          {/* Sections per grade */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Default sections per grade</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSections(n)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    sections === n
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Starting point only — you&apos;ll adjust per grade in the next step.
            </p>
          </div>

          {/* Branches */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Branches</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBranchCount(n)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    branchCount === n
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Name them in Step 1.</p>
          </div>

          {/* Preview banner */}
          {gradeCount > 0 && (
            <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 px-4 py-3 text-sm">
              <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                ⚡ Will be auto-generated
              </p>
              <div className="flex flex-wrap gap-4 text-green-700 dark:text-green-300">
                <span>📚 {gradeCount} grades ({gradeFrom} – {gradeTo})</span>
                <span>🏫 1 programme ({board} · {medium})</span>
                <span>🌿 {branchCount} {branchCount === 1 ? "branch" : "branches"}</span>
                <span>
                  🎓 ~{gradeCount * sections * branchCount} classes{" "}
                  <span className="opacity-70">(you&apos;ll confirm exact count)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/school-setup/units")}
          >
            Skip — set up manually →
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || gradeCount === 0}
          >
            {generating && <Loader2 className="mr-2 size-4 animate-spin" />}
            Generate &amp; Review Classes →
          </Button>
        </div>
      </div>

      <BulkGenerateDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        initialCells={initialCells}
        onSuccess={() => {
          setBulkDialogOpen(false);
          router.push("/school-setup/classes");
        }}
      />
    </>
  );
}
