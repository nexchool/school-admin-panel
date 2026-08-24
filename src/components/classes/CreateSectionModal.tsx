"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { classLabel, gradeAtSameLevel, gradeLabel } from "@/lib/gradeLevel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useCreateClass } from "@/hooks/useClasses";
import { useCreateGrade, useGrades } from "@/hooks/useGrades";
import { useMediums } from "@/hooks/useSubjectContexts";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useAcademicCycles } from "@/hooks/useAcademicCycles";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useActiveUnit } from "@/contexts/ActiveUnitContext";

/**
 * Grade and programme already decided by where the user opened this from.
 * Supplying it turns the dialog from "create a class" into "add a section" —
 * see the note on the component.
 */
export interface SectionContext {
  gradeId: string;
  gradeName: string;
  programmeId: string;
  programmeName: string;
}

interface CreateSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (classId: string) => void;
  /** Omit from the global Classes page; pass from a grade + programme view. */
  context?: SectionContext;
}

/**
 * Open a new section.
 *
 * The fields are the section's identity — campus, programme, grade, section
 * letter, academic year — rather than the legacy `name` the edit form carries.
 * A section named but not placed is what produced classes titled "— A": `name`
 * is nullable and empty for everything the structured builder made, so the
 * label a screen shows is composed from grade and section, and a section with
 * no grade has nothing to compose from.
 *
 * Medium is asked for separately from programme because they are separate at
 * this school's scale: a programme may be "GSEB" with Gujarati and English
 * sections under it, or "GSEB Gujarati Medium" with the medium already in the
 * name. Only the first needs the answer, so it is optional.
 */
