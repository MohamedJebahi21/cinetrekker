import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCandidateSeasons } from "./seasonSelection.ts";

const isDev =
  Deno.env.get("ENVIRONMENT") !== "production" &&
  Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

const ALLOWED_ORIGINS = [
  "https://cinetrekker.vercel.app",
  "https://www.cinetrekker.vercel.app",
  ...(isDev
    ? [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://localhost:4173",
      ]
    : []),
];
const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isLocal = isDev && LOCAL_ORIGIN_PATTERN.test(origin);
  const allowedOrigin =
    ALLOWED_ORIGINS.includes(origin) || isLocal
      ? origin
      : "https://cinetrekker.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface WatchedShow {
  user_id: string;
  media_id: number;
  media_type: string;
}

interface NewEpisode {
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  episode_number: number;
  season_number: number;
  episode_name: string;
  air_date: string;
  episode_id: number;
  overview: string | null;
}

async function checkNewEpisodesForUser(
  userId: string,
  watchedShows: WatchedShow[],
  tmdbApiKey: string,
  watchedEpisodes: Set<string>,
): Promise<NewEpisode[]> {
  const newEpisodes: NewEpisode[] = [];
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < watchedShows.length; i += batchSize) {
    const batch = watchedShows.slice(i, i + batchSize);

    const batchPromises = batch.map(async (show) => {
      try {
        // Fetch TV show details
        const detailsRes = await fetch(
          `https://api.themoviedb.org/3/tv/${show.media_id}?api_key=${tmdbApiKey}`,
        );
        if (!detailsRes.ok) return [];
        const details = await detailsRes.json();

        // Skip ended/canceled shows
        if (details.status === "Ended" || details.status === "Canceled") {
          return [];
        }

        const candidateSeasons = getCandidateSeasons(details);

        const recentEpisodes: NewEpisode[] = [];
        const processedEpisodeKeys = new Set<string>();

        for (const seasonNumber of candidateSeasons) {
          const seasonRes = await fetch(
            `https://api.themoviedb.org/3/tv/${show.media_id}/season/${seasonNumber}?api_key=${tmdbApiKey}`,
          );
          if (!seasonRes.ok) continue;
          const seasonDetails = await seasonRes.json();

          for (const episode of seasonDetails.episodes || []) {
            if (!episode.air_date) continue;

            const airDate = new Date(episode.air_date);
            const isRecent = airDate >= sevenDaysAgo && airDate <= today;
            if (!isRecent) continue;

            const episodeKey = `${show.media_id}-${seasonNumber}-${episode.episode_number}`;
            if (processedEpisodeKeys.has(episodeKey)) continue;
            processedEpisodeKeys.add(episodeKey);

            const isWatched = watchedEpisodes.has(episodeKey);
            if (!isWatched) {
              recentEpisodes.push({
                show_id: show.media_id,
                show_name: details.name,
                show_poster_path: details.poster_path,
                episode_number: episode.episode_number,
                season_number: seasonNumber,
                episode_name: episode.name,
                air_date: episode.air_date,
                episode_id: episode.id,
                overview: episode.overview,
              });
            }
          }
        }

        return recentEpisodes;
      } catch (err) {
        console.error(`Error checking show ${show.media_id}:`, err);
        return [];
      }
    });

    const batchResults = await Promise.all(batchPromises);
    newEpisodes.push(...batchResults.flat());
  }

  return newEpisodes;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const tmdbApiKey = Deno.env.get("TMDB_API_KEY");

    if (!cronSecret || !supabaseUrl || !supabaseServiceRoleKey || !tmdbApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const cronHeader = (req.headers.get("x-cron-secret") || "").trim();

    if (cronHeader !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch all watched TV shows and group them by user.
    const { data: watchedShows, error: watchedShowsError } = await supabase
      .from("user_watched")
      .select("user_id, media_id, media_type")
      .eq("media_type", "tv");

    if (watchedShowsError) {
      throw watchedShowsError;
    }

    const userShows = new Map<string, WatchedShow[]>();
    for (const show of watchedShows || []) {
      const userId = show.user_id;
      if (!userShows.has(userId)) {
        userShows.set(userId, []);
      }
      userShows.get(userId)!.push(show as WatchedShow);
    }

    let totalUpdated = 0;

    // 2. For each user, check for new episodes
    for (const [userId, shows] of userShows.entries()) {
      try {
        // Get watched episodes for this user
        const { data: watchedEps } = await supabase
          .from("watched_episodes")
          .select("show_id, season_number, episode_number")
          .eq("user_id", userId);

        const watchedSet = new Set(
          (watchedEps || []).map(
            (ep) => `${ep.show_id}-${ep.season_number}-${ep.episode_number}`,
          ),
        );

        // Check for new episodes
        const newEpisodes = await checkNewEpisodesForUser(
          userId,
          shows,
          tmdbApiKey,
          watchedSet,
        );

        if (newEpisodes.length > 0) {
          // Store in cache table
          const { error: cacheError } = await supabase
            .from("new_episodes_cache")
            .upsert(
              {
                user_id: userId,
                episodes: newEpisodes,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id",
              },
            );

          if (cacheError) {
            console.error(`Error caching for user ${userId}:`, cacheError);
          } else {
            totalUpdated++;
            console.log(
              `✅ Updated cache for user ${userId}: ${newEpisodes.length} episodes`,
            );
          }
        }
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
      }
    }

    console.log(`🎉 Background check complete: ${totalUpdated} users updated`);

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        processedCount: totalUpdated,
        usersProcessed: userShows.size,
        usersUpdated: totalUpdated,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Background check failed:", error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
