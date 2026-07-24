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
  Building2,
  CalendarDays,
  HelpCircle,
  Megaphone,
  ClipboardList,
  BookMarked,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { SchoolBrandName } from "@/components/layout/SchoolBrandName";
import { NEXCHOOL_PRIVACY_URL, NEXCHOOL_TERMS_URL } from "@/lib/externalLinks";
import { ROUTE_PERMISSIONS } from "@/lib/navPermissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Tenant feature key required to see this nav item. Omit for core links. */
  feature?: string;
  /** Permissions (ANY-of) required to see this nav item. Omit for core links. */
  permissions?: readonly string[];
};

/** The full sidebar nav, in display order. Items with `feature` are filtered
 * by the tenant's enabled features and items with `permissions` by the user's
 * grants — either one missing hides the link. */
const SIDEBAR_NAV_CORE: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "Academics", icon: School, permissions: ROUTE_PERMISSIONS["/academics"] },
  { href: "/academics/calendar", label: "Academic Calendar", icon: CalendarDays, feature: "academic_calendar", permissions: ROUTE_PERMISSIONS["/academics/calendar"] },
  { href: "/students", label: "Students", icon: GraduationCap, permissions: ROUTE_PERMISSIONS["/students"] },
  { href: "/teachers", label: "Teachers", icon: Users, permissions: ROUTE_PERMISSIONS["/teachers"] },
  { href: "/classes", label: "Classes", icon: BookOpen, permissions: ROUTE_PERMISSIONS["/classes"] },
  { href: "/subjects", label: "Subjects", icon: BookMarked, permissions: ROUTE_PERMISSIONS["/subjects"] },
  { href: "/timetable", label: "Timetable", icon: CalendarDays, feature: "timetable", permissions: ROUTE_PERMISSIONS["/timetable"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, feature: "attendance", permissions: ROUTE_PERMISSIONS["/attendance"] },
  { href: "/dashboard/finance", label: "Finance", icon: Wallet, feature: "fees_management", permissions: ROUTE_PERMISSIONS["/dashboard/finance"] },
  { href: "/holidays", label: "Holidays", icon: Calendar, feature: "holiday_management", permissions: ROUTE_PERMISSIONS["/holidays"] },
  { href: "/announcements", label: "Announcements", icon: Megaphone, permissions: ROUTE_PERMISSIONS["/announcements"] },
  { href: "/hostel", label: "Hostel", icon: Building2, feature: "hostel", permissions: ROUTE_PERMISSIONS["/hostel"] },
  { href: "/dashboard/transport", label: "Transport", icon: Bus, feature: "transport", permissions: ROUTE_PERMISSIONS["/dashboard/transport"] },
  { href: "/sub-admins", label: "Sub-Admins", icon: ShieldCheck, permissions: ROUTE_PERMISSIONS["/sub-admins"] },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/audit-log", label: "Audit Log", icon: ClipboardList, permissions: ROUTE_PERMISSIONS["/audit-log"] },
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
  const {
    logout,
    isFeatureEnabled,
    hasAnyPermission,
    tenantName,
  } = useAuth();

  const visibleCore = SIDEBAR_NAV_CORE.filter(
    (item) =>
      (!item.feature || isFeatureEnabled(item.feature)) &&
      (!item.permissions || hasAnyPermission(item.permissions))
  );

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
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
        <Link
          href="/dashboard"
          className="flex min-w-0 flex-1 items-center font-semibold text-foreground md:max-w-[min(100%,20rem)]"
          onClick={handleNavClick}
        >
          <SchoolBrandName name={tenantName} lineClamp={1} />
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

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="space-y-1 pr-1">
            {visibleCore.map(({ href, label, icon: Icon }) => {
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
        </div>

        <div className="shrink-0 space-y-3 border-t border-border pt-4">
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
            "fixed inset-y-0 left-0 z-50 flex h-full min-h-0 w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-out md:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebar}
        </aside>
      </>
    );
  }

  return (
    <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      {sidebar}
    </aside>
  );
}

