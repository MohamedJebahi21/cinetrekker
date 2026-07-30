import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { WatchedEpisode } from "@/hooks/useFollowedShows";
import { enrichContinueWatchingCard } from "@/lib/continueWatching/enrichCard";
import { toEpisodeKey } from "@/lib/continueWatching/progress";
import type { ContinueWatchingVM, EpisodeKey } from "@/types/continueWatching";

function hashShowWatchedKeys(
  watchedEpisodes: WatchedEpisode[],
  showId: number,
): string {
  let h = 2166136261 >>> 0;
  const episodes = watchedEpisodes
    .filter((episode) => episode.show_id === showId)
    .sort((a, b) => {
      if (a.season_number !== b.season_number) {
        return a.season_number - b.season_number;
      }
      return a.episode_number - b.episode_number;
    });

  for (const episode of episodes) {
    const value = `${episode.season_number}-${episode.episode_number}`;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
  }

  return h.toString(16);
}

export function useContinueWatchingCardEnrichment(
  item: ContinueWatchingVM,
  watchedEpisodes: WatchedEpisode[],
  enabled: boolean,
) {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const watchedKeys = useMemo(() => {
    const keys = new Set<EpisodeKey>();
    for (const episode of watchedEpisodes) {
      if (episode.show_id === item.showId) {
        keys.add(toEpisodeKey(episode.season_number, episode.episode_number));
      }
    }
    return keys;
  }, [item.showId, watchedEpisodes]);

  const watchedKeysHash = useMemo(
    () => hashShowWatchedKeys(watchedEpisodes, item.showId),
    [item.showId, watchedEpisodes],
  );

  return useQuery({
    queryKey: [
      "cw-card-enrich",
      item.showId,
      item.lastWatchedEpisode?.season ?? 0,
      item.lastWatchedEpisode?.episode ?? 0,
      item.watchedEpisodeCount,
      watchedKeysHash,
      language,
    ],
    queryFn: () => enrichContinueWatchingCard(item, watchedKeys, language),
    enabled: enabled && item.needsSeasonEnrichment,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
