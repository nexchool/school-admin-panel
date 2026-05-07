import type { ClassItem } from "@/types/class";

/** Top grade that maps to GRADUATED in auto-map (`g >= this`). Default 12. */
export const DEFAULT_GRADUATING_GRADE = 12;

/** Parse a grade/standard number from common Indian school class labels. */
export function extractGradeFromName(name: string): number | null {
  const n = name.trim();
  if (!n) return null;
  const m1 = n.match(
    /(?:^|\s)(?:grade|class|std|standard)\s*[:\-]?\s*(\d{1,2})(?:\s|$)/i
  );
  if (m1) return parseInt(m1[1], 10);
  const m2 = n.match(/^(\d{1,2})\s*$/);
  if (m2) return parseInt(m2[1], 10);
  const m3 = n.match(/(\d{1,2})/);
  return m3 ? parseInt(m3[1], 10) : null;
}

export function effectiveGrade(c: ClassItem): number | null {
  if (c.grade_level != null && c.grade_level !== undefined) {
    return Number(c.grade_level);
  }
  return extractGradeFromName(c.name);
}

function normSection(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Next-year class: same section, grade_level + 1 (or parsed name + 1).
 */
export function findPromotedClass(
  from: ClassItem,
  nextYearClasses: ClassItem[]
): ClassItem | undefined {
  const g = effectiveGrade(from);
  const sec = normSection(from.section);
  if (g == null) return undefined;
  const targetGrade = g + 1;
  return nextYearClasses.find((t) => {
    const tg = effectiveGrade(t);
    return tg === targetGrade && normSection(t.section) === sec;
  });
}

/**
 * Parallel class after copy: same display name + section in the next year.
 */
export function findParallelClass(
  from: ClassItem,
  nextYearClasses: ClassItem[]
): ClassItem | undefined {
  const sec = normSection(from.section);
  const name = from.name.trim().toLowerCase();
  return nextYearClasses.find(
    (t) => t.name.trim().toLowerCase() === name && normSection(t.section) === sec
  );
}

/**
 * Same numeric grade + same section in the target year (repeat year / parallel section).
 */
export function findSameGradeSameSection(
  from: ClassItem,
  toYearClasses: ClassItem[]
): ClassItem | undefined {
  const g = effectiveGrade(from);
  const sec = normSection(from.section);
  if (g == null) return findParallelClass(from, toYearClasses);
  return toYearClasses.find((t) => {
    const tg = effectiveGrade(t);
    return tg === g && normSection(t.section) === sec;
  });
}

export interface AutoMapClassesOptions {
  /**
   * Students in this grade (and higher, if any) are treated as graduating.
   * Default 12 (e.g. Grade 12 → GRADUATED). Use 10 if your highest class is 10.
   */
  graduatingGrade?: number;
}

export interface AutoMapClassesResult {
  /** `from_class_id` → `to_class_id` or `"GRADUATED"`. Omits unmapped from-class ids. */
  mapping: Record<string, string>;
  /** From-class ids with no matching target in `to_year`. */
  unmappedClassIds: string[];
}

export type MappingSelectionValue =
  | { kind: "class"; classId: string }
  | { kind: "graduated" }
  | { kind: "repeat" };

/**
 * Auto-map each from-year class to a to-year class for promotion.
 *
 * 1. Parse grade from `grade_level` or name (e.g. "Grade 5 A" → 5).
 * 2. If grade ≥ graduatingGrade → GRADUATED.
 * 3. Else match next grade = current + 1 with same section.
 * 4. Else fallback: same grade + same section (repeat).
 * 5. If no grade in name: try parallel name+section; else unmapped.
 */
export function autoMapClassesBetweenYears(
  fromClasses: ClassItem[],
  toYearClasses: ClassItem[],
  options?: AutoMapClassesOptions
): AutoMapClassesResult {
  const graduatingGrade =
    options?.graduatingGrade ?? DEFAULT_GRADUATING_GRADE;
  const mapping: Record<string, string> = {};
  const unmappedClassIds: string[] = [];

  for (const from of fromClasses) {
    const g = effectiveGrade(from);

    if (g == null) {
      const parallel = findParallelClass(from, toYearClasses);
      if (parallel) mapping[from.id] = parallel.id;
      else unmappedClassIds.push(from.id);
      continue;
    }

    if (g >= graduatingGrade) {
      mapping[from.id] = "GRADUATED";
      continue;
    }

    const promoted = findPromotedClass(from, toYearClasses);
    if (promoted) {
      mapping[from.id] = promoted.id;
      continue;
    }

    const repeat = findSameGradeSameSection(from, toYearClasses);
    if (repeat) {
      mapping[from.id] = repeat.id;
      continue;
    }

    unmappedClassIds.push(from.id);
  }

  return { mapping, unmappedClassIds };
}

/**
 * Turn API-style promotion map into UI selection state.
 * Pass only resolved entries, or a full map including GRADUATED / class ids.
 */
export function promotionMappingToSelections(
  apiMapping: Record<string, string>,
  fromClasses: ClassItem[]
): Record<string, MappingSelectionValue | null> {
  const out: Record<string, MappingSelectionValue | null> = {};
  for (const c of fromClasses) {
    const v = apiMapping[c.id];
    if (!v) out[c.id] = null;
    else if (v === "GRADUATED") out[c.id] = { kind: "graduated" };
    else out[c.id] = { kind: "class", classId: v };
  }
  return out;
}

export function selectionToApiValue(
  sel: MappingSelectionValue | null,
  fromClass: ClassItem,
  copyMap: Record<string, string> | null,
  nextYearClasses: ClassItem[]
): string | null {
  if (!sel) return null;
  if (sel.kind === "graduated") return "GRADUATED";
  if (sel.kind === "repeat") {
    if (copyMap?.[fromClass.id]) return copyMap[fromClass.id];
    const p = findParallelClass(fromClass, nextYearClasses);
    return p?.id ?? null;
  }
  return sel.classId;
}
