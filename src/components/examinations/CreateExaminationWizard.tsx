"use client";

/**
 * Scheduling an examination: sections, then subjects, then the details.
 *
 * The order is the order a school thinks in — *which sections are sitting
 * this?* before *what are they sitting?* — and it is what makes a multi-section
 * examination obvious rather than something you discover by counting rows.
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
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

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
import { useCreateExamination, useExamTypes } from "@/hooks/useExaminations";
import type { ClassItem } from "@/types/class";
import type { SubjectSetEntry } from "@/types/examination";

export interface WizardSubject {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  academicCycleId: string;
  sections: ClassItem[];
  subjects: WizardSubject[];
  isLoadingOptions?: boolean;
  onCreated: (examinationId: string) => void;
}

const STEPS = ["Sections", "Subjects", "Details", "Papers", "Review"] as const;
type Step = (typeof STEPS)[number];

const DEFAULT_MAX_MARKS = 100;

function sectionLabel(section: ClassItem): string {
  return section.name?.trim() || section.section || section.id;
}

export function CreateExaminationWizard({
  open,
  onClose,
  academicCycleId,
  sections,
  subjects,
  isLoadingOptions,
  onCreated,
}: Props) {
  const [step, setStep] = useState<Step>("Sections");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [examTypeId, setExamTypeId] = useState("");
  const [maxMarks, setMaxMarks] = useState(String(DEFAULT_MAX_MARKS));
  const [passMarks, setPassMarks] = useState("");
  const [examDate, setExamDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const { data: examTypes = [] } = useExamTypes();
  const create = useCreateExamination();

  const selectedSections = useMemo(
    () => sections.filter((s) => classIds.includes(s.id)),
    [sections, classIds],
  );
  const selectedSubjects = useMemo(
    () => subjects.filter((s) => subjectIds.includes(s.id)),
    [subjects, subjectIds],
  );
  const paperCount = classIds.length * subjectIds.length;

  const reset = () => {
    setStep("Sections");
    setClassIds([]);
    setSubjectIds([]);
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

  /** Only what the user can see on this step. The server stays authoritative. */
  const validate = (current: Step): boolean => {
    const found: Record<string, string> = {};
    if (current === "Sections" && classIds.length === 0) {
      found.sections = "Choose at least one section";
    }
    if (current === "Subjects" && subjectIds.length === 0) {
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
    subjects: subjectIds.map<SubjectSetEntry>((subjectId) => ({
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
                  This academic cycle has no sections yet.
                </p>
              ) : (
                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {sections.map((section) => {
                    const checked = classIds.includes(section.id);
                    return (
                      <label
                        key={section.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm",
                          checked && "border-primary bg-primary/5",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setClassIds((list) => toggle(list, section.id))
                          }
                        />
                        {sectionLabel(section)}
                      </label>
                    );
                  })}
                </div>
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
                Each subject is scheduled for every section you chose.
              </p>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {subjects.map((subject) => {
                  const checked = subjectIds.includes(subject.id);
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
                        checked={checked}
                        onChange={() =>
                          setSubjectIds((list) => toggle(list, subject.id))
                        }
                      />
                      {subject.name}
                    </label>
                  );
                })}
              </div>
              <FieldError message={errors.subjects} />
              {paperCount > 0 && (
                <p className="mt-3 text-sm" data-testid="paper-count-hint">
                  {classIds.length} sections × {subjectIds.length} subjects ={" "}
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
                  <dd className="font-medium">{subjectIds.length}</dd>
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
