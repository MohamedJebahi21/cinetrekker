export type NotificationPreferences = {
  /** Write followed-title release changes into the in-app notification inbox. */
  releaseUpdates: boolean;
  /** Display non-blocking in-app toast banners for eligible updates. */
  inAppToasts: boolean;
  /** Reserved for comment, reply, and follow notifications as social delivery expands. */
  socialActivity: boolean;
  /** Reserved for an opt-in weekly watchlist digest once background delivery is enabled. */
  weeklyDigest: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  releaseUpdates: true,
  inAppToasts: true,
  socialActivity: true,
  weeklyDigest: false,
};

const NOTIFICATION_PREFERENCES_EVENT = "cinetrekker:notification-preferences-updated";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
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
