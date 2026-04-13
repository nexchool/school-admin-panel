"use client";

import { useEffect, useRef } from "react";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { playNotificationChime } from "@/lib/notificationChime";

/**
 * Foreground FCM: show a Web Notification (Chrome often skips OS sound here;
 * a short chime gives immediate feedback).
 */
export function useForegroundFCMListener() {
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (typeof window === "undefined") return;
    if (!isFirebaseConfigured()) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const app = getFirebaseApp();
    if (!app) return;

    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const { getMessaging, onMessage } = await import("firebase/messaging");
      if (!alive.current) return;
      try {
        const messaging = getMessaging(app);
        unsubscribe = onMessage(messaging, (payload) => {
          const title =
            payload.notification?.title ||
            String(payload.data?.title ?? "Notification");
          const body =
            payload.notification?.body || String(payload.data?.body ?? "");
          if (Notification.permission !== "granted") return;
          try {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
              silent: false,
              tag: String(
                payload.data?.notification_id || payload.messageId || "fcm-foreground"
              ),
              data: payload.data as Record<string, string> | undefined,
            });
            playNotificationChime();
          } catch {
            /* invalid tag, etc. */
          }
        });
      } catch {
        /* messaging unavailable */
      }
    })();

    return () => {
      alive.current = false;
      unsubscribe?.();
    };
  }, []);
}
