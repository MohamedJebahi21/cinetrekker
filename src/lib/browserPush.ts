import { supabase } from "@/integrations/supabase/client";
import {
  readNotificationPreferences,
  syncNotificationPreferences,
} from "@/lib/notificationPreferences";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() || "";

export type BrowserPushReadiness = {
  supported: boolean;
  configured: boolean;
  secure: boolean;
  permission: NotificationPermission | "unsupported";
};

export class BrowserPushError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unsupported"
      | "insecure"
      | "not_configured"
      | "permission_denied"
      | "subscription_failed",
  ) {
    super(message);
    this.name = "BrowserPushError";
  }
}

function hasWindow() {
  return typeof window !== "undefined";
}

function canUseBrowserPush() {
  return (
    hasWindow() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(normalized);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function getSubscriptionKeys(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!subscription.endpoint || !p256dh || !auth) {
    throw new BrowserPushError(
      "The browser did not return a complete notification subscription.",
      "subscription_failed",
    );
  }

  return { endpoint: subscription.endpoint, p256dh, auth };
}

export function getBrowserPushReadiness(): BrowserPushReadiness {
  const supported = canUseBrowserPush();
  return {
    supported,
    configured: Boolean(VAPID_PUBLIC_KEY),
    secure: hasWindow() ? window.isSecureContext : false,
    permission: supported ? Notification.permission : "unsupported",
  };
}

export async function registerCineTrekkerServiceWorker() {
  if (!hasWindow() || !("serviceWorker" in navigator) || !window.isSecureContext) {
    return null;
  }

  // `register()` resolves before the worker is necessarily active. Waiting for
  // `ready` prevents PushManager.subscribe() from racing the first install.
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function enableBrowserPush(userId: string) {
  const readiness = getBrowserPushReadiness();

  if (!readiness.supported) {
    throw new BrowserPushError(
      "This browser does not support browser alerts.",
      "unsupported",
    );
  }
  if (!readiness.secure) {
    throw new BrowserPushError(
      "Browser alerts need a secure connection.",
      "insecure",
    );
  }
  if (!readiness.configured) {
    throw new BrowserPushError(
      "Browser alerts are not configured on this deployment yet.",
      "not_configured",
    );
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new BrowserPushError(
      "Browser alerts were not enabled. You can change this later in your browser settings.",
      "permission_denied",
    );
  }

  const registration = await registerCineTrekkerServiceWorker();
  if (!registration) {
    throw new BrowserPushError(
      "CineTrekker could not start the notification service on this device.",
      "subscription_failed",
    );
  }

  let subscription: PushSubscription | null;
  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
  } catch (error) {
    const detail = error instanceof Error && error.message
      ? ` (${error.message})`
      : "";
    throw new BrowserPushError(
      `CineTrekker could not create a browser subscription on this device${detail}`,
      "subscription_failed",
    );
  }

  const { endpoint, p256dh, auth } = getSubscriptionKeys(subscription);
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      content_encoding: "aes128gcm",
      user_agent: navigator.userAgent || null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    throw new BrowserPushError(
      "CineTrekker could not save this device for browser alerts.",
      "subscription_failed",
    );
  }

  const preferences = readNotificationPreferences(userId);
  await syncNotificationPreferences(userId, {
    ...preferences,
    browserPushEnabled: true,
  });

  return getBrowserPushReadiness();
}

export async function disableBrowserPush(userId: string) {
  const readiness = getBrowserPushReadiness();

  if (!readiness.supported || !readiness.secure) {
    return readiness;
  }

  const registration = await registerCineTrekkerServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      throw new BrowserPushError(
        "CineTrekker could not update this device's browser alert status.",
        "subscription_failed",
      );
    }
  }

  const preferences = readNotificationPreferences(userId);
  await syncNotificationPreferences(userId, {
    ...preferences,
    browserPushEnabled: false,
  });

  return getBrowserPushReadiness();
}
