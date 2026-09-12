/**
 * Timestamp display, pinned to the school's clock rather than the browser's.
 *
 * The API sends instants in UTC with the offset attached (`+00:00`) — correct
 * storage, and `new Date(iso)` reads it correctly. What it does not fix is
 * *display*: `toLocaleString()` and `Intl.DateTimeFormat` render in whatever
 * zone the browser is set to, so an administrator on a laptop that lives in
 * another zone (or travelling) read every "published at", "paid at" and
 * "checked in at" in that zone. Every school on the platform is in India.
 *
 * This is for instants only. A calendar date — an attendance day, a holiday, a
 * due date — is a `YYYY-MM-DD` string with no zone, and the pages that show
 * those build a `Date` from its parts and format it locally on purpose. Do not
 * route those through here.
 */

/**
 * Where the tenant's `timezone` column will plug in once the session payload
 * carries it; today the server defaults every school to this same zone.
 */
export const SCHOOL_TIMEZONE = "Asia/Kolkata";

const LOCALE = "en-IN";
const tz = { timeZone: SCHOOL_TIMEZONE } as const;

const dateFmt = new Intl.DateTimeFormat(LOCALE, { ...tz, day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { ...tz, hour: "numeric", minute: "2-digit", hour12: true });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { ...tz, dateStyle: "medium", timeStyle: "short" });
const dateTimeFullFmt = new Intl.DateTimeFormat(LOCALE, { ...tz, dateStyle: "full", timeStyle: "short" });

type DateInput = string | Date | null | undefined;

// Calendar dates as `YYYY-MM-DD`, the shape the API speaks for a school day.
const isoDayFmt = new Intl.DateTimeFormat("en-CA", { ...tz, year: "numeric", month: "2-digit", day: "2-digit" });
const isoMonthFmt = new Intl.DateTimeFormat("en-CA", { ...tz, year: "numeric", month: "2-digit" });

/**
 * Today's date *at the school*, as `YYYY-MM-DD`.
 *
 * `new Date().toISOString().slice(0, 10)` — the idiom this replaces — is the
 * UTC date, in every browser, everywhere. At 02:30 on a Saturday in India it
 * says Friday, so a date filter defaulting to "today" excluded today, and an
 * enrolment effective from "today" started yesterday. Use this for any
 * "today" that is about the school day.
 */
export function schoolTodayIso(): string {
  return isoDayFmt.format(new Date());
}

/** This month at the school, as `YYYY-MM`. */
export function schoolMonthIso(): string {
  return isoMonthFmt.format(new Date());
}

const wallClockFmt = new Intl.DateTimeFormat("en-CA", {
  ...tz, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/**
 * An instant as the wall-clock the school would read off it, in the shape a
 * `<input type="datetime-local">` wants: `YYYY-MM-DDTHH:mm`.
 */
export function toSchoolWallClock(value: DateInput): string {
  const d = parse(value);
  if (!d) return "";
  const parts = Object.fromEntries(wallClockFmt.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * A wall-clock time typed for the school (`YYYY-MM-DDTHH:mm`) as the instant
 * it names, in ISO with `Z`.
 *
 * `new Date("2026-09-13T10:00")` — the idiom this replaces — reads the string
 * in the *browser's* zone, so an administrator on a laptop set to anything
 * but India scheduled the announcement for 10:00 wherever they were. The
 * zone's offset at that moment is measured rather than assumed, which is what
 * keeps this correct for a zone that observes daylight saving.
 */
export function schoolWallClockToIso(wall: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!m) return "";
  const [, y, mo, d, h, mi] = m.map(Number);
  const asIfUtc = Date.UTC(y, mo - 1, d, h, mi);
  // What the school's clock reads at that UTC instant tells us the offset.
  const seen = toSchoolWallClock(new Date(asIfUtc));
  const sm = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(seen);
  if (!sm) return "";
  const [, sy, smo, sd, sh, smi] = sm.map(Number);
  const offsetMs = Date.UTC(sy, smo - 1, sd, sh, smi) - asIfUtc;
  return new Date(asIfUtc - offsetMs).toISOString();
}

/** `iso` plus `delta` days, done in UTC so no zone can move it. */
export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function parse(value: DateInput): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `12 Sept 2026` */
export function formatDate(value: DateInput): string {
  const d = parse(value);
  return d ? dateFmt.format(d) : "—";
}

/** `4:32 pm` */
export function formatTime(value: DateInput): string {
  const d = parse(value);
  return d ? timeFmt.format(d) : "—";
}

/** `12 Sept 2026, 4:32 pm` */
export function formatDateTime(value: DateInput): string {
  const d = parse(value);
  return d ? dateTimeFmt.format(d) : "—";
}

/** `Saturday, 12 September 2026 at 4:32 pm` — a detail page's headline stamp. */
export function formatDateTimeFull(value: DateInput): string {
  const d = parse(value);
  return d ? dateTimeFullFmt.format(d) : "—";
}
