export interface EpisodeAirInfo {
  season_number?: number | null;
}

export interface ShowSeasonSelectionInfo {
  number_of_seasons?: number | null;
  last_episode_to_air?: EpisodeAirInfo | null;
}

/**
 * Returns likely season numbers that can contain the most recently aired episodes.
 * This guards against TMDB states where `number_of_seasons` is ahead of
 * `last_episode_to_air.season_number`.
 */
export function getCandidateSeasons(details: ShowSeasonSelectionInfo): number[] {
  const candidateSeasons = new Set<number>();

  const currentSeason = Number(details.number_of_seasons) || 1;
  if (currentSeason >= 1) candidateSeasons.add(currentSeason);
  if (currentSeason - 1 >= 1) candidateSeasons.add(currentSeason - 1);

  const lastEpisodeSeason = Number(details?.last_episode_to_air?.season_number);
  if (Number.isFinite(lastEpisodeSeason) && lastEpisodeSeason >= 1) {
    candidateSeasons.add(lastEpisodeSeason);
    if (lastEpisodeSeason - 1 >= 1) candidateSeasons.add(lastEpisodeSeason - 1);
  }

  return Array.from(candidateSeasons).sort((a, b) => b - a);
}
