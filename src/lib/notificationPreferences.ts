import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type NotificationPreferences = {
  /** Write followed-title release changes into the in-app notification inbox. */
  releaseUpdates: boolean;
  /** Display non-blocking in-app toast banners for eligible updates. */
  inAppToasts: boolean;
  /** Apply to reply, mention, follow, and collection activity delivery. */
  socialActivity: boolean;
  /** Receive the scheduled, opt-in weekly watchlist digest. */
  weeklyDigest: boolean;
  /** Receive system-level browser alerts on this account. */
  browserPushEnabled: boolean;
  /** Sunday is 0; the digest is delivered on the chosen day once enabled. */
  digestDay: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  releaseUpdates: true,
  inAppToasts: true,
  socialActivity: true,
  weeklyDigest: false,
  browserPushEnabled: false,
  digestDay: 1,
};

const NOTIFICATION_PREFERENCES_EVENT =
  "cinetrekker:notification-preferences-updated";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function clampDigestDay(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6
    ? value
    : DEFAULT_NOTIFICATION_PREFERENCES.digestDay;
}

function isSchemaMissing(error: PostgrestError | null) {
  if (!error) return false;
  const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
  return (
    error.code === "PGRST205" ||
    message.includes("notification_preferences") ||
    message.includes("could not find the table")
  );
}

export function getNotificationPreferencesStorageKey(userId?: string | null) {
  return `cinetrekker_notification_preferences_${userId || "guest"}`;
}

export function normalizeNotificationPreferences(
  candidate: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  return {
    releaseUpdates:
      typeof candidate?.releaseUpdates === "boolean"
        ? candidate.releaseUpdates
        : DEFAULT_NOTIFICATION_PREFERENCES.releaseUpdates,
    inAppToasts:
      typeof candidate?.inAppToasts === "boolean"
        ? candidate.inAppToasts
        : DEFAULT_NOTIFICATION_PREFERENCES.inAppToasts,
    socialActivity:
      typeof candidate?.socialActivity === "boolean"
        ? candidate.socialActivity
        : DEFAULT_NOTIFICATION_PREFERENCES.socialActivity,
    weeklyDigest:
      typeof candidate?.weeklyDigest === "boolean"
        ? candidate.weeklyDigest
        : DEFAULT_NOTIFICATION_PREFERENCES.weeklyDigest,
    browserPushEnabled:
      typeof candidate?.browserPushEnabled === "boolean"
        ? candidate.browserPushEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.browserPushEnabled,
    digestDay: clampDigestDay(candidate?.digestDay),
  };
}

function fromDatabaseRow(
  row: {
    release_updates: boolean;
    in_app_toasts: boolean;
    social_activity: boolean;
    weekly_digest: boolean;
    browser_push_enabled: boolean;
    digest_day: number;
  },
) {
  return normalizeNotificationPreferences({
    releaseUpdates: row.release_updates,
    inAppToasts: row.in_app_toasts,
    socialActivity: row.social_activity,
    weeklyDigest: row.weekly_digest,
    browserPushEnabled: row.browser_push_enabled,
    digestDay: row.digest_day,
  });
}

function toDatabaseRow(userId: string, preferences: NotificationPreferences) {
  return {
    user_id: userId,
    release_updates: preferences.releaseUpdates,
    in_app_toasts: preferences.inAppToasts,
    social_activity: preferences.socialActivity,
    weekly_digest: preferences.weeklyDigest,
    browser_push_enabled: preferences.browserPushEnabled,
    digest_day: preferences.digestDay,
    updated_at: new Date().toISOString(),
  };
}

export function readNotificationPreferences(userId?: string | null) {
  if (!canUseStorage()) return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(
      getNotificationPreferencesStorageKey(userId),
    );
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return normalizeNotificationPreferences(
      JSON.parse(raw) as Partial<NotificationPreferences>,
    );
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(
  userId: string | null | undefined,
  next: NotificationPreferences,
) {
  const normalized = normalizeNotificationPreferences(next);

  if (!canUseStorage()) return normalized;

  try {
    window.localStorage.setItem(
      getNotificationPreferencesStorageKey(userId),
      JSON.stringify(normalized),
    );
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_PREFERENCES_EVENT, {
        detail: { userId: userId || "guest" },
      }),
    );
  } catch {
    // Preference controls remain usable in the current session even if storage is unavailable.
  }

  return normalized;
}

/**
 * Reads an authenticated user's server preference row. If the delivery migration
 * has not reached the current environment yet, the current-device preference is
 * retained rather than blocking existing in-app notifications.
 */
export async function loadSyncedNotificationPreferences(userId?: string | null) {
  const local = readNotificationPreferences(userId);
  if (!userId) return local;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "release_updates, in_app_toasts, social_activity, weekly_digest, browser_push_enabled, digest_day",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaMissing(error)) return local;
    throw error;
  }

  if (!data) {
    return syncNotificationPreferences(userId, local);
  }

  const synced = fromDatabaseRow(data);
  saveNotificationPreferences(userId, synced);
  return synced;
}

/**
 * Persists a signed-in user's choices for cross-device delivery after first
 * applying them locally, so a temporary network failure never blocks control.
 */
export async function syncNotificationPreferences(
  userId: string | null | undefined,
  next: NotificationPreferences,
) {
  const normalized = saveNotificationPreferences(userId, next);
  if (!userId) return normalized;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(toDatabaseRow(userId, normalized), { onConflict: "user_id" })
    .select(
      "release_updates, in_app_toasts, social_activity, weekly_digest, browser_push_enabled, digest_day",
    )
    .single();

  if (error) {
    if (isSchemaMissing(error)) return normalized;
    throw error;
  }

  const synced = fromDatabaseRow(data);
  saveNotificationPreferences(userId, synced);
  return synced;
}

export function subscribeToNotificationPreferences(
  callback: () => void,
) {
  if (!canUseStorage()) return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith("cinetrekker_notification_preferences_")) {
      callback();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, callback);
  };
}
