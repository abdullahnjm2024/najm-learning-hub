self.addEventListener("push", (event) => {
  if (!event.data) {
    console.warn("[SW] push event received but event.data is empty — skipping");
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error("[SW] failed to parse push payload as JSON, falling back to text:", e);
    data = { title: "إشعار جديد", body: event.data.text() };
  }

  const title = data.title || "نظام نجم التعليمي";
  const options = {
    body: data.body || "",
    icon: "/najm-logo.png",
    badge: "/najm-logo.png",
    dir: "rtl",
    lang: "ar",
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: "najm-reply",
    renotify: true,
  };

  console.log("[SW] showNotification →", title, "|", options.body);

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error("[SW] showNotification failed:", err);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  console.log("[SW] notificationclick — navigating to:", url);
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => {
  console.log("[SW] installing — skipWaiting");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] activated — claiming clients");
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {});
