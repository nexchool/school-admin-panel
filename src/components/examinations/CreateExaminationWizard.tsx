"use client";

/**
 * Scheduling an examination: sections, then subjects, then the details.
 *
 * The order is the order a school thinks in — *which sections are sitting
 * this?* before *what are they sitting?* — and it is what makes a multi-section
 * examination obvious rather than something you discover by counting rows.
 *
 * **A section is named the way the school names it.** `display_name` is
 * composed server-side ("Grade 10 A"); `name` is a nullable legacy label and is
 * empty for every section created through the structured form, so a picker
 * that fell back to `section` printed a wall of "A", "A", "B" that told nobody
 * which class they were choosing. Where a trust runs several campuses, boards
 * or mediums, whichever of those actually differ across the offered sections
 * are shown beneath the name — the ones that do not differ are noise.
 *
 * **The list is already scoped.** The page hands over the sections of the
 * active branch and academic year, the two filters in the header, so this
 * screen never offers a section from another campus or a closed year.
 *
 * **Subjects come from the offerings, not the catalogue.** A trust's
 * catalogue holds every subject any campus teaches; scheduling one that a
 * chosen section is not taught is refused for the whole set
 * (`OFFERING_NOT_FOUND`). So the picker asks the server what these sections
 * are taught, and a subject only some of them are taught is shown as
 * unavailable rather than as a choice that will fail at the last step.
 *
 * **Nothing is created until Create.** Moving between steps costs nothing and
 * leaves nothing behind; a wizard that opened a draft examination on the
 * server would leave a school's list full of things nobody finished.
 *
 * **The paper count is a preview, not a decision.** Six subjects across two
 * sections shows "12 papers", but which offering teaches each pair is resolved
 * by the server: a paper's class is derived from its offering, so a client
 * that resolved offerings itself would be inventing a paper's class.
 */

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { RequiredMark } from "@/components/ui/required-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useCreateExamination,
  useExamTypes,
  useExaminationSubjectOptions,
} from "@/hooks/useExaminations";
import type { ClassItem } from "@/types/class";
import type { SubjectSetEntry } from "@/types/examination";

interface Props {
  open: boolean;
  onClose: () => void;
  academicCycleId: string;
  /** The active branch and academic year's sections. Scoped by the caller. */
  sections: ClassItem[];
  isLoadingOptions?: boolean;
  /** Named so the empty state can say which branch has no sections. */
  scopeLabel?: string;
  onCreated: (examinationId: string) => void;
}

const STEPS = ["Sections", "Subjects", "Details", "Papers", "Review"] as const;
type Step = (typeof STEPS)[number];

const DEFAULT_MAX_MARKS = 100;
const UNGROUPED = "Other sections";

/** What the school calls this section. Never composed here — see the header. */
function sectionLabel(section: ClassItem): string {
  const composed = [section.grade_name, section.section]
    .filter((part) => part && String(part).trim())
    .join(" ");
  return (
    section.display_name?.trim() ||
    section.name?.trim() ||
    composed ||
    section.section?.trim() ||
    section.id
  );
}

/** Which structural dimensions actually differ across what is on offer.
 *  A single-campus, single-medium school is told neither. */
function varyingDimensions(sections: ClassItem[]) {
  const distinct = (pick: (section: ClassItem) => string | null | undefined) =>
    new Set(
      sections
        .map((section) => pick(section))
        .filter((value): value is string => !!value && !!value.trim()),
    ).size;
  return {
    campus: distinct((s) => s.school_unit_name) > 1,
    programme: distinct((s) => s.programme_name) > 1,
    medium: distinct((s) => s.medium_name) > 1,
    stream: distinct((s) => s.stream) > 1,
  };
}

function sectionMeta(
  section: ClassItem,
  varying: ReturnType<typeof varyingDimensions>,
): string {
  return [
    varying.campus ? section.school_unit_name : null,
    varying.programme ? section.programme_name : null,
    varying.medium ? section.medium_name : null,
    varying.stream ? section.stream : null,
  ]
    .filter((part) => part && String(part).trim())
    .join(" · ");
}

