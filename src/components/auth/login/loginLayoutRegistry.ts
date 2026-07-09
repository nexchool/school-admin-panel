import type { ComponentType } from "react";
import { DefaultLoginLayout, type LoginLayoutProps } from "./DefaultLoginLayout";

/**
 * Maps a tenant's `login_variant` (from the public branding response) to a login
 * layout component. Only "default" ships today; a bespoke school gets its own
 * component registered under its variant key and its `feature_flags.login_variant`
 * set to that key — with no effect on other tenants.
 */
const LOGIN_LAYOUTS: Record<string, ComponentType<LoginLayoutProps>> = {
  default: DefaultLoginLayout,
};

/** Resolve the layout for a variant, falling back to the default for unknown keys. */
export function resolveLoginLayout(
  variant?: string
): ComponentType<LoginLayoutProps> {
  return (variant && LOGIN_LAYOUTS[variant]) || DefaultLoginLayout;
}
