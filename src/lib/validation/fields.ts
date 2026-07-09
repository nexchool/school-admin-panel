/**
 * Central, reusable Zod field validators.
 *
 * Every form in admin-web (Student / Teacher / Class …) builds its schema from
 * these primitives so validation rules and error messages stay consistent in
 * one place. Mirror any rule change in the backend at
 * server/core/validation.py.
 *
 * Convention: text inputs submit "" when empty, so optional validators treat ""
 * as "no value" and required validators reject "".
 */
import { z } from "zod";

/** Shared patterns (kept identical to the backend regexes). */
export const PATTERNS = {
  // Indian mobile: 10 digits starting 6-9, optional +91 prefix.
  phone: /^(?:\+91[\s-]?)?[6-9]\d{9}$/,
  aadhar: /^\d{12}$/,
  pincode: /^\d{6}$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
} as const;

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || typeof v === "undefined" ? undefined : v;

// ---- Strings -------------------------------------------------------------

export const requiredString = (label = "This field") =>
  z.string().trim().min(1, `${label} is required`);

export const optionalString = z.string().trim().optional().or(z.literal(""));

/** Bounded optional string (e.g. codes with a real max length). */
export const optionalStringMax = (max: number, label = "This field") =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().or(z.literal(""));

// ---- Email ---------------------------------------------------------------

export const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""));

export const requiredEmail = (label = "Email") =>
  z.string().trim().min(1, `${label} is required`).email("Enter a valid email address");

// ---- Phone (Indian mobile) ----------------------------------------------

const phoneMsg = "Enter a valid 10-digit mobile number";

export const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || PATTERNS.phone.test(v), phoneMsg)
  .optional()
  .or(z.literal(""));

export const requiredPhone = (label = "Phone") =>
  z.string().trim().min(1, `${label} is required`).regex(PATTERNS.phone, phoneMsg);

/**
 * Lenient phone for secondary contacts (parents / emergency) that may be
 * landlines with STD codes: 10–15 digits, optional +, spaces or dashes.
 */
const looseDigits = (v: string) => v.replace(/\D/g, "");
export const optionalPhoneLoose = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (looseDigits(v).length >= 10 && looseDigits(v).length <= 15),
    "Enter a valid phone number"
  )
  .optional()
  .or(z.literal(""));

// ---- Government IDs ------------------------------------------------------

export const optionalAadhar = z
  .string()
  .trim()
  .refine((v) => v === "" || PATTERNS.aadhar.test(v), "Aadhaar must be 12 digits")
  .optional()
  .or(z.literal(""));

export const optionalPincode = z
  .string()
  .trim()
  .refine((v) => v === "" || PATTERNS.pincode.test(v), "PIN code must be 6 digits")
  .optional()
  .or(z.literal(""));

// ---- Numbers -------------------------------------------------------------

const coerceNumber = (label: string) =>
  z.coerce.number({ message: `Enter a valid number for ${label}` }).refine(
    (n) => !Number.isNaN(n),
    `Enter a valid number for ${label}`
  );

export const optionalNumber = (label = "value") =>
  z.preprocess(emptyToUndefined, coerceNumber(label).optional()).optional() as z.ZodType<
    number | undefined
  >;

export const optionalNumberInRange = (min: number, max: number, label = "value") =>
  z.preprocess(
    emptyToUndefined,
    coerceNumber(label)
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .optional()
  ).optional() as z.ZodType<number | undefined>;

export const optionalNonNegativeNumber = (label = "value") =>
  z.preprocess(
    emptyToUndefined,
    coerceNumber(label).min(0, `${label} cannot be negative`).optional()
  ).optional() as z.ZodType<number | undefined>;

// ---- Dates (YYYY-MM-DD) --------------------------------------------------

export const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || PATTERNS.isoDate.test(v), "Use the date format YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

// ---- Booleans ------------------------------------------------------------

export const optionalBoolean = z
  .preprocess((v) => {
    if (v === "" || v == null) return undefined;
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return v;
  }, z.boolean())
  .optional() as z.ZodType<boolean | undefined>;

// ---- Enums / allow-listed values ----------------------------------------

/** Optional value that, when present, must be one of the allowed values. */
export const optionalEnum = (values: readonly string[], label = "value") =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || values.includes(v), `Select a valid ${label}`)
    .optional()
    .or(z.literal(""));
