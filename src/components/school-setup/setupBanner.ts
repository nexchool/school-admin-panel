/**
 * Pure decision helper for the SetupGate banner. Decides which persona-specific
 * banner (if any) to show based only on auth-context flags — no network, no DOM.
 * Kept side-effect-free so it can be unit-tested in isolation.
 *
 * Note: for a platform super-admin the `isSetupComplete` flag is intentionally
 * NOT consulted here — they get the detailed, per-step actionable flow driven by
 * the live status query, so the gate always routes them to `"actionable"`. The
 * caller then decides whether the live status actually warrants showing it.
 */
export type SetupBannerKind =
  | "actionable" // platform super-admin: "Continue setup →"
  | "admin-contact" // school admin: contact support
  | "subadmin-contact" // sub-admin: contact your administrator
  | "none";

export function setupBannerFor(flags: {
  isPlatformAdmin: boolean;
  isSubAdmin: boolean;
  isSetupComplete: boolean;
}): SetupBannerKind {
  const { isPlatformAdmin, isSubAdmin, isSetupComplete } = flags;

  // Super-admin always drives the actionable per-step flow (status query decides
  // the live completeness downstream).
  if (isPlatformAdmin) return "actionable";

  // Non-super-admins rely on the auth-context flag (no gated status call).
  if (isSetupComplete) return "none";

  if (isSubAdmin) return "subadmin-contact";
  return "admin-contact";
}
