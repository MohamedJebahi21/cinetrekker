import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTVDetails, getTVSeasonDetails } from "@/services/tmdb";
import {
  useFollowedShows,
  useWatchedEpisodes,
  type WatchedEpisode,
} from "@/hooks/useFollowedShows";
import { useWatchedQuery } from "@/hooks/useWatchedQueries";
import type { MediaDetails, TVEpisodeInfo } from "@/types/media";

type ContinueWatchingEpisode = TVEpisodeInfo & {
  isUpcoming?: boolean;
};

type ActiveContinueWatchingShow = {
  mediaId: number;
  title: string;
  posterPath: string | null;
  lastActivityAt: string | null;
  lastWatchedEpisode: WatchedEpisode | null;
  watchedEpisodeCount: number;
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

function buildFallbackDetails(show: ActiveContinueWatchingShow): MediaDetails {
  return {
    id: show.mediaId,
    name: show.title,
    original_name: show.title,
    overview: "",
    poster_path: show.posterPath,
    backdrop_path: null,
    vote_average: 0,
    vote_count: 0,
    popularity: 0,
    first_air_date: "",
    origin_country: [],
    media_type: "tv",
  } as MediaDetails;
}

async function findNextEpisode(
  details: MediaDetails,
  watchedEpisodes: WatchedEpisode[],
  language: string,
  lastWatchedEpisode: WatchedEpisode | null,
) {
  const watchedSet = new Set(
    watchedEpisodes.map(
      (episode) => `${episode.season_number}-${episode.episode_number}`,
    ),
  );
  const candidateSeasonNumber = lastWatchedEpisode?.season_number ?? 1;

  const checkSeason = async (seasonNumber: number) => {
    const seasonDetails = await getTVSeasonDetails(
      details.id,
      seasonNumber,
      language,
    );
    const nextReleased = (seasonDetails.episodes ?? []).find((episode) => {
      if (!isReleased(episode.air_date)) return false;
      if (
        lastWatchedEpisode &&
        episode.season_number === lastWatchedEpisode.season_number &&
        episode.episode_number <= lastWatchedEpisode.episode_number
      ) {
        return false;
      }
      return !watchedSet.has(`${episode.season_number}-${episode.episode_number}`);
    });

    return nextReleased ?? null;
  };

  const currentSeasonEpisode = await checkSeason(candidateSeasonNumber);
  if (currentSeasonEpisode) {
    return currentSeasonEpisode;
  }

  if (lastWatchedEpisode) {
    const nextSeason = (details.seasons ?? []).find(
      (season) => season.season_number === lastWatchedEpisode.season_number + 1,
    );

    if (nextSeason) {
      const nextSeasonEpisode = await checkSeason(nextSeason.season_number);
      if (nextSeasonEpisode) {
        return nextSeasonEpisode;
      }
    }
  }

  if (details.next_episode_to_air && isReleased(details.next_episode_to_air.air_date)) {
    return {
      ...details.next_episode_to_air,
    };
  }

  return null;
}

export function useContinueWatching(language: string) {
  const { followedShows } = useFollowedShows();
  const { watchedEpisodes } = useWatchedEpisodes();
  const { data: watchedItems = [] } = useWatchedQuery();

  const completedTvShowIds = useMemo(() => {
    return new Set(
      watchedItems
        .filter(
          (item) =>
            item.mediaType === "tv" && item.status === "completed",
        )
        .map((item) => item.mediaId),
    );
  }, [watchedItems]);

  const activeShows = useMemo(() => {
    const watchedByShow = new Map<number, WatchedEpisode[]>();
    watchedEpisodes.forEach((episode) => {
      const current = watchedByShow.get(episode.show_id) ?? [];
      watchedByShow.set(episode.show_id, [...current, episode]);
    });

    const followedByShow = new Map(
      followedShows.map((show) => [show.show_id, show] as const),
    );

    return Array.from(
      new Set<number>([
        ...watchedByShow.keys(),
        ...followedByShow.keys(),
      ]),
    )
      .map((showId: number): ActiveContinueWatchingShow | null => {
        if (completedTvShowIds.has(showId)) return null;

        const episodes = (watchedByShow.get(showId) ?? []).sort((a, b) => {
          if (a.season_number !== b.season_number) {
            return a.season_number - b.season_number;
          }
          return a.episode_number - b.episode_number;
        });
        const followed = followedByShow.get(showId);
        const watchedEpisodeCount = episodes.length;

        if (watchedEpisodeCount === 0) return null;

        const lastWatchedEpisode =
          episodes.at(-1) ??
          (followed
            ? {
                id: followed.id,
                user_id: followed.user_id,
                show_id: followed.show_id,
                season_number: followed.last_watched_season,
                episode_number: followed.last_watched_episode,
                episode_name: null,
                air_date: null,
                watched_at: followed.followed_at,
              }
            : null);

        return {
          mediaId: showId,
          title: followed?.show_name ?? `Show ${showId}`,
          posterPath: followed?.poster_path ?? null,
          lastActivityAt:
            episodes.at(-1)?.watched_at ?? followed?.followed_at ?? null,
          lastWatchedEpisode,
          watchedEpisodeCount,
        };
      })
      .filter((show): show is ActiveContinueWatchingShow => Boolean(show))
      .sort((a, b) => {
        const aTs = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bTs = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return bTs - aTs;
      })
      .slice(0, 4);
  }, [completedTvShowIds, followedShows, watchedEpisodes]);

  return useQuery({
    queryKey: [
      "continue-watching-v4",
      activeShows.map(
        (item) =>
          `${item.mediaId}-${item.lastActivityAt ?? "none"}-${item.title}-${item.posterPath ?? "noposter"}`,
      ),
      watchedEpisodes.map(
        (item) =>
          `${item.show_id}-${item.season_number}-${item.episode_number}-${item.watched_at}`,
      ),
      followedShows.map(
        (item) =>
          `${item.show_id}-${item.show_name}-${item.last_watched_season}-${item.last_watched_episode}-${item.followed_at}`,
      ),
      watchedItems.map(
        (item: { mediaId: number; mediaType: string; status?: string }) =>
          `${item.mediaId}-${item.mediaType}-${item.status ?? "none"}`,
      ),
      language,
    ],
    queryFn: async () => {
      const items = await Promise.allSettled(
        activeShows.map(async (show) => {
          const showEpisodes = watchedEpisodes
            .filter((episode) => episode.show_id === show.mediaId)
            .sort((a, b) => {
              if (a.season_number !== b.season_number) {
                return a.season_number - b.season_number;
              }
              return a.episode_number - b.episode_number;
            });
          const lastWatchedEpisode =
            showEpisodes.length > 0
              ? showEpisodes[showEpisodes.length - 1]
              : show.lastWatchedEpisode;
          const details = await withTimeout(
            getTVDetails(show.mediaId, language),
            5000,
          );
          const resolvedDetails =
            details ?? buildFallbackDetails(show);
          const nextEpisode = details
            ? await findNextEpisode(
                details,
                showEpisodes,
                language,
                lastWatchedEpisode,
              )
            : null;
          const watchedEpisodeCount = showEpisodes.length;
          const totalEpisodes = details?.number_of_episodes ?? 0;
          const progressPercent =
            totalEpisodes > 0
              ? Math.min(
                  99,
                  Math.round((watchedEpisodeCount / totalEpisodes) * 100),
                )
              : Math.min(95, Math.max(15, watchedEpisodeCount * 15));

          return {
            details: resolvedDetails,
            watchedEpisodeCount,
            progressPercent,
            nextEpisode: nextEpisode as ContinueWatchingEpisode | null,
            lastWatchedEpisode,
            lastActivityAt: show.lastActivityAt,
          } satisfies ContinueWatchingItem;
        }),
      );

      const fulfilledItems = items
        .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
        .filter((item): item is ContinueWatchingItem => Boolean(item));

      return fulfilledItems
        .filter((item) => item.watchedEpisodeCount > 0)
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
