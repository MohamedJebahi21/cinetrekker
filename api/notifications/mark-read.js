import { json, parseBody } from "../_lib/http.js";
import { authenticateRequest, getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";
import {
  enforceAuthenticatedRequestSecurity,
  enforceRequestSecurity,
} from "../_lib/requestSecurity.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "notifications-mark-read");
  if (!security.ok) {
    return json(res, security.status, { error: security.error });
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return json(res, auth.status, { error: auth.error });
  }

  const authedSecurity = await enforceAuthenticatedRequestSecurity(
    req,
    res,
    "notifications-mark-read",
    auth.userId,
  );
  if (!authedSecurity.ok) {
    return json(res, authedSecurity.status, { error: authedSecurity.error });
  }

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
