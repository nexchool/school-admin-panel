/**
 * Pure decision helpers for branch (school-unit) scoping in the UI.
 *
 * The backend already limits `GET /api/school-units/` to the caller's allowed
 * units, so the switcher naturally lists only allowed branches. These helpers
 * add the "lock to a single branch" behaviour and resolve the default active
 * unit, mirroring the Phase 2 contract:
 *   - `allowedUnitIds === null` → unrestricted (full School Admin / platform).
 *   - a non-empty array → the user is restricted to those branches.
 */

export interface BranchUnitLike {
  id: string;
  status: "active" | "inactive";
}

/**
 * A restricted user with exactly one available branch should not see a
 * one-option switcher. We treat "restricted to one" as either:
 *   - `allowedUnitIds` is a length-1 array, OR
 *   - the user is restricted (non-null `allowedUnitIds`) and the visible units
 *     list has length 1.
 *
 * Unrestricted users (`allowedUnitIds === null`) are never locked here — the
 * switcher's own "hide when ≤1 unit" rule still applies to them.
 */
export function isLockedToSingleBranch(
  allowedUnitIds: string[] | null,
  units: { id: string }[]
): boolean {
  if (allowedUnitIds === null) return false;
  if (allowedUnitIds.length === 1) return true;
  return units.length === 1;
}

/**
 * Resolve the active unit id to default to. Prefers `defaultUnitId` when it is
 * within the allowed/visible set, else the first active unit, else the first
 * unit. Returns null when there are no units.
 */
export function resolveDefaultUnitId(
  allowedUnitIds: string[] | null,
  units: BranchUnitLike[],
  defaultUnitId?: string | null
): string | null {
  if (units.length === 0) return null;

  // Units list is already backend-limited to allowed units; intersect with the
  // explicit allow-list too as defense in depth for restricted users.
  const allowed =
    allowedUnitIds === null
      ? units
      : units.filter((u) => allowedUnitIds.includes(u.id));
  const pool = allowed.length > 0 ? allowed : units;

  if (defaultUnitId && pool.some((u) => u.id === defaultUnitId)) {
    return defaultUnitId;
  }
  return pool.find((u) => u.status === "active")?.id ?? pool[0].id;
}
