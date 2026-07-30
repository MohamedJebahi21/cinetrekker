import { supabase } from "@/integrations/supabase/client";

export interface MarkTvEpisodeInput {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName?: string | null;
  airDate?: string | null;
  showName?: string | null;
  posterPath?: string | null;
}

export interface BatchTvEpisodeInput {
  showId: number;
  episodes: Array<{
    season_number: number;
    episode_number: number;
    episode_name?: string | null;
    air_date?: string | null;
  }>;
  showName?: string | null;
  posterPath?: string | null;
  lastWatchedSeason?: number | null;
  lastWatchedEpisode?: number | null;
  watchedStatus?: "watching" | "completed";
}

export async function markTvEpisodeWatched(input: MarkTvEpisodeInput): Promise<void> {
  const { error } = await supabase.rpc("mark_tv_episode_watched", {
    p_show_id: input.showId,
    p_season_number: input.seasonNumber,
    p_episode_number: input.episodeNumber,
    p_episode_name: input.episodeName ?? null,
    p_air_date: input.airDate ?? null,
    p_show_name: input.showName ?? null,
    p_poster_path: input.posterPath ?? null,
  });

  if (error) throw error;
}

export async function removeTvEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  const { error } = await supabase.rpc("remove_tv_episode_watched", {
    p_show_id: showId,
    p_season_number: seasonNumber,
    p_episode_number: episodeNumber,
  });

  if (error) throw error;
}

export async function markTvEpisodesBatch(input: BatchTvEpisodeInput): Promise<void> {
  const { error } = await supabase.rpc("mark_tv_episodes_batch", {
    p_show_id: input.showId,
    p_episodes: input.episodes,
    p_show_name: input.showName ?? null,
    p_poster_path: input.posterPath ?? null,
    p_last_watched_season: input.lastWatchedSeason ?? null,
    p_last_watched_episode: input.lastWatchedEpisode ?? null,
    p_watched_status: input.watchedStatus ?? "watching",
  });

  if (error) throw error;
}
