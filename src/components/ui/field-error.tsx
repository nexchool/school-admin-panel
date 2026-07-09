/**
 * Inline validation error message for a form field. Renders nothing when there
 * is no error, so it can be dropped under any input unconditionally.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