/** Everything a search box should be able to match on one section. */
function searchHaystack(section: ClassItem): string {
  return [
    sectionLabel(section),
    section.grade_name,
    section.section,
    section.school_unit_name,
    section.programme_name,
    section.medium_name,
    section.stream,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function CreateExaminationWizard({
  open,
  onClose,
  academicCycleId,
  sections,
  isLoadingOptions,
  scopeLabel,
  onCreated,
}: Props) {
  const [step, setStep] = useState<Step>("Sections");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [sectionSearch, setSectionSearch] = useState("");
  const [name, setName] = useState("");
  const [examTypeId, setExamTypeId] = useState("");
  const [maxMarks, setMaxMarks] = useState(String(DEFAULT_MAX_MARKS));
  const [passMarks, setPassMarks] = useState("");
  const [examDate, setExamDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const { data: examTypes = [] } = useExamTypes();
  const { data: subjectOptions = [], isLoading: isLoadingSubjects } =
    useExaminationSubjectOptions(classIds);
  const create = useCreateExamination();

  /** Only the subjects every chosen section is taught can be fanned across
   *  them all; the rest are shown as unavailable, with the reason. */
  const availableSubjects = useMemo(
    () => subjectOptions.filter((option) => option.offeredByAll),
    [subjectOptions],
  );
  const partialSubjects = useMemo(
    () => subjectOptions.filter((option) => !option.offeredByAll),
    [subjectOptions],
  );

  // Narrowing the sections can strand a subject the new set is not all taught.
  // Derived rather than synced back into state: what a school is shown, what
  // the count says and what is sent are then the same list by construction.
  const chosenSubjectIds = useMemo(() => {
    if (isLoadingSubjects) return subjectIds;
    const offered = new Set(availableSubjects.map((option) => option.id));
    return subjectIds.filter((id) => offered.has(id));
  }, [subjectIds, availableSubjects, isLoadingSubjects]);

  const varying = useMemo(() => varyingDimensions(sections), [sections]);

  const visibleSections = useMemo(() => {
    const needle = sectionSearch.trim().toLowerCase();
    if (!needle) return sections;
    return sections.filter((section) => searchHaystack(section).includes(needle));
  }, [sections, sectionSearch]);

  /** Grouped by grade, in teaching order — Nursery before Std 2 before Std 10,
   *  which is `grade_sequence`, never the name sorted as text. */
  const grades = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; sequence: number; sections: ClassItem[] }
    >();
    for (const section of visibleSections) {
      const label = section.grade_name?.trim() || UNGROUPED;
      const group = groups.get(label) ?? {
        label,
        sequence:
          section.grade_sequence ?? (label === UNGROUPED ? Number.MAX_SAFE_INTEGER : 0),
        sections: [],
      };
      group.sections.push(section);
      groups.set(label, group);
    }
    return [...groups.values()].sort(
      (a, b) => a.sequence - b.sequence || a.label.localeCompare(b.label),
    );
  }, [visibleSections]);

  const selectedSections = useMemo(
    () => sections.filter((s) => classIds.includes(s.id)),
    [sections, classIds],
  );
  const selectedSubjects = useMemo(
    () => availableSubjects.filter((s) => chosenSubjectIds.includes(s.id)),
    [availableSubjects, chosenSubjectIds],
  );
  const paperCount = classIds.length * chosenSubjectIds.length;

  const reset = () => {
    setStep("Sections");
    setClassIds([]);
    setSubjectIds([]);
    setSectionSearch("");
    setName("");
    setExamTypeId("");
    setMaxMarks(String(DEFAULT_MAX_MARKS));
    setPassMarks("");
    setExamDate("");
    setErrors({});
    setFailure(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleGrade = (groupSections: ClassItem[]) => {
    const ids = groupSections.map((section) => section.id);
    const allChosen = ids.every((id) => classIds.includes(id));
    setClassIds((list) =>
      allChosen
        ? list.filter((id) => !ids.includes(id))
        : [...new Set([...list, ...ids])],
    );
  };

  /** Only what the user can see on this step. The server stays authoritative. */
  const validate = (current: Step): boolean => {
    const found: Record<string, string> = {};
    if (current === "Sections" && classIds.length === 0) {
      found.sections = "Choose at least one section";
    }
    if (current === "Subjects" && chosenSubjectIds.length === 0) {
      found.subjects = "Choose at least one subject";
    }
    if (current === "Details") {
      if (!name.trim()) found.name = "Give this examination a name";
      if (!examTypeId) found.examTypeId = "Choose what kind of examination this is";
    }
    if (current === "Papers") {
      const max = Number(maxMarks);
      if (!maxMarks.trim() || Number.isNaN(max) || max <= 0) {
        found.maxMarks = "Total marks must be a number above zero";
      }
      if (passMarks.trim()) {
        const pass = Number(passMarks);
        if (Number.isNaN(pass) || pass < 0) {
          found.passMarks = "Pass marks must be zero or more";
        } else if (!Number.isNaN(max) && pass > max) {
          found.passMarks = "Pass marks cannot be above the total";
        }
      }
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const index = STEPS.indexOf(step);
  const goNext = () => {
    if (!validate(step)) return;
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  };
  const goBack = () => {
    setErrors({});
    setStep(STEPS[Math.max(index - 1, 0)]);
  };

  const buildSubjectSet = () => ({
    classIds,
    subjects: chosenSubjectIds.map<SubjectSetEntry>((subjectId) => ({
      subjectId,
      maxMarks: Number(maxMarks),
      passMarks: passMarks.trim() ? Number(passMarks) : null,
      examDate: examDate || null,
    })),
  });

  const submit = async () => {
    setFailure(null);
    try {
      // One call. The papers are created in the same transaction as the
      // examination, so a refused paper leaves no examination behind — there
      // is no partial state for this screen to explain.
      const created = await create.mutateAsync({
        academicCycleId,
        examTypeId,
        name: name.trim(),
        subjectSet: buildSubjectSet(),
      });
      reset();
      onCreated(created.id);
    } catch (error) {
      // The wizard's state is deliberately kept — a school that mis-typed one
      // date should not re-pick six subjects.
      setFailure(
        error instanceof Error ? error.message : "The examination was not created",
      );
    }
  };

  const matrix = useMemo(
    () =>
      selectedSections.flatMap((section) =>
        selectedSubjects.map((subject) => ({
          key: `${section.id}:${subject.id}`,
          section: sectionLabel(section),
          subject: subject.name,
        })),
      ),
    [selectedSections, selectedSubjects],
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create examination</DialogTitle>
          <DialogDescription>
            Choose the sections sitting this examination, then the subjects they
            will sit. One set of subjects is scheduled across every section.
            {scopeLabel ? ` Showing ${scopeLabel}.` : null}
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((label, position) => (
            <li key={label}>
              <span
                aria-current={label === step ? "step" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  label === step
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : position < index
                      ? "border-muted bg-muted text-muted-foreground"
                      : "border-muted text-muted-foreground",
                )}
              >
                {position + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="min-h-[18rem] py-2">
          {step === "Sections" && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Which sections are sitting this examination?
                <RequiredMark />
              </legend>
              {isLoadingOptions ? (
                <p className="text-sm text-muted-foreground">Loading sections…</p>
              ) : sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {scopeLabel
                    ? `No sections in ${scopeLabel} yet.`
                    : "This academic cycle has no sections yet."}
                </p>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        aria-label="Search sections"
                        className="pl-8"
                        placeholder="Search grade, section, medium…"
                        value={sectionSearch}
                        onChange={(event) => setSectionSearch(event.target.value)}
                      />
                    </div>
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid="section-selection-count"
                    >
                      {classIds.length} of {sections.length} sections selected
                    </p>
                  </div>

                  <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                    {grades.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No section matches “{sectionSearch}”.
                      </p>
                    ) : (
                      grades.map((group) => {
                        const allChosen = group.sections.every((section) =>
                          classIds.includes(section.id),
                        );
                        return (
                          <div key={group.label}>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {group.label}
                              </h3>
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => toggleGrade(group.sections)}
                              >
                                {allChosen ? "Clear" : "Select all"}
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {group.sections.map((section) => {
                                const checked = classIds.includes(section.id);
                                const label = sectionLabel(section);
                                const meta = sectionMeta(section, varying);
                                return (
                                  <label
                                    key={section.id}
                                    className={cn(
                                      "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm",
                                      checked && "border-primary bg-primary/5",
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5"
                                      aria-label={label}
                                      checked={checked}
                                      onChange={() =>
                                        setClassIds((list) =>
                                          toggle(list, section.id),
                                        )
                                      }
                                    />
                                    <span className="min-w-0">
                                      <span className="block truncate font-medium">
                                        {label}
                                      </span>
                                      {meta && (
                                        <span className="block truncate text-xs text-muted-foreground">
                                          {meta}
                                        </span>
                                      )}
                                      {typeof section.student_count === "number" && (
                                        <span className="block text-xs text-muted-foreground">
                                          {section.student_count} students
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
              <FieldError message={errors.sections} />
            </fieldset>
          )}

          {step === "Subjects" && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium">
                Which subjects will they sit?
                <RequiredMark />
              </legend>
              <p className="mb-2 text-xs text-muted-foreground">
                Each subject is scheduled for every section you chose, so only
                the subjects all {classIds.length} of them are taught can be
                picked.
              </p>
              {isLoadingSubjects ? (
                <p className="text-sm text-muted-foreground">Loading subjects…</p>
              ) : availableSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  The sections you chose share no subject. Choose sections that
                  are taught the same subjects, or schedule them separately.
                </p>
              ) : (
                <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {availableSubjects.map((subject) => {
                    const checked = chosenSubjectIds.includes(subject.id);
                    return (
                      <label
                        key={subject.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm",
                          checked && "border-primary bg-primary/5",
                        )}
                      >
                        <input
                          type="checkbox"
                          aria-label={subject.name}
                          checked={checked}
                          onChange={() =>
                            setSubjectIds((list) => toggle(list, subject.id))
                          }
                        />
                        <span className="truncate">{subject.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <FieldError message={errors.subjects} />

              {partialSubjects.length > 0 && (
                <div className="mt-3" data-testid="partial-subjects">
                  <p className="text-xs text-muted-foreground">
                    Not available for this set — only some of the chosen
                    sections are taught these. Schedule them in their own
                    examination.
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {partialSubjects.map((subject) => (
                      <li
                        key={subject.id}
                        className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
                      >
                        {subject.name} · {subject.sectionCount} of{" "}
                        {classIds.length}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {paperCount > 0 && (
                <p className="mt-3 text-sm" data-testid="paper-count-hint">
                  {classIds.length} sections × {chosenSubjectIds.length} subjects ={" "}
                  <strong>{paperCount} papers</strong>
                </p>
              )}
            </fieldset>
          )}

          {step === "Details" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="exam-name">
                  Name <RequiredMark />
                </Label>
                <Input
                  id="exam-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Half Yearly"
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="exam-type">
                  Kind of examination <RequiredMark />
                </Label>
                <Select value={examTypeId} onValueChange={setExamTypeId}>
                  <SelectTrigger id="exam-type">
                    <SelectValue placeholder="Choose a kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.examTypeId} />
              </div>
            </div>
          )}

          {step === "Papers" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These apply to all {paperCount} papers. Individual papers can be
                adjusted after the examination is created.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="max-marks">
                    Total marks <RequiredMark />
                  </Label>
                  <Input
                    id="max-marks"
                    inputMode="numeric"
                    value={maxMarks}
                    onChange={(event) => setMaxMarks(event.target.value)}
                  />
                  <FieldError message={errors.maxMarks} />
                </div>
                <div>
                  <Label htmlFor="pass-marks">Pass marks</Label>
                  <Input
                    id="pass-marks"
                    inputMode="numeric"
                    value={passMarks}
                    onChange={(event) => setPassMarks(event.target.value)}
                    placeholder="Optional"
                  />
                  <FieldError message={errors.passMarks} />
                </div>
                <div>
                  <Label htmlFor="exam-date">Date</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    A date is needed before the examination can be scheduled.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "Review" && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Examination</dt>
                  <dd className="font-medium">{name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sections</dt>
                  <dd className="font-medium">{classIds.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Subjects</dt>
                  <dd className="font-medium">{chosenSubjectIds.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Papers to create</dt>
                  <dd className="font-medium" data-testid="review-paper-count">
                    {paperCount}
                  </dd>
                </div>
              </dl>

              <div className="max-h-56 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Papers this examination will create
                  </caption>
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="p-2 text-left">Section</th>
                      <th scope="col" className="p-2 text-left">Subject</th>
                      <th scope="col" className="p-2 text-left">Date</th>
                      <th scope="col" className="p-2 text-right">Max</th>
                      <th scope="col" className="p-2 text-right">Pass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row) => (
                      <tr key={row.key} className="border-t">
                        <td className="p-2">{row.section}</td>
                        <td className="p-2">{row.subject}</td>
                        <td className="p-2">{examDate || "—"}</td>
                        <td className="p-2 text-right">{maxMarks}</td>
                        <td className="p-2 text-right">{passMarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {failure && (
                <p role="alert" className="text-sm text-destructive">
                  {failure}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={index === 0 || create.isPending}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step === "Review" ? (
            <Button type="button" onClick={submit} disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Create {paperCount} papers
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
