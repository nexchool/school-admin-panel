"use client";

import Link from "next/link";
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
} from "lucide-react";
import { NEXCHOOL_PRIVACY_URL, NEXCHOOL_TERMS_URL } from "@/lib/externalLinks";

/** Everything above Profile; Transport is inserted here when enabled (before Profile). */
const SIDEBAR_NAV_CORE = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "Academics", icon: School },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/dashboard/finance", label: "Finance", icon: Wallet },
  { href: "/holidays", label: "Holidays", icon: Calendar },
] as const;

const SIDEBAR_NAV_PROFILE = { href: "/profile", label: "Profile", icon: User } as const;

const SIDEBAR_NAV_TRANSPORT = {
  href: "/dashboard/transport",
  label: "Transport",
  icon: Bus,
} as const;

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
  const { logout, isFeatureEnabled, hasAnyPermission } = useAuth();

  const showTransport =
    isFeatureEnabled("transport") && hasAnyPermission(TRANSPORT_NAV_PERMS);

  const allNavItems = showTransport
    ? [...SIDEBAR_NAV_CORE, SIDEBAR_NAV_TRANSPORT, SIDEBAR_NAV_PROFILE]
    : [...SIDEBAR_NAV_CORE, SIDEBAR_NAV_PROFILE];

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
