"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bus,
  Route,
  MapPin,
  Users,
  UserCircle,
  FileBarChart,
  CalendarClock,
  CalendarOff,
} from "lucide-react";

const items = [
  { href: "/dashboard/transport", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/transport/fleet", label: "Fleet", icon: Bus, exact: false },
  { href: "/dashboard/transport/routes", label: "Routes", icon: Route, exact: false },
  { href: "/dashboard/transport/schedules", label: "Schedules", icon: CalendarClock, exact: false },
  {
    href: "/dashboard/transport/schedules/exceptions",
    label: "Exceptions",
    icon: CalendarOff,
    exact: true,
  },
  { href: "/dashboard/transport/stops", label: "Stops", icon: MapPin, exact: false },
  {
    href: "/dashboard/transport/students",
    label: "Students on Transport",
    icon: Users,
    exact: false,
  },
  { href: "/dashboard/transport/staff", label: "Staff", icon: UserCircle, exact: false },
  { href: "/dashboard/transport/reports", label: "Reports", icon: FileBarChart, exact: false },
] as const;

export function TransportSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border pb-3"
      aria-label="Transport sections"
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href ||
            (pathname.startsWith(`${href}/`) &&
              !(
                href === "/dashboard/transport/schedules" &&
                pathname.startsWith("/dashboard/transport/schedules/exceptions")
              ));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
