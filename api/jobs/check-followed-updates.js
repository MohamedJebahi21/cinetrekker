import { json } from "../_lib/http.js";
import { getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";
import { getServerEnv } from "../_lib/env.js";
import { createServerLogger } from "../_lib/logger.js";
import { reportSecurityEvent } from "../_lib/securityMonitor.js";
import { reportOperationalEvent } from "../_lib/operationalMonitor.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const WORKER_NAME = "followed-title-updates";
const DEFAULT_BATCH_SIZE = 12;
const MAX_BATCH_SIZE = 50;
const TMDB_TIMEOUT_MS = 4000;
const NOTIFICATION_RETENTION_DAYS = 90;
const logger = createServerLogger("check-followed-updates");

function isAuthorizedCronCall(req) {
  const cronSecret = getServerEnv("CRON_SECRET");
  if (!cronSecret) return false;

  const cronHeader =
    typeof req?.headers?.["x-cron-secret"] === "string"
      ? req.headers["x-cron-secret"].trim()
      : "";

  return cronHeader === cronSecret;
}

function getBatchSize() {
  const configured = Number.parseInt(getServerEnv("NOTIFICATION_WORKER_BATCH_SIZE") || "", 10);
  if (!Number.isFinite(configured)) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.max(configured, 1), MAX_BATCH_SIZE);
}

function parseMovieKey(movieId) {
  const raw = typeof movieId === "string" ? movieId.trim() : "";
  const match = raw.match(/^(movie|tv)-(\d+)$/i);
  if (!match) return null;

  return {
    movieKey: raw,
    mediaType: match[1].toLowerCase(),
    tmdbId: Number.parseInt(match[2], 10),
  };
}

function toDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  return value.slice(0, 10);
}

