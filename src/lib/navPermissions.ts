/**
 * Single source of truth for route → required-permission gating.
 *
 * Semantics mirror `hasAnyPermission`: a user needs ANY one of the listed
 * permissions to see the nav item / enter the route. Each module's list
 * includes its `.manage` permission so the seeded "Admin" role (which holds all
 * `<resource>.manage` perms) always passes — `hasPermission` treats
 * `<resource>.manage` as a superset and `system.manage` as a global superuser.
 *
 * Aligns with the backend sub-admin catalog
 * (`server/modules/sub_admins/catalog.py`).
 */

/**
 * Transport requires more than a single coarse read, so it keeps its own perm
 * set (shared with the Sidebar's transport gating to avoid drift).
 */
export const TRANSPORT_NAV_PERMS = [
  "transport.buses.read",
  "transport.enrollment.read",
  "transport.dashboard.read",
  "transport.drivers.manage",
  "transport.routes.manage",
  "transport.assignments.manage",
] as const;

/**
 * Map of route path → permissions (ANY-of). Each module includes its `.manage`
 * perm so the main Admin always passes.
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/academics": ["academics.read", "academics.manage"],
  "/students": [
    "student.read.all",
    "student.read.class",
    "student.create",
    "student.update",
    "student.delete",
    "student.manage",
  ],
  "/teachers": [
    "teacher.read",
    "teacher.create",
    "teacher.update",
    "teacher.delete",
    "teacher.manage",
  ],
  "/classes": ["class.read", "class.manage"],
  "/timetable": ["timetable.read", "timetable.manage"],
  "/attendance": [
    "attendance.read.all",
    "attendance.read.class",
    "attendance.mark",
    "attendance.manage",
  ],
  // More specific than the bare "/dashboard" — must be matched first.
  "/dashboard/finance": [
    "finance.read",
    "finance.collect",
    "finance.refund",
    "finance.manage",
    "fees.invoice.read",
    "fees.invoice.create",
    "fees.payment.record",
  ],
  "/dashboard/transport": [...TRANSPORT_NAV_PERMS],
  "/holidays": ["holiday.read", "holiday.manage"],
  "/announcements": [
    "announcement.read.all",
    "announcement.read.own",
    "announcement.create",
    "announcement.update",
    "announcement.recall",
  ],
  "/hostel": ["hostel.read", "hostel.manage"],
  "/sub-admins": ["subadmin.manage"],
  "/audit-log": ["audit_log.view"],
};

/**
 * Routes that require no permission — always allowed for any authenticated
 * user. The school-setup flow keeps its own special handling in the Sidebar and
 * must never be gated/redirected here.
 */
const ALWAYS_ALLOWED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/help",
  "/school-setup",
] as const;

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Return the permission list for the longest-matching known route prefix, or
 * `null` when the route is unguarded / always-allowed.
 *
 * Longest-match matters: `/dashboard/finance` and `/dashboard/transport` must
 * resolve to their own permission sets before the always-allowed `/dashboard`.
 */
export function requiredPermissionsForPath(pathname: string): string[] | null {
  // Longest known route prefix wins (handles nested /dashboard/* routes).
  let bestMatch: { prefix: string; perms: string[] } | null = null;
  for (const [prefix, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches && (!bestMatch || prefix.length > bestMatch.prefix.length)) {
      bestMatch = { prefix, perms };
    }
  }
  if (bestMatch) return bestMatch.perms;

  // No guarded prefix matched — allow if it's an always-allowed route,
  // otherwise treat unknown routes as unguarded (null) too.
  if (isAlwaysAllowed(pathname)) return null;
  return null;
}
