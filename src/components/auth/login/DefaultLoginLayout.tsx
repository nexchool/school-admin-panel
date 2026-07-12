import { GraduationCap, ShieldCheck, LifeBuoy } from "lucide-react";
import type { TenantBranding } from "@/services/authService";
import { SUPPORT_EMAIL } from "@/lib/externalLinks";
import { SchoolIllustration } from "./SchoolIllustration";

export interface LoginLayoutProps {
  branding: TenantBranding | null;
  /** The form panel content (email/password form or tenant-choice UI). */
  children: React.ReactNode;
}

const FORM_BG = "#f4f5fb";
const DEFAULT_TAGLINE = "Simplify · Manage · Educate";
const DEFAULT_DESCRIPTION =
  "A complete platform to manage your school efficiently and empower education.";

/** School name with the last word accented, echoing the reference design. */
function BrandTitle({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return <>{name}</>;
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(" ");
  return (
    <>
      {head} <span className="text-blue-300">{last}</span>
    </>
  );
}

function LogoMark({ branding, size }: { branding: TenantBranding | null; size: "sm" | "lg" }) {
  const box = size === "lg" ? "size-14 rounded-2xl" : "size-9 rounded-xl";
  const icon = size === "lg" ? "size-7" : "size-5";
  if (branding?.logo_url) {
    return (
      <img
        src={branding.logo_url}
        alt={branding?.name ? `${branding.name} logo` : "School logo"}
        className={`${box} bg-white/10 object-contain p-1.5 ring-1 ring-white/15`}
      />
    );
  }
  return (
    <div
      className={`${box} flex items-center justify-center bg-blue-500 text-white shadow-lg shadow-blue-900/40 ring-1 ring-white/15`}
    >
      <GraduationCap className={icon} aria-hidden="true" />
    </div>
  );
}

/** Decorative, non-interactive brand-panel flourishes (dot grid + soft arcs). */
function PanelDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute right-8 top-8 h-28 w-40 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="absolute -bottom-24 -right-24 size-80 rounded-full border border-white/10" />
      <div className="absolute -bottom-10 right-10 size-56 rounded-full border border-white/10" />
    </div>
  );
}

/**
 * Default login layout: a split-screen with a rich gradient brand panel beside a
 * floating sign-in card, joined by a wavy seam on desktop. On mobile the brand
 * panel becomes a wavy gradient header above the card.
 */
export function DefaultLoginLayout({ branding, children }: LoginLayoutProps) {
  const name = branding?.name?.trim() || "School";
  const tagline = branding?.tagline?.trim() || DEFAULT_TAGLINE;
  const year = new Date().getFullYear();

  const panelGradient =
    "bg-[linear-gradient(150deg,#12163a_0%,#1e2a6e_50%,#3730a3_100%)] text-white";

  return (
    <div
      className="min-h-screen w-full overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      style={{ backgroundColor: FORM_BG }}
    >
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <aside className={`relative ${panelGradient}`}>
        <PanelDecor />

        {/* Desktop */}
        <div className="relative hidden h-full flex-col justify-between p-10 md:flex lg:p-14">
          <LogoMark branding={branding} size="lg" />
          <div className="space-y-5">
            <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              <BrandTitle name={name} />
            </h1>
            <div>
              <p className="text-lg font-medium text-blue-100/90">{tagline}</p>
              <div className="mt-3 h-1 w-12 rounded-full bg-blue-400" />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-blue-100/70">
              {DEFAULT_DESCRIPTION}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-100/80">
            <ShieldCheck className="size-4 text-blue-300" aria-hidden="true" />
            <span>Secure · Reliable · Trusted</span>
          </div>
        </div>

        {/* Mobile: logo + name with a wavy bottom edge */}
        <div className="relative flex items-center gap-3 px-6 pb-20 pt-7 md:hidden">
          <LogoMark branding={branding} size="sm" />
          <h1 className="text-xl font-bold tracking-tight">
            <BrandTitle name={name} />
          </h1>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 375 70"
          preserveAspectRatio="none"
          className="absolute -bottom-px left-0 h-[70px] w-full md:hidden"
        >
          <path
            d="M0 28 C70 2 140 2 210 26 C275 48 320 48 375 24"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2.5"
          />
          <path
            d="M0 40 C70 14 140 14 210 38 C275 60 320 60 375 36 L375 70 L0 70 Z"
            fill={FORM_BG}
          />
        </svg>
      </aside>

      {/* ── Form panel ──────────────────────────────────────────────── */}
      <main className="relative flex flex-col items-center justify-center gap-6 px-6 pb-10 pt-2 md:min-h-screen md:p-10">
        {/* Wavy seam over the brand panel (desktop only) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 90 600"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[90px] -translate-x-full md:block"
        >
          <path
            d="M40 0 C4 100 76 200 40 300 C4 400 76 500 40 600"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="2.5"
          />
          <path
            d="M90 0 H52 C16 100 88 200 52 300 C16 400 88 500 52 600 H90 Z"
            fill={FORM_BG}
          />
        </svg>

        <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-8 shadow-xl shadow-slate-300/40 sm:p-10">
          <SchoolIllustration className="mx-auto mb-5 h-20 w-20 sm:h-24 sm:w-24" />
          {children}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          <span>Secure · Reliable · Trusted</span>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {`© ${year} Nexchool. All rights reserved.`}
        </p>
      </main>

      {/* Support shortcut */}
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Nexchool admin support")}`}
        aria-label="Contact support"
        className="fixed bottom-6 right-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
      >
        <LifeBuoy className="size-5" aria-hidden="true" />
      </a>
    </div>
  );
}
