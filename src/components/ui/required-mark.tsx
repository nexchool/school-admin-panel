/**
 * Red asterisk marking a form field as mandatory. Sits next to the label text.
 *
 * The asterisk itself is decorative — screen readers get the requirement from
 * the input's own `aria-required`/`required`, so announcing "star" as well
 * would only add noise.
 */
export function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}
