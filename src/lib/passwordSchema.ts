import { z } from "zod";

/** Minimum length required for a new password. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * A single new-password field: at least {@link PASSWORD_MIN_LENGTH} chars and
 * at least one digit. Mirrors the backend's weak-password rule so the client
 * rejects obviously weak passwords before a round-trip.
 */
export const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/\d/, "Password must contain at least one number");

/**
 * new_password + confirm_password with a cross-field match check. The mismatch
 * error is attached to `confirm_password` so it renders next to that field.
 */
export const setPasswordSchema = z
  .object({
    new_password: newPasswordField,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