export function CreateSectionModal({
  open,
  onOpenChange,
  onCreated,
  context,
}: CreateSectionModalProps) {
  // Both modes create the same Class row. What changes is how much the person
  // has to restate: from the Classes page they are choosing a whole class and
  // answer everything, while from inside Grade 1 · GSEB English the grade and
  // programme are already the answer and asking again invites a mismatch
  // between the page they are on and the row they create.
  const isSectionOfKnownClass = !!context;
  const { academicYearId } = useActiveAcademicYear();
  const { unitId } = useActiveUnit();

  const { data: years = [] } = useAcademicYears(false);
  const { data: campuses = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const { data: grades = [] } = useGrades();
  const { data: mediums = [] } = useMediums();

  const create = useCreateClass();
  const createGrade = useCreateGrade();

  const [yearId, setYearId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [gradeChoice, setGradeChoice] = useState("");
  const [mediumId, setMediumId] = useState("");
  const [section, setSection] = useState("");

  // The header's active year and campus are what the user is already looking
  // at, so they are the answer far more often than not.
  const effectiveYear = yearId || academicYearId || years[0]?.id || "";

  // The dated period this section runs in. A school has one until it opens a
  // second, so the field only appears when there is a choice to make — and
  // when there is, the server refuses to guess, so it has to be made.
  const { data: cycles = [] } = useAcademicCycles(effectiveYear);
  const [cycleId, setCycleId] = useState("");
  const mustChooseCycle = cycles.length > 1;
  // Derived, not reset in an effect: changing the year changes the list, and a
  // cycle from the previous year is simply not in it. Validating the selection
  // against what is on offer keeps this correct without a second source of
  // truth for "what is selected" (and eslint forbids the effect anyway).
  const chosenCycle = cycles.some((c) => c.id === cycleId) ? cycleId : "";
  const effectiveCycle = mustChooseCycle ? chosenCycle : cycles[0]?.id || "";
  const effectiveCampus = campusId || unitId || "";

  const sortedGrades = useMemo(
    () => [...grades].sort((a, b) => a.sequence - b.sequence),
    [grades],
  );

  const gradeOptions = useMemo(
    () => sortedGrades.map((g) => ({ value: g.id, label: g.name })),
    [sortedGrades],
  );
  // The combobox hands back either an existing grade's id or, when the user
  // typed something new, the raw text. Which of the two it is decides whether
  // submitting has to create a grade first.
  const existingGrade = sortedGrades.find((g) => g.id === gradeChoice);
  const typedName = gradeChoice.trim();
  const matchedByName = sortedGrades.find(
    (g) => g.name.toLowerCase() === typedName.toLowerCase(),
  );
  const isNewGrade = Boolean(!existingGrade && typedName && !matchedByName);

  // A grade's place in the ladder comes from the number in its name, so
  // typing "Std 6" where a grade "6" already exists creates a second grade at
  // the same level — two names for one year of school, which then splits
  // promotion and every report by grade. The names differ, so nothing refuses
  // it; saying so before the click is the only thing that helps.
  const sameLevel = isNewGrade
    ? gradeAtSameLevel(typedName, sortedGrades)
    : undefined;

  const effectiveProgramme = context?.programmeId ?? programmeId;

  const trimmedSection = section.trim().toUpperCase();
  const complete = Boolean(
    effectiveYear &&
      effectiveCampus &&
      effectiveProgramme &&
      (context || existingGrade || matchedByName || typedName) &&
      trimmedSection,
  );

  const close = () => {
    setYearId("");
    setCampusId("");
    setProgrammeId("");
    setGradeChoice("");
    setMediumId("");
    setSection("");
    onOpenChange(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete) return;

    // A grade typed rather than picked is created first, and only then is the
    // section opened on it. Sequence is left to the server, which reads the
    // number out of the name — "Std 6" belongs at 6, not at the front.
    let gradeId = context?.gradeId ?? existingGrade?.id ?? matchedByName?.id ?? "";
    if (!gradeId) {
      try {
        const created = await createGrade.mutateAsync({ name: typedName });
        gradeId = created.id;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Could not add the grade “${typedName}”.`,
        );
        return;
      }
    }

    create.mutate(
      {
        // Deliberately empty: a section is named by its grade and letter, and
        // the server composes the label. Writing one here is what produced the
        // rows this form exists to stop making.
        name: "",
        section: trimmedSection,
        academic_year_id: effectiveYear,
        academic_cycle_id: effectiveCycle || undefined,
        school_unit_id: effectiveCampus,
        programme_id: effectiveProgramme,
        grade_id: gradeId,
        medium_id: mediumId || null,
      },
      {
        onSuccess: (created) => {
          close();
          onCreated(created.id);
        },
      },
    );
  };

  const gradeName =
    context?.gradeName ?? existingGrade?.name ?? matchedByName?.name ?? typedName;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isSectionOfKnownClass ? "Add a section" : "Create class"}
          </DialogTitle>
          <DialogDescription>
            {isSectionOfKnownClass
              ? `Another section of ${gradeLabel(context!.gradeName)} on ${context!.programmeName}.`
              : "A class is one grade, on one programme, at one campus, for one academic year."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="section-campus">Campus</Label>
              <Select value={effectiveCampus} onValueChange={setCampusId}>
                <SelectTrigger id="section-campus">
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-year">Academic year</Label>
              <Select value={effectiveYear} onValueChange={setYearId}>
                <SelectTrigger id="section-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mustChooseCycle ? (
            <div className="space-y-2">
              <Label htmlFor="section-cycle">Academic cycle</Label>
              <Select value={chosenCycle} onValueChange={setCycleId}>
                <SelectTrigger id="section-cycle">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This year runs more than one cycle. Choose the one this section
                belongs to.
              </p>
            </div>
          ) : null}

          {isSectionOfKnownClass ? null : (
            <div className="space-y-2">
              <Label htmlFor="section-programme">Programme</Label>
              <Select value={programmeId} onValueChange={setProgrammeId}>
                <SelectTrigger id="section-programme">
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {programmes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No programmes yet — add one under Settings before opening a
                  section.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="section-grade">Grade</Label>
              {isSectionOfKnownClass ? (
                // Shown, not asked. The grade is why this dialog is open; a
                // picker here would let the row disagree with the page.
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                  {gradeLabel(context!.gradeName)}
                </div>
              ) : (
                <>
                  {/* Typeable, not just selectable: a school opening its first
                      Std 6 section should not have to leave, add a grade, and
                      come back. A name that matches one already in the list
                      picks it — the catalogue stays one row per level. */}
                  <Combobox
                    id="section-grade"
                    options={gradeOptions}
                    value={gradeChoice}
                    onChange={setGradeChoice}
                    allowCustom
                    placeholder="Select or type a grade"
                    searchPlaceholder="Search or type a new grade…"
                    emptyText="Press enter to add this grade"
                  />
                  {isNewGrade ? (
                    sameLevel ? (
                      <p className="text-xs text-amber-700 dark:text-amber-500">
                        You already teach “{sameLevel.name}” at this level. Pick
                        it unless “{typedName}” is genuinely a different year.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        “{typedName}” is new — it will be added to your grades.
                      </p>
                    )
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-letter">Section</Label>
              <Input
                id="section-letter"
                value={section}
                onChange={(event) => setSection(event.target.value)}
                placeholder="A"
                maxLength={8}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-medium">Medium (optional)</Label>
            <Select value={mediumId} onValueChange={setMediumId}>
              <SelectTrigger id="section-medium">
                <SelectValue placeholder="Same as the programme" />
              </SelectTrigger>
              <SelectContent>
                {mediums.map((medium) => (
                  <SelectItem key={medium.id} value={medium.id}>
                    {medium.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {complete && gradeName && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              This will be listed as{" "}
              <span className="font-medium">
                {classLabel({ grade_name: gradeName, section: trimmedSection })}
              </span>
              .
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!complete || create.isPending}
              className="gap-2"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSectionOfKnownClass ? "Add section" : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
