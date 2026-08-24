import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import {
  normalizeWatchedYearRange,
  type WatchedYearRange,
} from "@/lib/watchedYearRange";
import type { EnrichedUserMedia } from "@/types/enriched-media";
import {
  getEnrichedMediaCountries,
  getEnrichedMediaDate,
  getEnrichedMediaLanguage,
  getEnrichedMediaType,
  getEnrichedMediaYear,
  type EnrichedMediaType,
} from "@/types/enriched-media";

const ALL = "all";

export function useWatchedFilters(language: string) {
  const { watched, loading: userListsLoading } = useUserLists();
  const [filterLang, setFilterLang] = useState<string>(ALL);
  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterCountry, setFilterCountry] = useState<string>(ALL);
  const [filterYear, setFilterYearState] = useState<WatchedYearRange>([
    1900,
    new Date().getFullYear(),
  ]);
  const hasInitializedYearRange = useRef(false);

  const detailsQuery = useQuery({
    queryKey: [
      "watched-details",
      watched.map(
        (item) =>
          `${item.mediaType}-${item.mediaId || item.id}`,
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

  const filterOptions = useMemo(() => {
    const sourceItems =
      mediaDetails.length > 0
        ? mediaDetails
        : (watched as unknown as EnrichedUserMedia[]);

    const langs = Array.from(
      new Set(
        sourceItems
          .map((item) => getEnrichedMediaLanguage(item))
          .filter(
            (entry): entry is string =>
              typeof entry === "string" && entry.trim() !== "",
          ),
      ),
    ).sort();

    const types = Array.from(
      new Set(
        sourceItems
          .map((item) => getEnrichedMediaType(item))
          .filter(
            (entry): entry is EnrichedMediaType =>
              entry === "movie" || entry === "tv" || entry === "person",
          ),
      ),
    ).sort();

    const countries = Array.from(
      new Set(sourceItems.flatMap((item) => getEnrichedMediaCountries(item))),
    ).sort();

    const years = sourceItems
      .map((item) => getEnrichedMediaYear(item))
      .filter((year): year is number => year !== null);

    return {
      langs,
      types,
      countries,
      minYear: years.length ? Math.min(...years) : 1900,
      maxYear: years.length ? Math.max(...years) : new Date().getFullYear(),
    };
  }, [mediaDetails, watched]);

  useEffect(() => {
    if (watched.length === 0) {
      hasInitializedYearRange.current = false;
      return;
    }

    setFilterYearState((current) => {
      if (!hasInitializedYearRange.current) {
        hasInitializedYearRange.current = true;
        return [filterOptions.minYear, filterOptions.maxYear];
      }

      return normalizeWatchedYearRange(current, filterOptions);
    });
  }, [filterOptions, watched.length]);

  const setFilterYear = (nextRange: WatchedYearRange) => {
    setFilterYearState((current) => {
      const normalized = normalizeWatchedYearRange(nextRange, filterOptions);
      return normalized[0] === current[0] && normalized[1] === current[1]
        ? current
        : normalized;
    });
  };

  const clearFilters = () => {
    setFilterLang(ALL);
    setFilterType(ALL);
    setFilterCountry(ALL);
    setFilterYear([filterOptions.minYear, filterOptions.maxYear]);
  };

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
    isLoading: userListsLoading || detailsQuery.isLoading,
    hasWatchedItems: watched.length > 0,
    filteredMedia,
    hasActiveFilters,
  };
}
