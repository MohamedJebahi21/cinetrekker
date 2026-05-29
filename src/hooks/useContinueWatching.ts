import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTVDetails, getTVSeasonDetails } from "@/services/tmdb";
import { mapWithConcurrency } from "@/lib/requestUtils";
import {
  useWatchedEpisodes,
  type WatchedEpisode,
} from "@/hooks/useFollowedShows";
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
  lastActivityAt: string | null;
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
        Math.max(...watchedEpisodes.map((episode) => episode.season_number)),
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
  const { watchedEpisodes } = useWatchedEpisodes();

  const activeShows = useMemo(() => {
    const byId = new Map<number, { mediaId: number; lastActivityAt: string | null }>();
    watchedEpisodes.forEach((episode) => {
      const existing = byId.get(episode.show_id);
      const nextActivityAt = [existing?.lastActivityAt, episode.watched_at]
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

      byId.set(episode.show_id, {
        mediaId: episode.show_id,
        lastActivityAt: nextActivityAt,
      });
    });

    return Array.from(byId.values());
  }, [watchedEpisodes]);

  return useQuery({
    queryKey: [
      "continue-watching-v3",
      activeShows.map((item) => `${item.mediaId}-${item.lastActivityAt ?? "none"}`),
      watchedEpisodes.map(
        (item) =>
          `${item.show_id}-${item.season_number}-${item.episode_number}-${item.watched_at}`,
      ),
      language,
    ],
    queryFn: async () => {
      const items = await mapWithConcurrency(activeShows, 3, async (show) => {
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
        const hasReleasedNextEpisode =
          Boolean(nextEpisode) &&
          !("isUpcoming" in (nextEpisode ?? {})) &&
          Boolean(nextEpisode);
        const totalEpisodes = hasReleasedNextEpisode
          ? Math.max(details.number_of_episodes ?? 0, watchedEpisodeCount, 1)
          : Math.max(watchedEpisodeCount, 1);
        const progressPercent = hasReleasedNextEpisode
          ? Math.min(99, Math.round((watchedEpisodeCount / totalEpisodes) * 100))
          : 100;

        return {
          details,
          watchedEpisodeCount,
          progressPercent,
          nextEpisode: nextEpisode as ContinueWatchingEpisode | null,
          lastWatchedEpisode,
          lastActivityAt: show.lastActivityAt,
        } satisfies ContinueWatchingItem;
      });

      return items
        .filter(
          (item) =>
            item.watchedEpisodeCount > 0 &&
            Boolean(item.nextEpisode) &&
            item.nextEpisode?.isUpcoming !== true,
        )
        .sort((a, b) => {
          const aDate =
            a.nextEpisode?.air_date ??
            a.lastActivityAt ??
            a.lastWatchedEpisode?.watched_at ??
            a.details.first_air_date ??
            "";
          const bDate =
            b.nextEpisode?.air_date ??
            b.lastActivityAt ??
            b.lastWatchedEpisode?.watched_at ??
            b.details.first_air_date ??
            "";
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
    },
    enabled: activeShows.length > 0,
  });
}
