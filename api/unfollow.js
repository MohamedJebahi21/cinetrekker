import { json, parseBody } from "./_lib/http.js";
import { authenticateRequest, getSupabaseAdminClient } from "./_lib/supabaseAdmin.js";
import {
  enforceAuthenticatedRequestSecurity,
  enforceRequestSecurity,
} from "./_lib/requestSecurity.js";
import { reportSecurityEvent } from "./_lib/securityMonitor.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOVIE_ID_REGEX = /^[a-zA-Z0-9:_-]{1,128}$/;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const userId = normalizeString(payload?.user_id);
  const movieId = normalizeString(payload?.movie_id);

  if (!userId || !movieId) {
    return { ok: false, error: "user_id and movie_id are required." };
  }

  if (!UUID_REGEX.test(userId)) {
    return { ok: false, error: "user_id must be a valid UUID." };
  }

  if (!MOVIE_ID_REGEX.test(movieId)) {
    return {
      ok: false,
      error: "movie_id format is invalid. Use 1-128 chars: letters, numbers, :, _, -",
    };
  }

  return { ok: true, userId, movieId };
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "unfollow");
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
    "unfollow",
    auth.userId,
  );
  if (!authedSecurity.ok) {
    return json(res, authedSecurity.status, { error: authedSecurity.error });
  }

  const payload = parseBody(req);
  const validation = validatePayload(payload);
  if (!validation.ok) {
    return json(res, 400, { error: validation.error });
  }

  if (auth.userId !== validation.userId) {
    await reportSecurityEvent({
      event: "auth_user_id_mismatch",
      severity: "warning",
      scope: "unfollow",
      message: "Rejected unfollow request due to user_id mismatch.",
      req,
      details: {
        authenticatedUserId: auth.userId,
        payloadUserId: validation.userId,
      },
      shouldAlert: false,
    });
    return json(res, 403, { error: "Forbidden: user_id does not match authenticated user." });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("movie_followers")
      .delete()
      .eq("user_id", validation.userId)
      .eq("movie_id", validation.movieId)
      .select("id, user_id, movie_id, created_at");

    if (error) {
      return json(res, 500, { error: "Failed to unfollow movie/series." });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return json(res, 404, { error: "Follow record not found." });
    }

    return json(res, 200, {
      ok: true,
      message: "Successfully unfollowed movie/series.",
      data: data[0],
    });
  } catch (error) {
    console.error("DELETE /api/unfollow error", error);
    return json(res, 500, { error: "Internal server error." });
  }
}
