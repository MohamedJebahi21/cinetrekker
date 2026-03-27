import { json } from "./_lib/http.js";
import { authenticateRequest, getSupabaseAdminClient } from "./_lib/supabaseAdmin.js";
import {
  enforceAuthenticatedRequestSecurity,
  enforceRequestSecurity,
} from "./_lib/requestSecurity.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return num;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "notifications-list");
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
    "notifications-list",
    auth.userId,
  );
  if (!authedSecurity.ok) {
    return json(res, authedSecurity.status, { error: authedSecurity.error });
  }

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
