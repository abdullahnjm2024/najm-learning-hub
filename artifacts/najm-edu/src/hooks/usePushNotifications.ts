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

interface UsePushOptions {
  subscribeEndpoint?: string;
  unsubscribeEndpoint?: string;
  onError?: (msg: string) => void;
  onSuccess?: () => void;
}

export function usePushNotifications(token: string | null, options: UsePushOptions = {}) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const subscribeEndpoint = options.subscribeEndpoint ?? "/push/subscribe";
  const unsubscribeEndpoint = options.unsubscribeEndpoint ?? "/push/unsubscribe";

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((reg) => {
      setSwRegistration(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
        console.log("[push] existing browser subscription:", sub ? "found" : "none");
      });
    }).catch((err) => {
      console.error("[push] SW ready error:", err);
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!token) {
      console.error("[push] subscribe: no auth token");
      options.onError?.("لا يوجد رمز مصادقة. يرجى تسجيل الدخول مجدداً.");
      return;
    }
    if (!swRegistration) {
      console.error("[push] subscribe: no SW registration");
      options.onError?.("لم يتم تسجيل الخدمة. يرجى تحديث الصفحة والمحاولة مجدداً.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch VAPID key
      console.log("[push] fetching VAPID public key…");
      const vapidRes = await fetch(`${getApiBaseUrl()}/push/vapid-public-key`);
      if (!vapidRes.ok) {
        const err = `VAPID key fetch failed: ${vapidRes.status}`;
        console.error("[push]", err);
        options.onError?.("خدمة الإشعارات غير مهيأة. يرجى التواصل مع الدعم.");
        return;
      }
      const { publicKey } = await vapidRes.json();
      console.log("[push] VAPID key received, requesting permission…");

      // 2. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log("[push] permission:", perm);
      if (perm !== "granted") {
        options.onError?.("تم رفض إذن الإشعارات. يمكنك تفعيله من إعدادات المتصفح.");
        return;
      }

      // 3. Subscribe in browser PushManager
      console.log("[push] subscribing to PushManager…");
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log("[push] browser subscription created:", subscription.endpoint.slice(0, 60) + "…");

      // 4. Save subscription on server
      console.log("[push] saving subscription to server…");
      const saveRes = await fetch(`${getApiBaseUrl()}${subscribeEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(subscription),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        const err = `Server save failed: ${saveRes.status} ${JSON.stringify(body)}`;
        console.error("[push]", err);
        // Unsubscribe the browser-side so state stays in sync
        await subscription.unsubscribe();
        options.onError?.("فشل حفظ الاشتراك. يرجى المحاولة مجدداً.");
        return;
      }

      console.log("[push] subscription saved successfully ✓");
      setIsSubscribed(true);
      options.onSuccess?.();
    } catch (err: any) {
      console.error("[push] subscribe error:", err);
      options.onError?.(err?.message ?? "حدث خطأ أثناء تفعيل الإشعارات.");
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, token, subscribeEndpoint, options]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration || !token) return;
    setIsLoading(true);
    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (!sub) { setIsSubscribed(false); return; }

      const delRes = await fetch(`${getApiBaseUrl()}${unsubscribeEndpoint}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      if (!delRes.ok) {
        console.error("[push] server unsubscribe failed:", delRes.status);
      }
      await sub.unsubscribe();
      setIsSubscribed(false);
      console.log("[push] unsubscribed successfully");
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, token, unsubscribeEndpoint]);

  const isSupported = "serviceWorker" in navigator && "PushManager" in window;

  return { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe };
}
