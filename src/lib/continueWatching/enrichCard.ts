import type { ContinueWatchingVM, EpisodeKey } from "@/types/continueWatching";
import { getNextEpisode } from "./nextEpisode";
import { batchResolveSeasons, batchResolveTVDetails } from "./tmdbResolver";

function baseHrefFromItem(item: ContinueWatchingVM): string {
  const queryIndex = item.href.indexOf("?");
  return queryIndex === -1 ? item.href : item.href.slice(0, queryIndex);
}

export async function enrichContinueWatchingCard(
  item: ContinueWatchingVM,
  watchedEpisodeKeys: Set<EpisodeKey>,
  language: string,
): Promise<ContinueWatchingVM> {
  if (!item.needsSeasonEnrichment) return item;

  const startSeason = item.lastWatchedEpisode?.season ?? 1;
  const detailsMap = await batchResolveTVDetails([item.showId], language);
  const details = detailsMap.get(item.showId);
  if (!details) {
    return { ...item, needsSeasonEnrichment: false };
  }

  const maxSeason = details.number_of_seasons ?? startSeason + 1;
  const seasonRequests = [{ showId: item.showId, seasonNumber: startSeason }];
  const nextSeason = startSeason + 1;
  if (nextSeason > 0 && nextSeason <= maxSeason) {
    seasonRequests.push({ showId: item.showId, seasonNumber: nextSeason });
  }

  const seasons = await batchResolveSeasons(seasonRequests, language);
  const episodesBySeason: Record<
    number,
    Array<{
      season_number: number;
      episode_number: number;
      name?: string;
      air_date?: string | null;
      runtime?: number | null;
      overview?: string;
      still_path?: string | null;
      vote_average?: number;
    }>
  > = {};

  for (const request of seasonRequests) {
    const seasonKey = `season:${item.showId}:${request.seasonNumber}:${language}`;
    const season = seasons.get(seasonKey);
    if (!season?.episodes) continue;

    episodesBySeason[request.seasonNumber] = season.episodes.map((ep) => ({
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      name: ep.name,
      air_date: ep.air_date,
      runtime: ep.runtime,
      overview: ep.overview,
      still_path: ep.still_path,
      vote_average: ep.vote_average,
    }));
  }

  const nextResult = getNextEpisode({
    lastWatched: item.lastWatchedEpisode,
    watchedSet: watchedEpisodeKeys,
    seasons: details.seasons?.filter((season) => season.season_number !== 0) ?? [],
    episodesBySeason,
    details: {
      number_of_episodes: details.number_of_episodes,
      number_of_seasons: details.number_of_seasons,
      next_episode_to_air: details.next_episode_to_air ?? null,
      in_production: details.in_production,
      status: details.status,
    },
  });

  const nextEpisode = nextResult?.episode ?? null;
  const baseHref = baseHrefFromItem(item);

  return {
    ...item,
    needsSeasonEnrichment: false,
    nextEpisodeLabel: nextEpisode
      ? `S${nextEpisode.season_number}E${nextEpisode.episode_number}`
      : item.nextEpisodeLabel,
    nextEpisodeSeasonNumber: nextEpisode?.season_number ?? item.nextEpisodeSeasonNumber,
    nextEpisodeNumber: nextEpisode?.episode_number ?? item.nextEpisodeNumber,
    nextEpisodeName: nextEpisode?.name ?? item.nextEpisodeName,
    nextEpisodeAirDate: nextEpisode?.air_date ?? item.nextEpisodeAirDate,
    nextEpisodeIsUpcoming: nextResult?.isUpcoming ?? item.nextEpisodeIsUpcoming,
    href:
      nextEpisode && !nextResult?.isUpcoming
        ? `${baseHref}?season=${nextEpisode.season_number}`
        : baseHref,
  };
}
