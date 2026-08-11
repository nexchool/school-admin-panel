/**
 * Which year of school a grade's name refers to.
 *
 * A school names its grades after the number of the year — "5", "Std 5",
 * "Grade 5", "Class 5" all mean the same year. The number is therefore the
 * level, and the rest is house style.
 *
 * This matters because a grade can now be created by typing it while opening a
 * section. Two spellings of one year — "6" and "Std 6" — are two rows, both
 * valid, both at the same point in the ladder, and nothing refuses them: the
 * names differ, so the unique-per-tenant index is satisfied. What follows is a
 * school whose promotion and every grade-wise report are split in half.
 *
 * The server infers `sequence` from the same number (`_infer_sequence` in
 * `modules/grades/services.py`), so the two agree on what a level is.
 */
export function levelOf(name: string): number | null {
  const digits = name.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

/**
 * How a grade is written on screen.
 *
 * Schools store the level the short way — "1", "2", "12" — and a bare number
 * in a table column or a picker reads as a quantity rather than a year of
 * school. Only a name that is *nothing but* digits is expanded; anything a
 * school has already spelled out ("Grade 1", "Std 6", "LKG", "Nursery") is
 * left exactly as typed, because that is the school's own wording.
 *
 * Presentation only — the stored name is never rewritten.
 */
export function gradeLabel(name: string): string {
  const trimmed = name.trim();
  return /^\d+$/.test(trimmed) ? `Grade ${trimmed}` : trimmed;
}

/**
 * How a class is written on screen: "Grade 1 · A".
 *
 * A class's identity is its grade and its section, so the label is composed
 * from those two rather than from `name` — that column is a nullable legacy
 * label, empty for every class the structured form has created.
 *
 * `displayName` is the server's own composition ("1 A") and is the fallback
 * for a row that arrived without a grade name, so a class always has
 * *something* to be called.
 */
export function classLabel(row: {
  grade_name?: string | null;
  section?: string | null;
  display_name?: string | null;
  name?: string | null;
  grade_level?: number | null;
}): string {
  const grade =
    (row.grade_name && gradeLabel(row.grade_name)) ||
    (row.grade_level != null ? `Grade ${row.grade_level}` : null);

  if (grade) return row.section ? `${grade} · ${row.section}` : grade;
  return row.display_name || row.name || "—";
}

/**
 * An existing grade that already occupies the level this name would take, or
 * undefined when the level is free (or the name carries no number at all —
 * "LKG" and "Nursery" are levels we cannot infer, so we do not guess).
 */
export function gradeAtSameLevel<T extends { name: string }>(
  name: string,
  grades: readonly T[],
): T | undefined {
  const level = levelOf(name);
  if (level === null) return undefined;
  return grades.find((grade) => levelOf(grade.name) === level);
}
