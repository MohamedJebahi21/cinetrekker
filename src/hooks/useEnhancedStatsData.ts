import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import type { EnrichedUserMedia } from "@/types/enriched-media";
import {
  getEnrichedMediaDate,
  getEnrichedMediaLanguage,
  getEnrichedMediaType,
} from "@/types/enriched-media";

export type MediaTypeFilter = "all" | "movie" | "tv";

type GenreRecord = {
  id: number;
  name: string;
};

export function useEnhancedStatsData(language: string) {
  const { watched } = useUserLists();
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedType, setSelectedType] = useState<MediaTypeFilter>("all");
  const [selectedLang, setSelectedLang] = useState<string>("all");

  const detailsQuery = useQuery({
    queryKey: [
      "enhanced-stats-details",
      watched.map((item) => `${item.mediaType}-${item.mediaId}`),
      language,
    ],
    queryFn: async () =>
      enrichMediaItems(watched, {
        language,
        getReference: (item) => ({
          mediaId: item.mediaId,
          mediaType: item.mediaType,
        }),
        mapExtras: (item) => ({
          userRating: item.rating,
          userNote: item.note,
          userStatus: item.status,
          watchedAt: item.watchedAt,
          addedAt: item.addedAt,
        }),
        logScope: "enhanced-stats",
      }) as Promise<EnrichedUserMedia[]>,
    enabled: watched.length > 0,
  });

  const mediaDetails = useMemo(
    () => (Array.isArray(detailsQuery.data) ? detailsQuery.data : []),
    [detailsQuery.data],
  );

  const years = useMemo(() => {
    const allYears = mediaDetails
      .map((item) => {
        const date = getEnrichedMediaDate(item);
        return date ? new Date(date).getFullYear() : null;
      })
      .filter((year): year is number => year !== null);

    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  }, [mediaDetails]);

  const languages = useMemo(() => {
    const allLanguages = mediaDetails
      .map((item) => getEnrichedMediaLanguage(item))
      .filter((entry): entry is string => Boolean(entry));
    return Array.from(new Set(allLanguages)).sort();
  }, [mediaDetails]);

  const filteredMedia = useMemo(() => {
    return mediaDetails.filter((item) => {
      if (selectedType !== "all" && getEnrichedMediaType(item) !== selectedType) {
        return false;
      }

      if (selectedLang !== "all" && getEnrichedMediaLanguage(item) !== selectedLang) {
        return false;
      }

      if (selectedYear !== "all") {
        const date = getEnrichedMediaDate(item);
        if (!date || new Date(date).getFullYear() !== selectedYear) {
          return false;
        }
      }

      return true;
    });
  }, [mediaDetails, selectedLang, selectedType, selectedYear]);

  const totalMovies = useMemo(
    () => filteredMedia.filter((item) => getEnrichedMediaType(item) === "movie").length,
    [filteredMedia],
  );

  const totalTV = useMemo(
    () => filteredMedia.filter((item) => getEnrichedMediaType(item) === "tv").length,
    [filteredMedia],
  );

  const totalEpisodes = useMemo(
    () =>
      filteredMedia.reduce((sum, item) => {
        if (getEnrichedMediaType(item) === "tv") {
          return sum + (item.number_of_episodes ?? 1);
        }
        return sum + 1;
      }, 0),
    [filteredMedia],
  );

  const totalHours = useMemo(
    () =>
      filteredMedia.reduce((sum, item) => {
        const minutes =
          getEnrichedMediaType(item) === "movie"
            ? item.runtime ?? 0
            : (item.episode_run_time?.[0] ?? item.runtime ?? 45) *
              (item.number_of_episodes ?? 1);
        return sum + minutes / 60;
      }, 0),
    [filteredMedia],
  );

  const genreStats = useMemo(() => {
    const map = new Map<number, { name: string; count: number; hours: number }>();

    filteredMedia.forEach((item) => {
      const minutes =
        getEnrichedMediaType(item) === "movie"
          ? item.runtime ?? 0
          : (item.episode_run_time?.[0] ?? item.runtime ?? 45) *
            (item.number_of_episodes ?? 1);

      (item.genres ?? []).forEach((genre: GenreRecord) => {
        const existing = map.get(genre.id);
        if (existing) {
          existing.count += 1;
          existing.hours += minutes / 60;
          return;
        }

        map.set(genre.id, {
          name: genre.name,
          count: 1,
          hours: minutes / 60,
        });
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredMedia]);

  return {
    mediaLoading: detailsQuery.isLoading,
    selectedYear,
    setSelectedYear,
    selectedType,
    setSelectedType,
    selectedLang,
    setSelectedLang,
    years,
    languages,
    filteredMedia,
    totalMovies,
    totalTV,
    totalEpisodes,
    totalHours,
    genreStats,
  };
}
