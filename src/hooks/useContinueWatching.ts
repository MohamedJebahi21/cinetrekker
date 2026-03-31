import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTVDetails, getTVSeasonDetails } from "@/services/tmdb";
import { useUserLists } from "@/contexts/UserListsContext";
import { useWatchedEpisodes, type WatchedEpisode } from "@/hooks/useFollowedShows";
import type { MediaDetails, TVEpisodeInfo } from "@/types/media";

type ContinueWatchingEpisode = TVEpisodeInfo & {
  isUpcoming?: boolean;
};

export type ContinueWatchingItem = {
  details: MediaDetails;
  watchedEpisodeCount: number;
  progressPercent: number;
  nextEpisode: ContinueWatchingEpisode | null;
  lastWatchedEpisode: WatchedEpisode | null;
};

function isReleased(airDate?: string | null) {
  if (!airDate) return false;
  return new Date(airDate).getTime() <= Date.now();
}

async function findNextEpisode(
  details: MediaDetails,
  watchedEpisodes: WatchedEpisode[],
  language: string,
) {
  const watchedSet = new Set(
    watchedEpisodes.map(
      (episode) => `${episode.season_number}-${episode.episode_number}`,
    ),
  );
  const seasons = (details.seasons ?? [])
    .filter((season) => season.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number);
  const firstRelevantSeason = watchedEpisodes.length
    ? Math.max(
        1,
        Math.min(...watchedEpisodes.map((episode) => episode.season_number)),
      )
    : 1;

  for (const season of seasons.filter(
    (season) => season.season_number >= firstRelevantSeason,
  )) {
    const seasonDetails = await getTVSeasonDetails(
      details.id,
      season.season_number,
      language,
    );

    const nextReleased = (seasonDetails.episodes ?? []).find((episode) => {
      if (!isReleased(episode.air_date)) return false;
      return !watchedSet.has(
        `${episode.season_number}-${episode.episode_number}`,
      );
    });

    if (nextReleased) {
      return nextReleased;
    }
  }

  if (details.next_episode_to_air) {
    return {
      ...details.next_episode_to_air,
      isUpcoming: true,
    };
  }

  return null;
}

export function useContinueWatching(language: string) {
  const { watched } = useUserLists();
  const { watchedEpisodes } = useWatchedEpisodes();

  const activeShows = useMemo(() => {
    const showIdsFromEpisodes = new Set(watchedEpisodes.map((item) => item.show_id));
    return watched.filter((item) => {
      if (item.mediaType !== "tv") return false;
      return item.status === "watching" || showIdsFromEpisodes.has(item.mediaId);
    });
  }, [watched, watchedEpisodes]);

  return useQuery({
    queryKey: [
      "continue-watching-v2",
      activeShows.map((item) => item.mediaId),
      watchedEpisodes.map(
        (item) =>
          `${item.show_id}-${item.season_number}-${item.episode_number}-${item.watched_at}`,
      ),
      language,
    ],
    queryFn: async () => {
      const items = await Promise.all(
        activeShows.map(async (show) => {
          const details = await getTVDetails(show.mediaId, language);
          const showEpisodes = watchedEpisodes
            .filter((episode) => episode.show_id === show.mediaId)
            .sort((a, b) => {
              if (a.season_number !== b.season_number) {
                return a.season_number - b.season_number;
              }
              return a.episode_number - b.episode_number;
            });
          const lastWatchedEpisode =
            showEpisodes.length > 0 ? showEpisodes[showEpisodes.length - 1] : null;
          const nextEpisode = await findNextEpisode(
            details,
            showEpisodes,
            language,
          );
          const watchedEpisodeCount = showEpisodes.length;
          
          // If there's no next episode, or the only next episode is upcoming, 
          // the user has watched all currently released episodes.
          const isCaughtUp = !nextEpisode || ('isUpcoming' in nextEpisode && nextEpisode.isUpcoming);
          
          const totalEpisodes = isCaughtUp 
            ? watchedEpisodeCount 
            : Math.max(details.number_of_episodes ?? 0, 1);
            
          const progressPercent = isCaughtUp 
            ? 100 
            : Math.min(100, Math.round((watchedEpisodeCount / totalEpisodes) * 100));

          return {
            details,
            watchedEpisodeCount,
            progressPercent,
            nextEpisode: nextEpisode as ContinueWatchingEpisode | null,
            lastWatchedEpisode,
          } satisfies ContinueWatchingItem;
        }),
      );

      return items
        .filter(
          (item) =>
            item.progressPercent < 100 &&
            (item.nextEpisode || item.lastWatchedEpisode),
        )
        .sort((a, b) => {
          const aDate =
            a.nextEpisode?.air_date ??
            a.lastWatchedEpisode?.watched_at ??
            a.details.first_air_date ??
            "";
          const bDate =
            b.nextEpisode?.air_date ??
            b.lastWatchedEpisode?.watched_at ??
            b.details.first_air_date ??
            "";
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
    },
    enabled: activeShows.length > 0,
  });
}
