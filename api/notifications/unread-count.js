import { json } from "../_lib/http.js";
import { authenticateRequest, getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";
import { enforceRequestSecurity } from "../_lib/requestSecurity.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "notifications-unread-count");
  if (!security.ok) {
    return json(res, security.status, { error: security.error });
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return json(res, auth.status, { error: auth.error });
  }

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
