/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data: Record<string, any> = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "إشعار جديد", body: event.data.text() };
  }

  const title = data.title || "نظام نجم التعليمي";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: data.icon || "/favicon.svg",
    badge: "/favicon.svg",
    dir: "rtl",
    lang: "ar",
    data: data.data || {},
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow("/");
      })
  );
});
