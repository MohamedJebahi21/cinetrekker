import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationRecord = {
  id: string;
  user_id: string;
  movie_id: string;
  type: string;
  message: string;
  created_at: string;
};

type PreferenceRow = {
  user_id: string;
  release_updates: boolean;
  social_activity: boolean;
  weekly_digest: boolean;
  browser_push_enabled: boolean;
  digest_day: number;
};

const RELEASE_TYPES = new Set([
  "movie_release",
  "release_date_change",
  "new_season",
  "new_episode",
  "status_change",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getJwtRole(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)).role as string | undefined;
  } catch {
    return null;
  }
}

function isAuthorized(req: Request, cronSecret: string | undefined) {
  const cronHeader = req.headers.get("x-cron-secret")?.trim();
  if (cronSecret && cronHeader === cronSecret) return true;
  return getJwtRole(req) === "service_role";
}

function notificationCategory(type: string) {
  return RELEASE_TYPES.has(type) ? "release" : "social";
}

function isNotificationEligible(notification: NotificationRecord, preferences: PreferenceRow) {
  if (!preferences.browser_push_enabled) return false;
  return notificationCategory(notification.type) === "release"
    ? preferences.release_updates
    : preferences.social_activity;
}

function notificationUrl(movieId: string) {
  const [mediaType, mediaId] = movieId.split("-");
  if ((mediaType === "movie" || mediaType === "tv") && /^\d+$/.test(mediaId || "")) {
    return `/${mediaType}/${mediaId}`;
  }
  return "/notifications";
}

function notificationTitle(type: string) {
  if (type === "new_episode") return "New episode available";
  if (type === "new_season") return "New season available";
  if (type === "movie_release") return "Now available to watch";
  if (type === "release_date_change") return "Release date updated";
  return "CineTrekker update";
}

function isExpiredSubscription(error: unknown) {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

async function reserveDelivery(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    subscriptionId: string;
    notificationId?: string;
    deliveryKey: string;
    channel: "push" | "digest";
  },
) {
  const { error } = await supabase.from("notification_delivery_log").insert({
    user_id: input.userId,
    subscription_id: input.subscriptionId,
    notification_id: input.notificationId ?? null,
    delivery_key: input.deliveryKey,
    channel: input.channel,
    status: "queued",
  });

  if (!error) return true;
  // A unique violation means another scheduled retry already owns this device send.
  if (error.code === "23505") return false;
  throw error;
}

async function updateDelivery(
  supabase: ReturnType<typeof createClient>,
  input: { userId: string; subscriptionId: string; deliveryKey: string; channel: "push" | "digest" },
  status: "sent" | "failed" | "skipped",
  detail?: string,
) {
  const { error } = await supabase
    .from("notification_delivery_log")
    .update({
      status,
      detail: detail?.slice(0, 500) ?? null,
      delivered_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("user_id", input.userId)
    .eq("subscription_id", input.subscriptionId)
    .eq("delivery_key", input.deliveryKey)
    .eq("channel", input.channel);

  if (error) throw error;
}

async function sendToSubscription(
  supabase: ReturnType<typeof createClient>,
  subscription: PushSubscriptionRow,
  input: {
    userId: string;
    notificationId?: string;
    deliveryKey: string;
    channel: "push" | "digest";
    title: string;
    body: string;
    url: string;
    tag: string;
  },
) {
  const reserved = await reserveDelivery(supabase, {
    userId: input.userId,
    subscriptionId: subscription.id,
    notificationId: input.notificationId,
    deliveryKey: input.deliveryKey,
    channel: input.channel,
  });
  if (!reserved) return { sent: false, skipped: true };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: input.title,
        body: input.body,
        url: input.url,
        tag: input.tag,
      }),
      { TTL: input.channel === "push" ? 60 * 60 : 60 * 60 * 12, urgency: "normal" },
    );
    await updateDelivery(
      supabase,
      { userId: input.userId, subscriptionId: subscription.id, deliveryKey: input.deliveryKey, channel: input.channel },
      "sent",
    );
    return { sent: true, skipped: false };
  } catch (error) {
    if (isExpiredSubscription(error)) {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", subscription.id);
    }
    await updateDelivery(
      supabase,
      { userId: input.userId, subscriptionId: subscription.id, deliveryKey: input.deliveryKey, channel: input.channel },
      "failed",
      error instanceof Error ? error.message : "Web Push delivery failed",
    );
    return { sent: false, skipped: false };
  }
}

