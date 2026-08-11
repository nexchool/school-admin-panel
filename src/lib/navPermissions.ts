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
export const ROUTE_PERMISSIONS = {
  "/academics": ["academics.read", "academics.manage"],
  "/academics/calendar": ["academic_calendar.read", "academic_calendar.manage"],
  // Terms answer to their own authority, not the calendar's — a person may
  // hold one without the other, which is why this is not folded into
  // "/academics".
  "/academics/terms": ["academic_term.read", "academic_term.manage"],
  // Exactly the set `GET /api/academics/bell-schedules` accepts. Listing
  // `timetable.read` here as well would read sensibly and put a link in front
  // of somebody the route then refuses.
  "/academics/bell-schedules": [
    "academics.read",
    "academics.manage",
    "timetable.manage",
  ],
  // The structural catalogues a class is composed from. Each keeps its own
  // authority for the same reason their mutations do: a school may let
  // somebody name a grade without letting them open a campus.
  "/grades": ["grade.read", "grade.manage"],
  "/programmes": ["programme.read", "programme.manage"],
  "/settings": ["academics.read", "academics.manage"],
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
  "/subjects": ["subject.read", "subject.manage"],
  "/departments": ["department.read", "department.manage"],
  "/timetable": ["timetable.read", "timetable.manage"],
  // Deciding on a correction is the register-owner's job, not a marker's.
  "/attendance/corrections": ["attendance.manage"],
  // Combining records rewrites which human the school's data refers to, so it
  // carries its own key rather than riding on a general admin permission.
  "/settings/duplicates": ["person.merge"],
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
  "/dashboard/transport": TRANSPORT_NAV_PERMS,
  "/holidays": ["holiday.read", "holiday.manage"],
  "/announcements": [
    "announcement.read.all",
    "announcement.read.own",
    "announcement.create",
    "announcement.update",
    "announcement.recall",
  ],
  "/hostel": ["hostel.read", "hostel.manage"],
  "/school-units": ["school_unit.read", "school_unit.manage"],
  "/sub-admins": ["subadmin.manage"],
  "/audit-log": ["audit_log.view"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Return the permission list for the longest-matching known route prefix, or
 * `null` when the route isn't present in `ROUTE_PERMISSIONS`.
 *
 * Longest-match matters: `/dashboard/finance` and `/dashboard/transport` must
 * resolve to their own permission sets before the bare `/dashboard`.
 *
 * Routes absent from the map — `/dashboard`, `/profile`, `/help`, and other
 * secondary/unlinked routes — intentionally resolve to `null` and are treated
 * as ungated at the UI layer. (`/school-setup/*` IS gated — see the map.) The backend
 * still enforces permissions on every request (defense-in-depth); this map only
 * decides what the client hides/redirects.
 */
export function requiredPermissionsForPath(
  pathname: string,
): readonly string[] | null {
  // Longest known route prefix wins (handles nested /dashboard/* routes).
  let bestMatch: { prefix: string; perms: readonly string[] } | null = null;
  for (const [prefix, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches && (!bestMatch || prefix.length > bestMatch.prefix.length)) {
      bestMatch = { prefix, perms };
    }
  }
  if (bestMatch) return bestMatch.perms;

  // Unknown / unguarded route — backend remains the enforcement boundary.
  return null;
}
