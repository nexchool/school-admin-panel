/**
 * The modules a school can be without.
 *
 * Mirrors `OPTIONAL_FEATURES` in `server/core/feature_flags.py`. Each one is
 * something a real school either does or does not do — it has buses or it
 * does not, it keeps fees here or in the accountant's software. Everything
 * else is the product and is not offered as a switch.
 *
 * Kept as a list rather than left implicit so `optionalModules.test.ts` can
 * hold the UI to it: every module here has to have a page-level gate, or a
 * school that switched it off is still shown the door and only finds out it
 * is locked after walking through it.
 */
export const OPTIONAL_MODULES = [
  "attendance",
  "fees_management",
  "timetable",
  "transport",
  "hostel",
  "notifications",
  "academic_calendar",
] as const;

export type OptionalModule = (typeof OPTIONAL_MODULES)[number];
