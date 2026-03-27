import { json } from "../_lib/http.js";
import { authenticateRequest, getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";
import {
  enforceAuthenticatedRequestSecurity,
  enforceRequestSecurity,
} from "../_lib/requestSecurity.js";
import { reportSecurityEvent } from "../_lib/securityMonitor.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "user-followed");
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
    "user-followed",
    auth.userId,
  );
  if (!authedSecurity.ok) {
    return json(res, authedSecurity.status, { error: authedSecurity.error });
  }

  const userId = normalizeString(req?.query?.user_id);
  if (!userId) {
    return json(res, 400, { error: "user_id query parameter is required." });
  }

  if (!UUID_REGEX.test(userId)) {
    return json(res, 400, { error: "user_id must be a valid UUID." });
  }

  if (auth.userId !== userId) {
    await reportSecurityEvent({
      event: "auth_user_id_mismatch",
      severity: "warning",
      scope: "user-followed",
      message: "Rejected followed titles request due to user_id mismatch.",
      req,
      details: {
        authenticatedUserId: auth.userId,
        requestedUserId: userId,
      },
      shouldAlert: false,
    });
    return json(res, 403, { error: "Forbidden: user_id does not match authenticated user." });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("movie_followers")
      .select("id, user_id, movie_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return json(res, 500, { error: "Failed to fetch followed movies/series." });
    }

    return json(res, 200, {
      ok: true,
      count: Array.isArray(data) ? data.length : 0,
      data: data || [],
    });
  } catch (error) {
    console.error("GET /api/user/followed error", error);
    return json(res, 500, { error: "Internal server error." });
  }
}
