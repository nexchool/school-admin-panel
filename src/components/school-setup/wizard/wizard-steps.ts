import type { SetupStepKey } from "@/hooks/useSetupStepStatus";

export type WizardStep = {
  key: SetupStepKey;
  number: number;
  title: string;
  /** Compact label used in the step rail. */
  shortTitle: string;
  description: string;
  href: string;
  optional: boolean;
};

export const WIZARD_STEPS: WizardStep[] = [
  { key: "units", number: 1, title: "Branches", shortTitle: "Branches", description: "Configure your school's campuses or branches.", href: "/school-setup/units", optional: false },
  { key: "programmes", number: 2, title: "Academic Programmes", shortTitle: "Programmes", description: "Define the boards and mediums you offer.", href: "/school-setup/programmes", optional: false },
  { key: "grades", number: 3, title: "Grades", shortTitle: "Grades", description: "List the grades or standards your school runs.", href: "/school-setup/grades", optional: false },
  { key: "academic-year", number: 4, title: "Academic Year", shortTitle: "Year", description: "Set the active academic session.", href: "/school-setup/academic-year", optional: false },
  { key: "classes", number: 5, title: "Classes", shortTitle: "Classes", description: "Create class sections for each grade.", href: "/school-setup/classes", optional: false },
  { key: "subjects", number: 6, title: "Subjects", shortTitle: "Subjects", description: "Configure subjects offered at your school.", href: "/school-setup/subjects", optional: false },
  { key: "terms", number: 7, title: "Terms", shortTitle: "Terms", description: "Split your academic year into terms.", href: "/school-setup/terms", optional: true },
  { key: "complete", number: 8, title: "Review & Complete", shortTitle: "Review", description: "Confirm setup and move on.", href: "/school-setup/complete", optional: false },
];

export function getStep(key: SetupStepKey): WizardStep {
  const step = WIZARD_STEPS.find((s) => s.key === key);
  if (!step) throw new Error(`Unknown wizard step: ${key}`);
  return step;
}

export function getNextStep(key: SetupStepKey): WizardStep | null {
  const idx = WIZARD_STEPS.findIndex((s) => s.key === key);
  return idx >= 0 && idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1] : null;
}

export function getPrevStep(key: SetupStepKey): WizardStep | null {
  const idx = WIZARD_STEPS.findIndex((s) => s.key === key);
  return idx > 0 ? WIZARD_STEPS[idx - 1] : null;
}
