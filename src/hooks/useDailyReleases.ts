import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useTitleFollows, type FollowedTitle } from "@/hooks/useTitleFollows";
import {
  getMediaTitle,
  getMovieDetails,
  getTVDetails,
} from "@/services/tmdb";
import type { MediaDetails } from "@/types/media";

interface ReleaseCandidate {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  source: "following" | "watchlist";
}

export interface DailyRelease extends ReleaseCandidate {
  date: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
}

function buildCandidates(
  followedTitles: FollowedTitle[],
  watchlist: Array<{ mediaId: number; mediaType: "movie" | "tv" }>,
): ReleaseCandidate[] {
  const candidates = new Map<string, ReleaseCandidate>();

  followedTitles.forEach((item) => {
    candidates.set(`${item.mediaType}-${item.mediaId}`, {
      id: item.mediaId,
      mediaType: item.mediaType,
      title: item.title,
      posterPath: item.posterPath,
      source: "following",
    });
  });

  watchlist.forEach((item) => {
    const key = `${item.mediaType}-${item.mediaId}`;
    if (candidates.has(key)) return;

    candidates.set(key, {
      id: item.mediaId,
      mediaType: item.mediaType,
      title: "",
      posterPath: null,
      source: "watchlist",
    });
  });

  return Array.from(candidates.values()).slice(0, 40);
}

async function resolveDailyRelease(
  candidate: ReleaseCandidate,
  language: string,
  todayKey: string,
): Promise<DailyRelease | null> {
  try {
    const details: MediaDetails =
      candidate.mediaType === "movie"
        ? await getMovieDetails(candidate.id, language)
        : await getTVDetails(candidate.id, language);

    const episode = candidate.mediaType === "tv" ? details.next_episode_to_air : null;
    const date = episode?.air_date || details.release_date;

    if (!date || date.slice(0, 10) !== todayKey) {
      return null;
    }

    return {
      ...candidate,
      title: getMediaTitle(details) || candidate.title || "Untitled release",
      posterPath: details.poster_path || candidate.posterPath,
      date,
      seasonNumber: episode?.season_number,
      episodeNumber: episode?.episode_number,
      episodeName: episode?.name,
    };
  } catch {
    return null;
  }
}

export function useDailyReleases() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { watchlist } = useUserLists();
  const { followedTitles } = useTitleFollows();
  const language = i18n.language;
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const candidates = useMemo(
    () => buildCandidates(followedTitles, watchlist),
    [followedTitles, watchlist],
  );

  const query = useQuery({
    queryKey: [
      "home-daily-releases",
      user?.id,
      language,
      todayKey,
      candidates.map((candidate) => `${candidate.mediaType}-${candidate.id}`),
    ],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      if (candidates.length === 0) return [] as DailyRelease[];

      const results = await Promise.all(
        candidates.map((candidate) =>
          resolveDailyRelease(candidate, language, todayKey),
        ),
      );

      return results
        .filter((item): item is DailyRelease => item !== null)
        .sort((left, right) => {
          if (left.source !== right.source) {
            return left.source === "following" ? -1 : 1;
          }
          return left.title.localeCompare(right.title);
        });
    },
  });

  const releases = query.data ?? [];

  return {
    releases,
    releaseCount: releases.length,
    hasCandidates: candidates.length > 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
