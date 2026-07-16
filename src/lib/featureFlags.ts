/**
 * The self-serve School Setup wizard has been removed from admin-web — onboarding
 * is now an operator task in the super-admin panel (control-plane split). This
 * always returns false so the remaining in-app entry points (a few "Back to
 * setup" CTAs) never render. The dead CTA markup + this shim can be swept later.
 */
export function isSchoolSetupEnabled(): boolean {
  return false;
}
