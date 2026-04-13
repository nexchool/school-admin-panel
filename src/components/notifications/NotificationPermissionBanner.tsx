"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enableNotifications, isPushDefault } from "@/hooks/usePushRegistration";
import { isFirebaseConfigured } from "@/lib/firebase";

const LS_PROMPT_SHOWN = "notification_prompt_shown";

/**
 * One-time, dismissible banner that prompts admins to enable browser push
 * notifications. Follows the same contextual UX pattern as Slack / LinkedIn:
 *
 *  — Never shown if Firebase push is not configured
 *  — Never shown if permission is already granted or denied
 *  — Never shown again after the user dismisses or clicks "Enable"
 */
export function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // SSR safety + feature guard
    if (typeof window === "undefined") return;
    if (!isFirebaseConfigured()) return;
    if (!isPushDefault()) return;
    if (localStorage.getItem(LS_PROMPT_SHOWN) === "true") return;

    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(LS_PROMPT_SHOWN, "true");
    setVisible(false);
  };

  const handleEnable = async () => {
    localStorage.setItem(LS_PROMPT_SHOWN, "true");
    setLoading(true);
    try {
      const result = await enableNotifications();
      if (result.status === "granted") {
        toast.success("Notifications enabled successfully");
        if (!result.serverHasToken) {
          toast.warning(
            "Browser allowed notifications, but the server did not store a push device. Check POST /api/devices/register in Network (expect 200)."
          );
        }
      } else if (result.status === "denied") {
        toast.error("Notification permission denied. You can re-enable it in browser settings.");
      }
    } finally {
      setLoading(false);
      setVisible(false);
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
