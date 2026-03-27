import { json } from "../_lib/http.js";
import { getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";
import { getServerEnv } from "../_lib/env.js";
import { createServerLogger } from "../_lib/logger.js";
import { reportSecurityEvent } from "../_lib/securityMonitor.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_BATCH_SIZE = 5;
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

async function fetchTmdbDetails(mediaType, tmdbId, tmdbApiKey) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const response = await fetch(
    `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${encodeURIComponent(tmdbApiKey)}&language=en-US`,
  );

  if (!response.ok) {
    throw new Error(
      `TMDB request failed (${response.status}) for ${endpoint}-${tmdbId}`,
    );
  }

  return response.json();
}

function toDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  return value.slice(0, 10);
}

function normalizeStatus(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
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

  const lastEp = details?.last_episode_to_air || null;
  return {
    movie_id: parsed.movieKey,
    media_type: "tv",
    tmdb_id: parsed.tmdbId,
    release_date: toDateOnly(details?.first_air_date),
    status: typeof details?.status === "string" ? details.status : null,
    number_of_seasons: Number.isFinite(Number(details?.number_of_seasons))
      ? Number(details.number_of_seasons)
      : null,
    last_episode_air_date: toDateOnly(lastEp?.air_date),
    last_episode_season_number: Number.isFinite(Number(lastEp?.season_number))
      ? Number(lastEp.season_number)
      : null,
    last_episode_number: Number.isFinite(Number(lastEp?.episode_number))
      ? Number(lastEp.episode_number)
      : null,
  };
}

function createChangeEvents(prev, next, title) {
  const events = [];

  if (
    prev?.release_date &&
    next.release_date &&
    prev.release_date !== next.release_date
  ) {
    events.push({
      type: "release_date_changed",
      message: `${title} release date updated to ${next.release_date}.`,
      eventKey: `${next.movie_id}:release_date:${next.release_date}`,
    });
  }

  if (prev?.status && next.status && prev.status !== next.status) {
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
    Number.isFinite(prev?.number_of_seasons) &&
    next.number_of_seasons > prev.number_of_seasons
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
    (!Number.isFinite(prev?.last_episode_season_number) ||
      !Number.isFinite(prev?.last_episode_number) ||
      next.last_episode_season_number > prev.last_episode_season_number ||
      (next.last_episode_season_number === prev.last_episode_season_number &&
        next.last_episode_number > prev.last_episode_number));

  if (hasNewEpisode) {
    events.push({
      type: "new_episode",
      message: `${title} S${next.last_episode_season_number}E${next.last_episode_number} is now available.`,
      eventKey: `${next.movie_id}:episode:${next.last_episode_season_number}-${next.last_episode_number}`,
    });
  }

  return events;
}

async function insertNotifications(supabase, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,event_key", ignoreDuplicates: true });

  if (error) {
    throw error;
  }

  return rows.length;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method Not Allowed" });
  }

  if (!isAuthorizedCronCall(req)) {
    await reportSecurityEvent({
      event: "cron_access_denied",
      severity: "critical",
      scope: "check-followed-updates",
      message: "Cron endpoint rejected unauthorized access.",
      req,
      details: {
        hasCronHeader:
          typeof req?.headers?.["x-cron-secret"] === "string" &&
          req.headers["x-cron-secret"].trim().length > 0,
      },
      shouldAlert: true,
    });
    return json(res, 401, { error: "Unauthorized" });
  }

  const tmdbApiKey = getServerEnv("TMDB_API_KEY");
  if (!tmdbApiKey) {
    return json(res, 500, {
      error: "TMDB_API_KEY or VITE_TMDB_API_KEY is missing.",
    });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: follows, error: followsError } = await supabase
      .from("movie_followers")
      .select("user_id, movie_id");

    if (followsError) {
      return json(res, 500, { error: "Failed to read followed movies." });
    }

    const followRows = Array.isArray(follows) ? follows : [];
    if (followRows.length === 0) {
      return json(res, 200, {
        ok: true,
        processedTitles: 0,
        notificationsCreated: 0,
        message: "No followed movies to process.",
      });
    }

    const followersByMovie = new Map();
    for (const row of followRows) {
      const key = row.movie_id;
      if (!followersByMovie.has(key)) followersByMovie.set(key, []);
      followersByMovie.get(key).push(row);
    }

    const movieKeys = Array.from(followersByMovie.keys());
    const parsedKeys = movieKeys.map(parseMovieKey).filter(Boolean);

    const followerUserIds = Array.from(
      new Set(followRows.map((row) => row.user_id).filter(Boolean)),
    );

    const { data: existingStates, error: stateError } = await supabase
      .from("followed_title_state_user")
      .select("*")
      .in("user_id", followerUserIds)
      .in(
        "movie_id",
        parsedKeys.map((parsed) => parsed.movieKey),
      );

    if (stateError) {
      return json(res, 500, { error: "Failed to read title state." });
    }

    const stateByUserMovieId = new Map(
      (existingStates || []).map((state) => [
        `${state.user_id}|${state.movie_id}`,
        state,
      ]),
    );

    let processedTitles = 0;
    let notificationsCreated = 0;
    let errors = 0;

    for (let index = 0; index < parsedKeys.length; index += DEFAULT_BATCH_SIZE) {
      const batch = parsedKeys.slice(index, index + DEFAULT_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (parsed) => {
          try {
            const details = await fetchTmdbDetails(
              parsed.mediaType,
              parsed.tmdbId,
              tmdbApiKey,
            );
            const title =
              parsed.mediaType === "tv"
                ? String(details?.name || `TV ${parsed.tmdbId}`)
                : String(details?.title || `Movie ${parsed.tmdbId}`);

            const nextSnapshot = getSnapshotFromTmdb(parsed, details);
            const followers = followersByMovie.get(parsed.movieKey) || [];
            const notificationsToInsert = [];
            const stateRowsToUpsert = [];

            for (const follower of followers) {
              const stateKey = `${follower.user_id}|${parsed.movieKey}`;
              const prevSnapshot = stateByUserMovieId.get(stateKey) || null;
              const events = prevSnapshot
                ? createChangeEvents(prevSnapshot, nextSnapshot, title)
                : [];

              for (const event of events) {
                notificationsToInsert.push({
                  user_id: follower.user_id,
                  movie_id: nextSnapshot.movie_id,
                  type: event.type,
                  message: event.message,
                  event_key: event.eventKey,
                });
              }

              const nextStateForUser = {
                user_id: follower.user_id,
                ...nextSnapshot,
                updated_at: new Date().toISOString(),
              };
              stateRowsToUpsert.push(nextStateForUser);
              stateByUserMovieId.set(stateKey, nextStateForUser);
            }

            const inserted = await insertNotifications(
              supabase,
              notificationsToInsert,
            );

            const { error: upsertError } = await supabase
              .from("followed_title_state_user")
              .upsert(stateRowsToUpsert, { onConflict: "user_id,movie_id" });

            if (upsertError) {
              throw upsertError;
            }

            return { processed: 1, inserted, error: 0 };
          } catch (error) {
            logger.error(`Failed processing ${parsed.movieKey}`, error);
            return { processed: 1, inserted: 0, error: 1 };
          }
        }),
      );

      for (const item of batchResults) {
        processedTitles += item.processed;
        notificationsCreated += item.inserted;
        errors += item.error;
      }
    }

    return json(res, 200, {
      ok: true,
      processedTitles,
      notificationsCreated,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("POST /api/jobs/check-followed-updates error", error);
    return json(res, 500, { error: "Internal server error." });
  }
}
