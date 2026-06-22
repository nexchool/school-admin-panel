/**
 * Whether the legacy self-serve School Setup wizard is enabled in the UI.
 *
 * Default OFF — tenants are onboarded via the backend seed script
 * (server/scripts/seed_school.py). Set NEXT_PUBLIC_ENABLE_SCHOOL_SETUP=true
 * (e.g. in dev) to re-enable the wizard and its in-app entry points.
 *
 * NEXT_PUBLIC_* is inlined at build time, so changing it requires a rebuild.
 */
export function isSchoolSetupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SCHOOL_SETUP === "true";
}