async function sendNotificationPush(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRecord,
) {
  const { data: preferences, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select("user_id, release_updates, social_activity, weekly_digest, browser_push_enabled, digest_day")
    .eq("user_id", notification.user_id)
    .maybeSingle();
  if (preferenceError) throw preferenceError;
  if (!preferences || !isNotificationEligible(notification, preferences as PreferenceRow)) {
    return { sent: 0, skipped: 0 };
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id)
    .eq("is_active", true);
  if (subscriptionError) throw subscriptionError;

  const results = await Promise.all(
    ((subscriptions || []) as PushSubscriptionRow[]).map((subscription) =>
      sendToSubscription(supabase, subscription, {
        userId: notification.user_id,
        notificationId: notification.id,
        deliveryKey: `notification:${notification.id}`,
        channel: "push",
        title: notificationTitle(notification.type),
        body: notification.message,
        url: notificationUrl(notification.movie_id),
        tag: `notification:${notification.id}`,
      }),
    ),
  );

  return {
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
  };
}

async function sendPendingNotificationPushes(supabase: ReturnType<typeof createClient>) {
  // A two-day window makes scheduled retries resilient while the per-device
  // delivery log prevents duplicate sends on every run.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, user_id, movie_id, type, message, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  for (const notification of (notifications || []) as NotificationRecord[]) {
    const result = await sendNotificationPush(supabase, notification);
    sent += result.sent;
    skipped += result.skipped;
  }

  return { sent, skipped, scanned: notifications?.length || 0, since };
}

async function sendWeeklyDigests(supabase: ReturnType<typeof createClient>) {
  const today = new Date();
  const digestDay = today.getUTCDay();
  const weekStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 7));
  const weekKey = weekStart.toISOString().slice(0, 10);

  const { data: preferences, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select("user_id, release_updates, social_activity, weekly_digest, browser_push_enabled, digest_day")
    .eq("weekly_digest", true)
    .eq("browser_push_enabled", true)
    .eq("digest_day", digestDay);
  if (preferenceError) throw preferenceError;

  let sent = 0;
  for (const preference of (preferences || []) as PreferenceRow[]) {
    const { data: notifications, error: notificationError } = await supabase
      .from("notifications")
      .select("id, user_id, movie_id, type, message, created_at")
      .eq("user_id", preference.user_id)
      .gte("created_at", weekStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    if (notificationError) throw notificationError;
    if (!notifications || notifications.length === 0) continue;

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("user_id", preference.user_id)
      .eq("is_active", true);
    if (subscriptionError) throw subscriptionError;

    const body = notifications.length === 1
      ? "One fresh update is waiting in your CineTrekker inbox."
      : `${notifications.length} fresh updates are waiting in your CineTrekker inbox.`;
    const results = await Promise.all(
      ((subscriptions || []) as PushSubscriptionRow[]).map((subscription) =>
        sendToSubscription(supabase, subscription, {
          userId: preference.user_id,
          deliveryKey: `digest:${weekKey}`,
          channel: "digest",
          title: "Your CineTrekker week",
          body,
          url: "/notifications",
          tag: `weekly-digest:${weekKey}`,
        }),
      ),
    );
    sent += results.filter((result) => result.sent).length;
  }

  return { sent, digestDay, weekKey };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("NOTIFICATION_DELIVERY_CRON_SECRET") ?? Deno.env.get("CRON_SECRET");
  const vapidPublicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY");
  const vapidContact = Deno.env.get("WEB_PUSH_CONTACT_EMAIL");

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidContact) {
    return json({ error: "Notification delivery is not configured" }, 503);
  }
  if (!isAuthorized(req, cronSecret)) return json({ error: "Unauthorized" }, 401);

  webpush.setVapidDetails(`mailto:${vapidContact}`, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload = await req.json().catch(() => ({}));
    if (payload?.mode === "weekly_digest") {
      return json({ ok: true, mode: "weekly_digest", ...(await sendWeeklyDigests(supabase)) });
    }
    if (payload?.mode === "pending_notifications") {
      return json({ ok: true, mode: "pending_notifications", ...(await sendPendingNotificationPushes(supabase)) });
    }

    const notification = payload?.record as NotificationRecord | undefined;
    if (!notification?.id || !notification.user_id || !notification.message) {
      return json({ error: "A notification record is required" }, 400);
    }

    return json({ ok: true, mode: "notification", ...(await sendNotificationPush(supabase, notification)) });
  } catch (error) {
    console.error("notification-delivery failed", error);
    return json({ error: error instanceof Error ? error.message : "Delivery failed" }, 500);
  }
});
