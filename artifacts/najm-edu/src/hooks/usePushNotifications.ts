import { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/utils";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(token: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      setSwRegistration(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!swRegistration || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/push/vapid-public-key`);
      if (!res.ok) throw new Error("Push not configured");
      const { publicKey } = await res.json();

      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") return;

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${getApiBaseUrl()}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(subscription),
      });

      setIsSubscribed(true);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, token]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration || !token) return;
    setIsLoading(true);
    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (!sub) return;
      await fetch(`${getApiBaseUrl()}/push/unsubscribe`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setIsSubscribed(false);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, token]);

  const isSupported = "serviceWorker" in navigator && "PushManager" in window;

  return { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe };
}
