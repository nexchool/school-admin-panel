/**
 * Push notification registration — user-triggered only.
 *
 * Call enableNotifications() from a user gesture (button click).
 * Never call it automatically on page load — browsers block that.
 *
 * Firebase env vars required (see lib/firebase.ts). If they are absent the
 * function resolves to "unavailable" without touching the Notification API.
 */

import { getFirebaseApp, VAPID_KEY, isFirebaseConfigured } from "@/lib/firebase";
import { apiPost } from "@/services/api";
import { fetchMyDevices } from "@/services/devicesService";

const LS_PERMISSION_STATUS = "notification_permission_status";

/** Result of attempting to enable push (browser + server token row). */
export type EnablePushOutcome =
  | { status: "granted"; serverHasToken: boolean }
  | { status: "denied" }
  | { status: "unavailable" };

/**
 * Request browser notification permission, obtain an FCM token, POST
 * /api/devices/register, then verify with GET /api/devices.
 */
export async function enableNotifications(): Promise<EnablePushOutcome> {
  if (typeof window === "undefined") return { status: "unavailable" };
  if (!("Notification" in window)) return { status: "unavailable" };
  if (!("serviceWorker" in navigator)) return { status: "unavailable" };
  if (!isFirebaseConfigured()) return { status: "unavailable" };

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(LS_PERMISSION_STATUS, permission);

    if (permission === "denied") return { status: "denied" };
    if (permission !== "granted") return { status: "unavailable" };

    const app = getFirebaseApp();
    if (!app) return { status: "unavailable" };

    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY!,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn("[Push] getToken returned empty — check VAPID key and service worker.");
      return { status: "unavailable" };
    }

    console.log("[Push] FCM token (prefix):", token.slice(0, 24) + "…");

    await apiPost("/api/devices/register", {
      device_token: token,
      provider: "fcm",
      platform: "web",
    });

    let serverHasToken = false;
    try {
      const { devices } = await fetchMyDevices();
      serverHasToken = devices.some((d) => d.is_active);
      if (!serverHasToken) {
        console.warn(
          "[Push] POST /api/devices/register succeeded but GET /api/devices shows no active token — check API logs."
        );
      }
    } catch (e) {
      console.warn("[Push] Could not verify registration via GET /api/devices:", e);
    }

    return { status: "granted", serverHasToken };
  } catch (err) {
    console.warn("[Push] enableNotifications failed:", err);
    return { status: "unavailable" };
  }
}

/** True if the browser has already granted notification permission. */
export function isPushGranted(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted";
}

/** True if the browser permission is still in the default (not-yet-asked) state. */
export function isPushDefault(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "default";
}

/** True if the user has explicitly denied notification permission. */
export function isPushDenied(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "denied";
}
