import { json, parseBody } from "./_lib/http.js";
import { authenticateRequest, getSupabaseAdminClient } from "./_lib/supabaseAdmin.js";
import {
  enforceAuthenticatedRequestSecurity,
  enforceRequestSecurity,
} from "./_lib/requestSecurity.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePositiveInt(value, fallback) {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return num;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getAction(req) {
  return typeof req?.query?.action === "string" ? req.query.action : "list";
}

async function authenticateAndEnforce(req, res, scope) {
  const security = await enforceRequestSecurity(req, res, scope);
  if (!security.ok) {
    json(res, security.status, { error: security.error });
    return null;
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    json(res, auth.status, { error: auth.error });
    return null;
  }

  const authedSecurity = await enforceAuthenticatedRequestSecurity(
    req,
    res,
    scope,
    auth.userId,
  );
  if (!authedSecurity.ok) {
    json(res, authedSecurity.status, { error: authedSecurity.error });
    return null;
  }

  return auth;
}

async function listNotifications(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const auth = await authenticateAndEnforce(req, res, "notifications-list");
  if (!auth) return undefined;

  const page = parsePositiveInt(req?.query?.page, DEFAULT_PAGE);
  const requestedLimit = parsePositiveInt(req?.query?.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const from = (page - 1) * limit;

  try {
    const supabase = getSupabaseAdminClient();

    // Fetch limit + 1 rows to compute hasMore without expensive count queries.
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, movie_id, type, message, created_at, is_read")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .range(from, from + limit);

    if (error) {
      return json(res, 500, { error: "Failed to fetch notifications." });
    }

    const rows = Array.isArray(data) ? data : [];
    const hasMore = rows.length > limit;

    return json(res, 200, {
      ok: true,
      data: rows.slice(0, limit),
      pagination: {
        page,
        limit,
        hasMore,
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error", error);
    return json(res, 500, { error: "Internal server error." });
  }
}

async function getUnreadCount(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const auth = await authenticateAndEnforce(req, res, "notifications-unread-count");
  if (!auth) return undefined;

  try {
    const supabase = getSupabaseAdminClient();

    // Head query returns only count metadata for an efficient unread counter endpoint.
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .eq("is_read", false);

    if (error) {
      return json(res, 500, { error: "Failed to fetch unread count." });
    }

    return json(res, 200, {
      ok: true,
      unreadCount: Number(count ?? 0),
    });
  } catch (error) {
    console.error("GET /api/notifications/unread-count error", error);
    return json(res, 500, { error: "Internal server error." });
  }
}

async function markNotificationRead(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const auth = await authenticateAndEnforce(req, res, "notifications-mark-read");
  if (!auth) return undefined;

  const body = parseBody(req);
  const notificationId = normalizeString(body?.notification_id);

  if (!notificationId) {
    return json(res, 400, { error: "notification_id is required." });
  }

  if (!UUID_REGEX.test(notificationId)) {
    return json(res, 400, { error: "notification_id must be a valid UUID." });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", auth.userId)
      .select("id, is_read")
      .maybeSingle();

    if (error) {
      return json(res, 500, { error: "Failed to update notification." });
    }

    if (!data) {
      return json(res, 404, { error: "Notification not found." });
    }

    return json(res, 200, {
      ok: true,
      message: "Notification marked as read.",
      data,
    });
  } catch (error) {
    console.error("POST /api/notifications/mark-read error", error);
    return json(res, 500, { error: "Internal server error." });
  }
}

export default function handler(req, res) {
  switch (getAction(req)) {
    case "unread-count":
      return getUnreadCount(req, res);
    case "mark-read":
      return markNotificationRead(req, res);
    case "list":
      return listNotifications(req, res);
    default:
      return json(res, 404, { error: "Not Found" });
  }
}
