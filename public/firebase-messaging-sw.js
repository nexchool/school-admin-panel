/**
 * Firebase Messaging Service Worker
 *
 * Handles background push notifications from Firebase Cloud Messaging.
 * This file MUST be at /public/firebase-messaging-sw.js so it is served
 * from the root of the domain (required by FCM).
 *
 * The FIREBASE_CONFIG object below is intentionally left with placeholder
 * values — populate them via your CI/CD or use a dynamic generation approach
 * if you don't want to commit secrets here.
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// These values are injected at build time via next.config.js or replaced at
// runtime. You can also hard-code them if they are not secret (API keys for
// Firebase are generally safe to commit — the security is handled by Firebase
// Security Rules and App Check).
const firebaseConfig = {
  apiKey: "AIzaSyDUFxciGHYT8vVRTicwZ3IHXeB5W55hetg",
  authDomain: "nexchool-def76.firebaseapp.com",
  projectId: "nexchool-def76",
  storageBucket: "nexchool-def76.firebasestorage.app",
  messagingSenderId: "357969415281",
  appId: "1:357969415281:web:fef6a8dcfe183fc7639fd0",
  measurementId: "G-9Q1HVLWFSS"
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { notification, data } = payload;
    const title = notification?.title || data?.title || "New Notification";
    const body = notification?.body || data?.body || "";
    const icon = "/favicon.ico";

    self.registration.showNotification(title, {
      body,
      icon,
      data: data || {},
      badge: "/favicon.ico",
    });
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const nid = event.notification.data?.notification_id;
    const url = nid
      ? `/notifications/${nid}`
      : "/";

    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if ("focus" in client) {
              client.focus();
              if ("navigate" in client) client.navigate(url);
              return;
            }
          }
          if (clients.openWindow) return clients.openWindow(url);
        })
    );
  });
}