function normalizeStatus(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function getExpiryIso(now = Date.now()) {
  return new Date(now + NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchTmdbDetails(mediaType, tmdbId, tmdbApiKey) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${encodeURIComponent(tmdbApiKey)}&language=en-US`,
      { signal: controller.signal },
    );
    if (!response.ok) {
      throw new Error(`TMDB request failed (${response.status}) for ${endpoint}-${tmdbId}`);
    }
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

function getSnapshotFromTmdb(parsed, details) {
  if (parsed.mediaType === "movie") {
    return {
      movie_id: parsed.movieKey,
      media_type: "movie",
      tmdb_id: parsed.tmdbId,
      release_date: toDateOnly(details?.release_date),
      status: typeof details?.status === "string" ? details.status : null,
      number_of_seasons: null,
      last_episode_air_date: null,
      last_episode_season_number: null,
      last_episode_number: null,
    };
  }

  const lastEpisode = details?.last_episode_to_air || null;
  return {
    movie_id: parsed.movieKey,
    media_type: "tv",
    tmdb_id: parsed.tmdbId,
    release_date: toDateOnly(details?.first_air_date),
    status: typeof details?.status === "string" ? details.status : null,
    number_of_seasons: Number.isFinite(Number(details?.number_of_seasons))
      ? Number(details.number_of_seasons)
      : null,
    last_episode_air_date: toDateOnly(lastEpisode?.air_date),
    last_episode_season_number: Number.isFinite(Number(lastEpisode?.season_number))
      ? Number(lastEpisode.season_number)
      : null,
    last_episode_number: Number.isFinite(Number(lastEpisode?.episode_number))
      ? Number(lastEpisode.episode_number)
      : null,
  };
}

function createChangeEvents(previous, next, title) {
  const events = [];

  if (previous?.release_date && next.release_date && previous.release_date !== next.release_date) {
    events.push({
      type: "release_date_changed",
      message: `${title} release date updated to ${next.release_date}.`,
      eventKey: `${next.movie_id}:release_date:${next.release_date}`,
    });
  }

  if (previous?.status && next.status && previous.status !== next.status) {
    const normalizedStatus = normalizeStatus(next.status);
    events.push({
      type: "status_changed",
      message: `${title} status changed to ${next.status}.`,
      eventKey: `${next.movie_id}:status:${normalizedStatus}`,
    });
  }

  if (
    next.media_type === "tv" &&
    Number.isFinite(next.number_of_seasons) &&
    Number.isFinite(previous?.number_of_seasons) &&
    next.number_of_seasons > previous.number_of_seasons
  ) {
    events.push({
      type: "new_season",
      message: `${title} Season ${next.number_of_seasons} confirmed.`,
      eventKey: `${next.movie_id}:season:${next.number_of_seasons}`,
    });
  }

  const hasNewEpisode =
    next.media_type === "tv" &&
    Number.isFinite(next.last_episode_season_number) &&
    Number.isFinite(next.last_episode_number) &&
    (!Number.isFinite(previous?.last_episode_season_number) ||
      !Number.isFinite(previous?.last_episode_number) ||
      next.last_episode_season_number > previous.last_episode_season_number ||
      (next.last_episode_season_number === previous.last_episode_season_number &&
        next.last_episode_number > previous.last_episode_number));

  if (hasNewEpisode) {
    events.push({
      type: "new_episode",
      message: `${title} S${next.last_episode_season_number}E${next.last_episode_number} is now available.`,
      eventKey: `${next.movie_id}:episode:${next.last_episode_season_number}-${next.last_episode_number}`,
    });
  }

  return events;
}

async function readWorkerState(supabase) {
  const { data, error } = await supabase
    .from("notification_worker_state")
    .select("cursor_movie_id")
    .eq("worker_name", WORKER_NAME)
    .maybeSingle();

  if (error) throw error;
  return data || { cursor_movie_id: null };
}

async function writeWorkerState(supabase, values) {
  const { error } = await supabase
    .from("notification_worker_state")
    .upsert({ worker_name: WORKER_NAME, updated_at: new Date().toISOString(), ...values }, { onConflict: "worker_name" });
  if (error) throw error;
}

async function readTitlePage(supabase, cursor, batchSize) {
  const { data, error } = await supabase.rpc("notification_followed_title_batch", {
    after_movie_id: cursor || null,
    batch_size: batchSize,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map((row) => row.movie_id).filter(Boolean) : [];
}

async function readPreferences(supabase, userIds) {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("user_id,release_updates")
    .in("user_id", userIds);
  if (error) throw error;
  return new Map((data || []).map((row) => [row.user_id, row.release_updates !== false]));
}

async function insertNotifications(supabase, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const { error } = await supabase
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,event_key", ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}

async function processTitle({ supabase, parsed, tmdbApiKey, followers, stateByUserMovieId, releaseUpdatesByUser }) {
  const details = await fetchTmdbDetails(parsed.mediaType, parsed.tmdbId, tmdbApiKey);
  const title = parsed.mediaType === "tv"
    ? String(details?.name || `TV ${parsed.tmdbId}`)
    : String(details?.title || `Movie ${parsed.tmdbId}`);
  const nextSnapshot = getSnapshotFromTmdb(parsed, details);
  const now = new Date().toISOString();
  const expiresAt = getExpiryIso();
  const notificationsToInsert = [];
  const stateRowsToUpsert = [];

  for (const follower of followers) {
    const stateKey = `${follower.user_id}|${parsed.movieKey}`;
    const previous = stateByUserMovieId.get(stateKey) || null;
    const events = previous ? createChangeEvents(previous, nextSnapshot, title) : [];
    const releaseUpdatesEnabled = releaseUpdatesByUser.get(follower.user_id) !== false;

    if (releaseUpdatesEnabled) {
      for (const event of events) {
        notificationsToInsert.push({
          user_id: follower.user_id,
          movie_id: nextSnapshot.movie_id,
          type: event.type,
          message: event.message,
          event_key: event.eventKey,
          group_key: `${nextSnapshot.movie_id}:${event.type}`,
          expires_at: expiresAt,
        });
      }
    }

    const nextStateForUser = {
      user_id: follower.user_id,
      ...nextSnapshot,
      updated_at: now,
    };
    stateRowsToUpsert.push(nextStateForUser);
    stateByUserMovieId.set(stateKey, nextStateForUser);
  }

  const inserted = await insertNotifications(supabase, notificationsToInsert);
  const { error: stateError } = await supabase
    .from("followed_title_state_user")
    .upsert(stateRowsToUpsert, { onConflict: "user_id,movie_id" });
  if (stateError) throw stateError;

  return inserted;
}

export const __testables = {
  getBatchSize,
  parseMovieKey,
  getExpiryIso,
  getSnapshotFromTmdb,
  createChangeEvents,
  NOTIFICATION_RETENTION_DAYS,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

  if (!isAuthorizedCronCall(req)) {
    await reportSecurityEvent({
      event: "cron_access_denied",
      severity: "critical",
      scope: "check-followed-updates",
      message: "Cron endpoint rejected unauthorized access.",
      req,
      details: { hasCronHeader: typeof req?.headers?.["x-cron-secret"] === "string" },
      shouldAlert: true,
    });
    return json(res, 401, { error: "Unauthorized" });
  }

  const tmdbApiKey = getServerEnv("TMDB_API_KEY");
  if (!tmdbApiKey) return json(res, 500, { error: "Scheduled content configuration is unavailable." });

  try {
    const supabase = getSupabaseAdminClient();
    const batchSize = getBatchSize();
    const state = await readWorkerState(supabase);
    await writeWorkerState(supabase, { last_started_at: new Date().toISOString(), last_error_code: null });

    let movieIds = await readTitlePage(supabase, state.cursor_movie_id, batchSize);
    let cursorReset = false;
    if (movieIds.length === 0 && state.cursor_movie_id) {
      cursorReset = true;
      movieIds = await readTitlePage(supabase, null, batchSize);
    }

    if (movieIds.length === 0) {
      await writeWorkerState(supabase, {
        cursor_movie_id: null,
        last_completed_at: new Date().toISOString(),
      });
      return json(res, 200, { ok: true, processedTitles: 0, notificationsCreated: 0, cursorReset });
    }

    const parsedTitles = movieIds.map(parseMovieKey).filter(Boolean);
    const validMovieIds = parsedTitles.map((title) => title.movieKey);
    const { data: followerRows, error: followersError } = await supabase
      .from("movie_followers")
      .select("user_id,movie_id")
      .in("movie_id", validMovieIds);
    if (followersError) throw followersError;

    const followersByMovie = new Map();
    for (const follower of followerRows || []) {
      const current = followersByMovie.get(follower.movie_id) || [];
      current.push(follower);
      followersByMovie.set(follower.movie_id, current);
    }

    const userIds = [...new Set((followerRows || []).map((row) => row.user_id))];
    const releaseUpdatesByUser = await readPreferences(supabase, userIds);
    const { data: snapshotRows, error: snapshotsError } = await supabase
      .from("followed_title_state_user")
      .select("*")
      .in("movie_id", validMovieIds);
    if (snapshotsError) throw snapshotsError;

    const stateByUserMovieId = new Map(
      (snapshotRows || []).map((row) => [`${row.user_id}|${row.movie_id}`, row]),
    );
    let notificationsCreated = 0;
    let errors = 0;

    const FUNCTION_DEADLINE_MS = 8000;
    const workerStartedAt = Date.now();
    let deadlineReached = false;

    for (let i = 0; i < parsedTitles.length; i++) {
      if (Date.now() - workerStartedAt > FUNCTION_DEADLINE_MS) {
        deadlineReached = true;
        logger.warn("Approaching function execution deadline; stopping title batch early.");
        break;
      }
      const parsed = parsedTitles[i];
      try {
        notificationsCreated += await processTitle({
          supabase,
          parsed,
          tmdbApiKey,
          followers: followersByMovie.get(parsed.movieKey) || [],
          stateByUserMovieId,
          releaseUpdatesByUser,
        });
      } catch (error) {
        errors += 1;
        logger.error(`Failed processing ${parsed.movieKey}`, error);
      }
    }

    const nextCursor = deadlineReached
      ? parsedTitles[Math.max(0, notificationsCreated > 0 ? notificationsCreated - 1 : 0)]?.movieKey || movieIds[0]
      : (movieIds.length >= batchSize ? movieIds[movieIds.length - 1] : null);
    await writeWorkerState(supabase, {
      cursor_movie_id: nextCursor,
      last_completed_at: nextCursor ? null : new Date().toISOString(),
      last_error_at: errors ? new Date().toISOString() : null,
      last_error_code: errors ? "title_processing_failed" : null,
    });

    await reportOperationalEvent({
      event: "notification_worker_completed",
      severity: errors ? "warning" : "info",
      scope: "check-followed-updates",
      message: "Scheduled notification worker completed a bounded title page.",
      req,
      details: { processedTitles: parsedTitles.length, notificationsCreated, errors, cursorReset, hasNextPage: Boolean(nextCursor) },
      shouldAlert: false,
    });

    return json(res, 200, {
      ok: true,
      processedTitles: parsedTitles.length,
      notificationsCreated,
      errors,
      cursorReset,
      hasNextPage: Boolean(nextCursor),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("POST /api/jobs/check-followed-updates error", error);
    await reportOperationalEvent({
      event: "notification_worker_failed",
      severity: "error",
      scope: "check-followed-updates",
      message: "Scheduled notification worker failed before completing its bounded page.",
      req,
      details: {},
      shouldAlert: true,
    });
    return json(res, 500, { error: "Internal server error." });
  }
}
