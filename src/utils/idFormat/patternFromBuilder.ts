/**
 * Guided ID format UI ↔ backend pattern string (server/shared/id_pattern.py).
 */

export type YearMode = "full" | "short";

export interface IdFormatBuilderState {
  yearBeforeCode: boolean;
  prefix: string;
  sep1: string;
  yearMode: YearMode;
  sep2: string;
  /** 2–6 (UI); backend allows 1–9, we only expose 2–6). */
  digits: number;
}

const DEFAULT_STUDENT: IdFormatBuilderState = {
  yearBeforeCode: false,
  prefix: "ADM",
  sep1: "-",
  yearMode: "full",
  sep2: "-",
  digits: 3,
};

const DEFAULT_TEACHER: IdFormatBuilderState = {
  yearBeforeCode: false,
  prefix: "TCH",
  sep1: "-",
  yearMode: "full",
  sep2: "-",
  digits: 3,
};

export function getDefaultBuilderState(kind: "student" | "teacher"): IdFormatBuilderState {
  return kind === "student" ? { ...DEFAULT_STUDENT } : { ...DEFAULT_TEACHER };
}

const YEAR_TOK: Record<YearMode, string> = {
  full: "{YEAR}",
  short: "{YY}",
};

export function formatBuilderToPattern(s: IdFormatBuilderState): string {
  const Y = YEAR_TOK[s.yearMode];
  const seq = `{SEQ:${s.digits}}`;
  const p = (s.prefix ?? "").replace(/[{}]/g, "");
  const a = (s.sep1 ?? "").slice(0, 1);
  const b = (s.sep2 ?? "").slice(0, 1);
  if (s.yearBeforeCode) {
    return `${Y}${a}${p}${b}${seq}`;
  }
  return `${p}${a}${Y}${b}${seq}`;
}

function splitTrailingSep(s: string): { lit: string; sep: string } {
  if (!s) return { lit: "", sep: "" };
  const last = s[s.length - 1];
  if (last === "-" || last === "/") {
    return { lit: s.slice(0, -1), sep: last };
  }
  return { lit: s, sep: "" };
}

function normalizeSep(c: string): string {
  const t = c.slice(0, 1);
  return t === "-" || t === "/" ? t : "";
}

/**
 * Map saved pattern (or null) to builder. Unknown shapes fall back to defaults + low confidence.
 */
export function patternToBuilder(
  pattern: string | null | undefined,
  kind: "student" | "teacher"
): { state: IdFormatBuilderState; ok: boolean } {
  const d = getDefaultBuilderState(kind);
  if (!pattern || !String(pattern).trim()) {
    return { state: d, ok: true };
  }
  const p = String(pattern).trim();
  const yMatch = p.match(/^(.*?)(\{YEAR\}|\{YY\})(.*)\{SEQ:([1-9])\}$/);
  if (!yMatch) {
    return { state: d, ok: false };
  }
  const beforeY = yMatch[1] ?? "";
  const ytok = yMatch[2];
  const betweenYandSeq = yMatch[3] ?? "";
  const dRaw = yMatch[4];
  const dig = parseInt(dRaw, 10);
  if (Number.isNaN(dig) || dig < 1 || dig > 9) {
    return { state: d, ok: false };
  }
  const digits = Math.min(6, Math.max(2, dig));
  const yearMode: YearMode = ytok === "{YY}" ? "short" : "full";

  if (beforeY === "") {
    const { sep1, prefix, sep2 } = parseYearFirstMiddle(betweenYandSeq, d.prefix);
    return {
      state: {
        yearBeforeCode: true,
        prefix: prefix || d.prefix,
        sep1: normalizeSep(sep1),
        yearMode,
        sep2: normalizeSep(sep2),
        digits,
      },
      ok: true,
    };
  }
  const b0 = splitTrailingSep(beforeY);
  return {
    state: {
      yearBeforeCode: false,
      prefix: b0.lit || d.prefix,
      sep1: normalizeSep(b0.sep),
      yearMode,
      sep2: normalizeSep(betweenYandSeq),
      digits,
    },
    ok: true,
  };
}

/**
 * `middle` is between {YEAR} and {SEQ}, e.g. "-ADM-" or "-ADM" or "ADM-"
 */
function parseYearFirstMiddle(
  middle: string,
  defaultPrefix: string
): { sep1: string; prefix: string; sep2: string } {
  if (!middle) {
    return { sep1: "", prefix: defaultPrefix, sep2: "" };
  }
  const a = middle[0] === "-" || middle[0] === "/" ? middle[0] : "";
  const rest = a ? middle.slice(1) : middle;
  const b = splitTrailingSep(rest);
  return { sep1: a, prefix: b.lit, sep2: b.sep };
}

export function renderSampleId(pattern: string, year: number, seq: number): string {
  const m = pattern.match(/^(.*)\{SEQ:([1-9])\}$/);
  if (!m) return "";
  const before = m[1];
  const w = parseInt(m[2], 10);
  if (Number.isNaN(w) || seq < 0 || seq >= 10 ** w) return "";
  const body = before
    .replace(/\{YEAR\}/g, String(year))
    .replace(/\{YY\}/g, String(year).slice(-2));
  return body + String(seq).padStart(w, "0");
}

const MAX_LEN = 20;

export function validateBuilderPatternClient(pattern: string): string | null {
  const p = pattern.trim();
  if (!p) return "Format cannot be empty.";
  if (!p.includes("{SEQ:")) {
    return "A running number is required at the end.";
  }
  if (!/\{YEAR\}|\{YY\}/.test(p)) {
    return "The year must be part of the ID.";
  }
  const m = p.match(/^(.*)\{SEQ:([1-9])\}$/);
  if (!m) return "Check the number at the end of the format.";
  const w = parseInt(m[2], 10);
  if (w < 2 || w > 6) {
    return "Use 2 to 6 digits for the running number.";
  }
  const y = new Date().getFullYear();
  const a = renderSampleId(p, y, 1);
  const b = renderSampleId(p, y, 10 ** w - 1);
  for (const s of [a, b]) {
    if (s && s.length > MAX_LEN) {
      return `That would create IDs longer than ${MAX_LEN} characters. Shorter code or fewer digits.`;
    }
  }
  return null;
}
