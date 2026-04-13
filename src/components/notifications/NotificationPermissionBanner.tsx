"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import { enableNotifications, isPushDefault } from "@/hooks/usePushRegistration";
import { isFirebaseConfigured } from "@/lib/firebase";

const LS_PROMPT_SHOWN = "notification_prompt_shown";
const LS_ENV_BANNER_DISMISSED = "notification_env_banner_dismissed";

type BannerMode = "missing_client_env" | "ask_permission" | null;

/**
 * Banner for browser push setup:
 *
 * — If Firebase web env is missing (common when vars are only in admin-web/.env but
 *   Docker loads school-erp-infra/env/.env.local): explain how to fix.
 * — If Firebase is configured and permission is "default": prompt to enable (Slack-style).
 */
export function NotificationPermissionBanner() {
  const { isFeatureEnabled } = useAuth();
  const [mode, setMode] = useState<BannerMode>(null);
  const [loading, setLoading] = useState(false);

  const notificationsEnabled = isFeatureEnabled("notifications");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!notificationsEnabled) return;

    if (!isFirebaseConfigured()) {
      if (localStorage.getItem(LS_ENV_BANNER_DISMISSED) === "true") return;
      setMode("missing_client_env");
      return;
    }
    if (!isPushDefault()) {
      setMode(null);
      return;
    }
    if (localStorage.getItem(LS_PROMPT_SHOWN) === "true") return;
    setMode("ask_permission");
  }, [notificationsEnabled]);

  if (!mode) return null;

  if (mode === "missing_client_env") {
    const dismiss = () => {
      localStorage.setItem(LS_ENV_BANNER_DISMISSED, "true");
      setMode(null);
    };
    return (
      <div
        role="banner"
        className="flex items-center justify-between gap-3 border-b border-border bg-amber-500/10 px-4 py-2.5 text-sm"
      >
        <p className="text-foreground/90">
          <span className="font-medium">Desktop push is off.</span> Add Firebase web env vars to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">school-erp-infra/env/.env.local</code>{" "}
          (see <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local.example</code>) and
          restart admin-web. In-app notifications still work.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss configuration notice"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  const dismiss = () => {
    localStorage.setItem(LS_PROMPT_SHOWN, "true");
    setMode(null);
  };

  const handleEnable = async () => {
    localStorage.setItem(LS_PROMPT_SHOWN, "true");
    setLoading(true);
    try {
      const result = await enableNotifications();
      if (result.status === "granted") {
        toast.success("Notifications enabled successfully");
        if (!result.serverHasToken) {
          toast.warning("Notifications allowed, but this device is not registered for push yet.");
        }
      } else if (result.status === "denied") {
        toast.error("Notification permission denied. You can re-enable it in browser settings.");
      } else if (result.status === "unavailable" && result.message) {
        toast.error(result.message);
      }
    } finally {
      setLoading(false);
      setMode(null);
    }
  };

  return (
    <div
      role="banner"
      className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-sm"
    >
      <p className="flex items-center gap-2 text-foreground/80">
        <span aria-hidden>🔔</span>
        Stay updated with real-time alerts like leave requests and approvals
      </p>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={handleEnable}
          disabled={loading}
        >
          {loading ? "Enabling…" : "Enable Notifications"}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss notification prompt"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
