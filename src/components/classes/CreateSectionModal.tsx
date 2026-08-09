"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useGrades } from "@/hooks/useGrades";
import { useMediums } from "@/hooks/useSubjectContexts";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";
import { useActiveUnit } from "@/contexts/ActiveUnitContext";

interface CreateSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (classId: string) => void;
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
}: CreateSectionModalProps) {
  const { academicYearId } = useActiveAcademicYear();
  const { unitId } = useActiveUnit();

  const { data: years = [] } = useAcademicYears(false);
  const { data: campuses = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const { data: grades = [] } = useGrades();
  const { data: mediums = [] } = useMediums();

  const create = useCreateClass();

  const [yearId, setYearId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [mediumId, setMediumId] = useState("");
  const [section, setSection] = useState("");

  // The header's active year and campus are what the user is already looking
  // at, so they are the answer far more often than not.
  const effectiveYear = yearId || academicYearId || years[0]?.id || "";
  const effectiveCampus = campusId || unitId || "";

  const sortedGrades = useMemo(
    () => [...grades].sort((a, b) => a.sequence - b.sequence),
    [grades],
  );

  const trimmedSection = section.trim().toUpperCase();
  const complete = Boolean(
    effectiveYear && effectiveCampus && programmeId && gradeId && trimmedSection,
  );

  const close = () => {
    setYearId("");
    setCampusId("");
    setProgrammeId("");
    setGradeId("");
    setMediumId("");
    setSection("");
    onOpenChange(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete) return;
    create.mutate(
      {
        // Deliberately empty: a section is named by its grade and letter, and
        // the server composes the label. Writing one here is what produced the
        // rows this form exists to stop making.
        name: "",
        section: trimmedSection,
        academic_year_id: effectiveYear,
        school_unit_id: effectiveCampus,
        programme_id: programmeId,
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

  const gradeName = sortedGrades.find((g) => g.id === gradeId)?.name;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a section</DialogTitle>
          <DialogDescription>
            A section belongs to one grade, on one programme, at one campus, for
            one academic year.
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

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="section-grade">Grade</Label>
              <Select value={gradeId} onValueChange={setGradeId}>
                <SelectTrigger id="section-grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {sortedGrades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {gradeName} {trimmedSection}
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
              Add section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
