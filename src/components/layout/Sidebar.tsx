"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  User,
  LogOut,
  X,
  Wallet,
  Calendar,
  School,
  Bus,
  CalendarDays,
  HelpCircle,
  Settings2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Circle,
  CircleDot,
} from "lucide-react";
import { useSetupStatus } from "@/hooks/useSchoolSetup";
import { useSetupStepStatus, type SetupStepKey } from "@/hooks/useSetupStepStatus";
import { NEXCHOOL_PRIVACY_URL, NEXCHOOL_TERMS_URL } from "@/lib/externalLinks";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Tenant feature key required to see this nav item. Omit for core links. */
  feature?: string;
};

/** Everything above Profile. Items with `feature` are filtered by the
 * tenant's enabled features — disabling a feature hides its sidebar link.
 * Transport keeps its position (before Profile) for visual continuity. */
const SIDEBAR_NAV_CORE: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "Academics", icon: School },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/timetable", label: "Timetable", icon: CalendarDays, feature: "timetable" },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, feature: "attendance" },
  { href: "/dashboard/finance", label: "Finance", icon: Wallet, feature: "fees_management" },
  { href: "/holidays", label: "Holidays", icon: Calendar, feature: "holiday_management" },
];

const SIDEBAR_NAV_PROFILE = { href: "/profile", label: "Profile", icon: User } as const;

const SIDEBAR_NAV_TRANSPORT = {
  href: "/dashboard/transport",
  label: "Transport",
  icon: Bus,
} as const;

const SETUP_STEPS: Array<{ key: SetupStepKey; href: string; label: string }> = [
  { key: "units", href: "/school-setup/units", label: "School Units" },
  { key: "programmes", href: "/school-setup/programmes", label: "Programmes" },
  { key: "grades", href: "/school-setup/grades", label: "Grades" },
  { key: "academic-year", href: "/school-setup/academic-year", label: "Academic Year" },
  { key: "classes", href: "/school-setup/classes", label: "Classes" },
  { key: "subjects", href: "/school-setup/subjects", label: "Subjects" },
  { key: "terms", href: "/school-setup/terms", label: "Terms" },
  { key: "complete", href: "/school-setup/complete", label: "Review & Complete" },
];

const TRANSPORT_NAV_PERMS = [
  "transport.buses.read",
  "transport.enrollment.read",
  "transport.dashboard.read",
  "transport.drivers.manage",
  "transport.routes.manage",
  "transport.assignments.manage",
];

/**
 * Prefix match for nested routes.
 * "/dashboard" only lights up on exact match (prevents it highlighting for /dashboard/finance etc).
 */
function isSidebarNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`) || pathname === href;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isFeatureEnabled, hasAnyPermission, hasPermission } = useAuth();
  const { data: setupStatus } = useSetupStatus();
  const isSetupComplete = setupStatus?.overall.is_setup_complete ?? false;

  const visibleCore = SIDEBAR_NAV_CORE.filter(
    (item) => !item.feature || isFeatureEnabled(item.feature)
  );
  const showTransport =
    isFeatureEnabled("transport") && hasAnyPermission(TRANSPORT_NAV_PERMS);

  // School Setup is visible to admins always, plus to anyone when setup is
  // still pending — that way an admin's first login screams "finish setup".
  const showSchoolSetup =
    hasPermission("school_setup.manage") ||
    (setupStatus ? !isSetupComplete : false);

  const [setupExpanded, setSetupExpanded] = useState(
    pathname.startsWith("/school-setup")
  );

  // Dashboard is always first; the setup group is injected between it and the
  // rest when school setup is visible.
  const coreItemsBeforeSetup = visibleCore.slice(0, 1); // Dashboard
  const coreItemsAfterSetup = visibleCore.slice(1);     // everything else

  const allNavItems = showTransport
    ? [...coreItemsAfterSetup, SIDEBAR_NAV_TRANSPORT, SIDEBAR_NAV_PROFILE]
    : [...coreItemsAfterSetup, SIDEBAR_NAV_PROFILE];

  const handleLogout = () => {
    logout();
    onClose();
    router.replace("/login");
  };

  const handleNavClick = () => {
    if (isMobile) onClose();
  };

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-4 md:px-6">
        <Link
          href="/dashboard"
          className="font-semibold text-foreground"
          onClick={handleNavClick}
        >
          School ERP
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col p-4">
        <div className="space-y-1">
          {/* Dashboard — always first */}
          {coreItemsBeforeSetup.map(({ href, label, icon: Icon }) => {
            const isActive = isSidebarNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* School Setup collapsible group */}
          {showSchoolSetup && (
            <div>
              <button
                type="button"
                onClick={() => setSetupExpanded((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/school-setup")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Settings2 className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">
                  School Setup{!isSetupComplete && " ⚠"}
                </span>
                {setupExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {setupExpanded && (
                <div className="ml-7 mt-1 space-y-0.5 border-l border-border pl-3">
                  {SETUP_STEPS.map((step) => (
                    <SetupSubItem
                      key={step.key}
                      step={step}
                      pathname={pathname}
                      onNavClick={handleNavClick}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Remaining core nav items */}
          {allNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = isSidebarNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* Audit Log — visible only to users with audit_log.view permission */}
          {hasPermission("audit_log.view") && (
            <Link
              href="/audit-log"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/audit-log" || pathname.startsWith("/audit-log/")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ClipboardList className="h-5 w-5 shrink-0" />
              Audit Log
            </Link>
          )}
        </div>

        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <Link
            href="/help"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/help" || pathname.startsWith("/help/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            Help &amp; support
          </Link>
          <div className="px-3 pb-1 text-[11px] leading-snug text-muted-foreground">
            <a
              href={NEXCHOOL_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms
            </a>
            <span className="px-1.5 text-border">·</span>
            <a
              href={NEXCHOOL_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy
            </a>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      </nav>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
            isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={onClose}
          aria-hidden
        />
        {/* Sidebar drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-out md:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebar}
        </aside>
      </>
    );
  }

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      {sidebar}
    </aside>
  );
}

// ── SetupSubItem ──────────────────────────────────────────────────────────────

function SetupSubItem({
  step,
  pathname,
  onNavClick,
}: {
  step: { key: SetupStepKey; href: string; label: string };
  pathname: string;
  onNavClick: () => void;
}) {
  const status = useSetupStepStatus(step.key);
  const isActive = pathname === step.href;
  const Icon =
    status === "done" ? CheckCircle2 : status === "now" ? CircleDot : Circle;
  const colorClass =
    status === "done"
      ? "text-emerald-600"
      : status === "now"
        ? "text-blue-600"
        : "text-muted-foreground/60";
  return (
    <Link
      href={step.href}
      onClick={onNavClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", colorClass)} />
      <span className="flex-1">{step.label}</span>
      {status === "done" && (
        <span className="text-[9px] uppercase tracking-wide text-emerald-600">
          done
        </span>
      )}
      {status === "now" && (
        <span className="text-[9px] uppercase tracking-wide text-blue-600">
          now
        </span>
      )}
      {status === "optional" && (
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          opt
        </span>
      )}
    </Link>
  );
}
