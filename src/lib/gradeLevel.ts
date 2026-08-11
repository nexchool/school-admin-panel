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
