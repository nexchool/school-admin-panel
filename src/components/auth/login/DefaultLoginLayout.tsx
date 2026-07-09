import { GraduationCap } from "lucide-react";
import { SchoolBrandName } from "@/components/layout/SchoolBrandName";
import type { TenantBranding } from "@/services/authService";

export interface LoginLayoutProps {
  branding: TenantBranding | null;
  /** The form panel content (email/password form or tenant-choice UI). */
  children: React.ReactNode;
}

const DEFAULT_WELCOME = "Welcome back. Sign in to manage your school.";

function LogoMark({ branding, size }: { branding: TenantBranding | null; size: "sm" | "lg" }) {
  const box = size === "lg" ? "size-12 rounded-2xl" : "size-9 rounded-xl";
  const icon = size === "lg" ? "size-6" : "size-5";
  if (branding?.logo_url) {
    return (
      <img
        src={branding.logo_url}
        alt={branding?.name ? `${branding.name} logo` : "School logo"}
        className={`${box} bg-primary-foreground/10 object-contain p-1`}
      />
    );
  }
  return (
    <div
      className={`${box} flex items-center justify-center bg-primary-foreground/15 text-primary-foreground`}
    >
      <GraduationCap className={icon} aria-hidden="true" />
    </div>
  );
}

/**
 * Default login layout: a split-screen with a brand panel beside the sign-in
 * form. On desktop the brand panel fills the left column; on mobile it collapses
 * to a compact header band above the form so no branding is lost.
 */
export function DefaultLoginLayout({ branding, children }: LoginLayoutProps) {
  const name = branding?.name ?? null;
  const welcome = branding?.tagline?.trim() || DEFAULT_WELCOME;

  return (
    <div className="min-h-screen w-full bg-background md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="bg-primary text-primary-foreground">
        {/* Desktop brand panel */}
        <div className="hidden h-full flex-col justify-between p-10 md:flex lg:p-14">
          <LogoMark branding={branding} size="lg" />
          <div className="space-y-3">
            <SchoolBrandName
              name={name}
              lineClamp={3}
              className="text-3xl font-semibold tracking-tight"
            />
            <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/80">
              {welcome}
            </p>
          </div>
          <p className="text-xs text-primary-foreground/60">Powered by Nexchool</p>
        </div>

        {/* Mobile compact brand band */}
        <div className="flex items-center gap-3 px-6 py-5 md:hidden">
          <LogoMark branding={branding} size="sm" />
          <SchoolBrandName
            name={name}
            lineClamp={1}
            className="text-lg font-semibold tracking-tight"
          />
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 md:min-h-screen md:p-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
