"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Menu, Bell } from "lucide-react";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { UnitSwitcher } from "./UnitSwitcher";
import { AcademicYearSwitcher } from "./AcademicYearSwitcher";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import {
  enableNotifications,
  isPushGranted,
  isPushDefault,
  isPushDenied,
} from "@/hooks/usePushRegistration";
import { isFirebaseConfigured } from "@/lib/firebase";
import { fetchMyDevices } from "@/services/devicesService";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isFeatureEnabled } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const unreadCount = useUnreadNotificationsCount();
  const notificationsEnabled = isFeatureEnabled("notifications");

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "?";

  const handleBellClick = async () => {
    if (!isFirebaseConfigured()) {
      setPanelOpen(true);
      return;
    }

    if (isPushGranted()) {
      try {
        const { devices } = await fetchMyDevices();
        const hasActive = devices.some((d) => d.is_active);
        if (!hasActive) {
          setEnablingPush(true);
          try {
            const result = await enableNotifications();
            if (result.status === "granted" && !result.serverHasToken) {
              toast.warning("Notifications allowed, but this device is not registered for push yet.");
            } else if (result.status === "unavailable" && result.message) {
              toast.error(result.message);
            }
          } finally {
            setEnablingPush(false);
          }
        }
      } catch {
        /* still open panel */
      }
      setPanelOpen(true);
      return;
    }

    if (isPushDenied()) {
      toast.error(
        "Notifications are blocked. Please enable them in your browser settings and reload the page."
      );
      return;
    }

    // permission === 'default' — trigger user-initiated permission request
    if (isPushDefault()) {
      setEnablingPush(true);
      try {
        const result = await enableNotifications();
        if (result.status === "granted") {
          toast.success("Notifications enabled successfully");
          if (!result.serverHasToken) {
            toast.warning("Notifications allowed, but this device is not registered for push yet.");
          }
          setPanelOpen(true);
        } else if (result.status === "denied") {
          toast.error(
            "Notification permission denied. You can re-enable it in browser settings."
          );
        } else if (result.status === "unavailable") {
          if (result.message) toast.error(result.message);
          setPanelOpen(true);
        }
      } finally {
        setEnablingPush(false);
      }
      return;
    }

    // Fallback — open panel
    setPanelOpen(true);
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2">
          <UnitSwitcher />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <AcademicYearSwitcher />
          {user && (
            <>
              {notificationsEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative size-9"
                  onClick={handleBellClick}
                  disabled={enablingPush}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                >
                  <Bell className={`size-5 ${enablingPush ? "animate-pulse" : ""}`} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user.profile_picture_url}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {user.name || user.email}
                </span>
              </div>
            </>
          )}
        </div>
      </header>

      {notificationsEnabled && (
        <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      )}
    </>
  );
}
