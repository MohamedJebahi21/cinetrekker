import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import type { EnrichedUserMedia } from "@/types/enriched-media";
import {
  getEnrichedMediaCountries,
  getEnrichedMediaDate,
  getEnrichedMediaLanguage,
  getEnrichedMediaType,
  getEnrichedMediaYear,
} from "@/types/enriched-media";

const ALL = "all";

export function useWatchedFilters(language: string) {
  const { watched } = useUserLists();
  const [filterLang, setFilterLang] = useState<string>(ALL);
  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterCountry, setFilterCountry] = useState<string>(ALL);
  const [filterYear, setFilterYear] = useState<[number, number]>([
    1900,
    new Date().getFullYear(),
  ]);

  const filterOptions = useMemo(() => {
    const langs = Array.from(
      new Set(
        watched
          .map((item) => item.original_language ?? item.originalLanguage)
          .filter(
            (entry): entry is string =>
              typeof entry === "string" && entry.trim() !== "",
          ),
      ),
    ).sort();

    const types = Array.from(
      new Set(
        watched
          .map((item) => item.media_type ?? item.mediaType)
          .filter(
            (entry): entry is string =>
              typeof entry === "string" && entry.trim() !== "",
          ),
      ),
    ).sort();

    const countries = Array.from(
      new Set(watched.flatMap((item) => getEnrichedMediaCountries(item as EnrichedUserMedia))),
    ).sort();

    const years = watched
      .map((item) => getEnrichedMediaYear(item as EnrichedUserMedia))
      .filter((year): year is number => year !== null);

    return {
      langs,
      types,
      countries,
      minYear: years.length ? Math.min(...years) : 1900,
      maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    };
  }, [watched]);

  useEffect(() => {
    setFilterYear([filterOptions.minYear, filterOptions.maxYear]);
  }, [filterOptions.maxYear, filterOptions.minYear]);

  const clearFilters = () => {
    setFilterLang(ALL);
    setFilterType(ALL);
    setFilterCountry(ALL);
    setFilterYear([filterOptions.minYear, filterOptions.maxYear]);
  };

  const detailsQuery = useQuery({
    queryKey: [
      "watched-details",
      watched.map(
        (item) =>
          `${item.mediaType || item.media_type}-${item.mediaId || item.id}`,
      ),
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
      }) as Promise<EnrichedUserMedia[]>,
    enabled: watched.length > 0,
  });

  const mediaDetails = useMemo(
    () => (Array.isArray(detailsQuery.data) ? detailsQuery.data : []),
    [detailsQuery.data],
  );

  const filteredMedia = useMemo(() => {
    return mediaDetails
      .filter((media) => {
        const year = getEnrichedMediaYear(media);
        const matchesLang =
          filterLang === ALL || getEnrichedMediaLanguage(media) === filterLang;
        const matchesType =
          filterType === ALL || getEnrichedMediaType(media) === filterType;
        const matchesCountry =
          filterCountry === ALL ||
          getEnrichedMediaCountries(media).includes(filterCountry);
        const matchesYear =
          year !== null && year >= filterYear[0] && year <= filterYear[1];

        return matchesLang && matchesType && matchesCountry && matchesYear;
      })
      .sort((a, b) => getEnrichedMediaDate(b).localeCompare(getEnrichedMediaDate(a)));
  }, [filterCountry, filterLang, filterType, filterYear, mediaDetails]);

  const hasActiveFilters =
    filterLang !== ALL ||
    filterType !== ALL ||
    filterCountry !== ALL ||
    filterYear[0] !== filterOptions.minYear ||
    filterYear[1] !== filterOptions.maxYear;

  return {
    ALL,
    filterLang,
    setFilterLang,
    filterType,
    setFilterType,
    filterCountry,
    setFilterCountry,
    filterYear,
    setFilterYear,
    filterOptions,
    clearFilters,
    isLoading: detailsQuery.isLoading,
    filteredMedia,
    hasActiveFilters,
  };
}
