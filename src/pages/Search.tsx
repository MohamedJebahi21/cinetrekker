import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Search as SearchIcon,
  Filter,
  SlidersHorizontal,
  X,
  TrendingUp,
  Check,
  ChevronDown,
} from "lucide-react";
import SEO from "@/components/SEO";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  searchCatalogTitles,
  getMovieGenres,
  getTVGenres,
  discoverMovies,
  discoverTV,
  getTrending,
} from "@/services/tmdb";
import { Media } from "@/types/media";
import { LoadMoreMediaGrid } from "@/components/MediaGrid";
import SkeletonCard from "@/components/ui/SkeletonCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaType, Genre } from "@/types/media";
import { useDebounce } from "@/hooks/useDebounce";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { FAQSection } from "@/components/FAQSection";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
} from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { safeT } from "@/lib/i18n";
import { getSearchHistory, type SearchHistoryItem } from "@/lib/searchHistory";
import {
  combineDiscoverResponses,
  tagDiscoverResponse,
  type PagedDiscoverMedia,
} from "@/lib/discoverResults";
import { createLogger } from "@/lib/logger";

const LANGUAGES = [
  { code: "en", key: "search.langOptions.english", fallback: "English" },
  { code: "es", key: "search.langOptions.spanish", fallback: "Spanish" },
  { code: "fr", key: "search.langOptions.french", fallback: "French" },
  { code: "de", key: "search.langOptions.german", fallback: "German" },
  { code: "it", key: "search.langOptions.italian", fallback: "Italian" },
  { code: "pt", key: "search.langOptions.portuguese", fallback: "Portuguese" },
  { code: "ja", key: "search.langOptions.japanese", fallback: "Japanese" },
  { code: "ko", key: "search.langOptions.korean", fallback: "Korean" },
  { code: "zh", key: "search.langOptions.chinese", fallback: "Chinese" },
  { code: "ar", key: "search.langOptions.arabic", fallback: "Arabic" },
  { code: "hi", key: "search.langOptions.hindi", fallback: "Hindi" },
  { code: "tr", key: "search.langOptions.turkish", fallback: "Turkish" },
  { code: "ru", key: "search.langOptions.russian", fallback: "Russian" },
];

// Runtime options
const RUNTIMES = [
  {
    id: "short",
    key: "search.runtimeOptions.short",
    fallback: "Quick Watch (< 90 min)",
    gte: "0",
    lte: "90",
  },
  {
    id: "medium",
    key: "search.runtimeOptions.medium",
    fallback: "Standard (90-120 min)",
    gte: "90",
    lte: "120",
  },
  {
    id: "long",
    key: "search.runtimeOptions.long",
    fallback: "Epic (2h+)",
    gte: "120",
    lte: "500",
  },
];

// Streaming services (common provider IDs)
const STREAMING_SERVICES = [
  { id: "8",    key: "search.streamingOptions.netflix",      fallback: "Netflix",     logo: "t2yyOgLhmQRz6xQs8eoxSRCCGnj.jpg" },
  { id: "9",    key: "search.streamingOptions.amazonPrime",  fallback: "Amazon Prime",logo: "ifhbNuuVnlwYy5oXA5VIb2YR8AZ.jpg" },
  { id: "337",  key: "search.streamingOptions.disneyPlus",  fallback: "Disney+",     logo: "7rwgEs15tFwyR9NPzi8FMC6odC9e.jpg" },
  { id: "1899", key: "search.streamingOptions.max",          fallback: "Max",         logo: "Ajqn9O2dF6MERf7Z4mTWuDFjEJR.jpg" },
  { id: "15",   key: "search.streamingOptions.hulu",         fallback: "Hulu",        logo: "zxrVdFjIjLqkfnwyghnveA7fAfk.jpg" },
  { id: "350",  key: "search.streamingOptions.appleTv",      fallback: "Apple TV+",  logo: "6uhKBfmtzFqOcLousHwZuzcrScK.jpg" },
  { id: "531",  key: "search.streamingOptions.paramount",    fallback: "Paramount+", logo: "fi83B1oztoS47xxcemFdPHqDL9K.jpg" },
  { id: "387",  key: "search.streamingOptions.peacock",      fallback: "Peacock",    logo: "8VCV78prwd9IPHfl8O6OlmKrmq7.jpg" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) =>
  (currentYear - i).toString(),
);

const PENDING_SEARCH_QUERY_KEY = "cinetrekker_pending_search_query";
const logger = createLogger("search");

type SearchSortOption =
  | "popularity.desc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "original_title.asc";

const ALLOWED_SORTS = new Set<SearchSortOption>([
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
  "original_title.asc",
]);

function normalizeSortBy(value: string): SearchSortOption {
  const normalized = value.trim().toLowerCase();

  // Backward compatibility for legacy sort aliases used in older links.
  const aliases: Record<string, SearchSortOption> = {
    popularity: "popularity.desc",
    top_rated: "vote_average.desc",
    rating: "vote_average.desc",
    newest: "primary_release_date.desc",
    latest: "primary_release_date.desc",
    title_asc: "original_title.asc",
  };

  if (normalized in aliases) {
    return aliases[normalized];
  }

  return ALLOWED_SORTS.has(normalized as SearchSortOption)
    ? (normalized as SearchSortOption)
    : "popularity.desc";
}

function getMediaYear(item: Media): string {
  const date = item.release_date || item.first_air_date;
  return typeof date === "string" && date.length >= 4 ? date.slice(0, 4) : "";
}

function getMediaDateValue(item: Media): number {
  return new Date(
    item.release_date || item.first_air_date || "1900-01-01",
  ).getTime();
}

function sortClientResults(items: Media[], sortBy: SearchSortOption): Media[] {
  const sorted = [...items];

  switch (sortBy) {
    case "vote_average.desc":
      sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      break;
    case "primary_release_date.desc":
      sorted.sort((a, b) => getMediaDateValue(b) - getMediaDateValue(a));
      break;
    case "original_title.asc":
      sorted.sort((a, b) =>
        (a.title || a.name || "").localeCompare(
          b.title || b.name || "",
          undefined,
          { sensitivity: "base" },
        ),
      );
      break;
    case "popularity.desc":
    default:
      sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
  }

  return sorted;
}

function getDiscoverSort(
  sortBy: SearchSortOption,
  mediaType: "movie" | "tv",
): string {
  if (sortBy === "primary_release_date.desc") {
    return mediaType === "tv"
      ? "first_air_date.desc"
      : "primary_release_date.desc";
  }
  if (sortBy === "original_title.asc") {
    return mediaType === "tv" ? "name.asc" : "original_title.asc";
  }
  return sortBy;
}

type MultiSelectOption = {
  id: string;
  label: string;
  logo?: string;
};

function parseMultiValue(value: string | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function serializeMultiValue(values: string[]): string {
  return values.join(",");
}

function toggleMultiValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function dedupeMedia(items: Media[]): Media[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const mediaType = item.media_type || ("title" in item ? "movie" : "tv");
    const key = `${mediaType}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function SearchMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  allLabel,
  t,
}: {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  allLabel: string;
  t: TFunction;
}) {
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.id))
    .map((option) => option.label);

  const summary =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between bg-background/50 px-3 font-normal"
            aria-label={t("search.openMultiSelect", "Choose {{label}} filters", { label })}
          >
            {selectedValues.length > 0 ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                {options
                  .filter(o => selectedValues.includes(o.id))
                  .slice(0, 3)
                  .map(o => o.logo ? (
                    <img
                      key={o.id}
                      src={`https://image.tmdb.org/t/p/w45/${o.logo}`}
                      alt={o.label}
                      className="h-5 w-5 rounded-sm object-cover"
                    />
                  ) : (
                    <span key={o.id} className="text-xs">{o.label}</span>
                  ))}
                {selectedValues.length > 3 && <span className="text-xs text-muted-foreground">+{selectedValues.length - 3}</span>}
              </span>
            ) : (
              <span className="truncate text-left text-muted-foreground">{summary}</span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              {t("search.multiSelectHint", "Select one or more options.")}
            </p>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              aria-pressed={selectedValues.length === 0}
              className={cn(
                "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedValues.length === 0 ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
              )}
            >
              <div className="flex h-4 w-4 items-center justify-center rounded border border-border">
                {selectedValues.length === 0 && <Check className="h-3 w-3" />}
              </div>
              <span>{allLabel}</span>
            </button>
            {options.map((option) => {
              const checked = selectedValues.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    checked ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      onChange(toggleMultiValue(selectedValues, option.id))
                    }
                    aria-label={
                      checked
                        ? t("search.removeOptionAria", "Remove {{label}}", {
                            label: option.label,
                          })
                        : t("search.selectOptionAria", "Select {{label}}", {
                            label: option.label,
                          })
                    }
                  />
                  {option.logo ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w45/${option.logo}`}
                      alt={option.label}
                      className="h-6 w-6 rounded-md object-cover flex-shrink-0"
                    />
                  ) : null}
                  <span className="flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function Search() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const fallbackSubmittedQueryRef = useRef(
    (
      location.state as
        | {
            submittedQuery?: string;
          }
        | undefined
    )?.submittedQuery ||
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SEARCH_QUERY_KEY) || ""
        : ""),
  );

  // Initialize from URL params
  const initialQuery =
    searchParams.get("q") ||
    searchParams.get("query") ||
    fallbackSubmittedQueryRef.current ||
    "";
  const initialType = (searchParams.get("type") as MediaType) || "all";
  const initialGenres = parseMultiValue(searchParams.get("genre"));
  const initialYear = searchParams.get("year") || "";
  const initialLanguages = parseMultiValue(searchParams.get("lang"));
  const initialSort = normalizeSortBy(
    searchParams.get("sort") || "popularity.desc",
  );
  const initialRuntime = searchParams.get("runtime") || "";
  const initialStreaming = parseMultiValue(searchParams.get("streaming"));

  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);
  const normalizedInputQuery = useMemo(
    () => query.normalize("NFKC").trim().toLowerCase(),
    [query],
  );
  const normalizedQuery = useMemo(
    () => debouncedQuery.normalize("NFKC").trim().toLowerCase(),
    [debouncedQuery],
  );
  const [mediaTypeFilter, setMediaTypeFilter] =
    useState<MediaType>(initialType);
  const [genreFilters, setGenreFilters] = useState<string[]>(initialGenres);
  const [yearFilter, setYearFilter] = useState<string>(initialYear);
  const [languageFilters, setLanguageFilters] =
    useState<string[]>(initialLanguages);
  const [sortBy, setSortBy] = useState<SearchSortOption>(initialSort);
  const [runtimeFilter, setRuntimeFilter] = useState<string>(initialRuntime);
  const [streamingFilters, setStreamingFilters] =
    useState<string[]>(initialStreaming);
  const normalizedLocationSearch = useMemo(
    () => new URLSearchParams(location.search).toString(),
    [location.search],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextQuery =
      params.get("q") ||
      params.get("query") ||
      "";
    const nextType = (params.get("type") as MediaType) || "all";
    const nextGenres = parseMultiValue(params.get("genre"));
    const nextYear = params.get("year") || "";
    const nextLanguages = parseMultiValue(params.get("lang"));
    const nextSort = normalizeSortBy(
      params.get("sort") || "popularity.desc",
    );
    const nextRuntime = params.get("runtime") || "";
    const nextStreaming = parseMultiValue(params.get("streaming"));

    if (nextQuery !== query) setQuery(nextQuery);
    if (nextType !== mediaTypeFilter) setMediaTypeFilter(nextType);
    if (nextGenres.join("|") !== genreFilters.join("|")) {
      setGenreFilters(nextGenres);
    }
    if (nextYear !== yearFilter) setYearFilter(nextYear);
    if (nextLanguages.join("|") !== languageFilters.join("|")) {
      setLanguageFilters(nextLanguages);
    }
    if (nextSort !== sortBy) setSortBy(nextSort);
    if (nextRuntime !== runtimeFilter) setRuntimeFilter(nextRuntime);
    if (nextStreaming.join("|") !== streamingFilters.join("|")) {
      setStreamingFilters(nextStreaming);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    location.search,
  ]);

  useEffect(() => {
    const hasUrlQuery = Boolean(
      searchParams.get("q") || searchParams.get("query"),
    );
    const fallbackQuery = fallbackSubmittedQueryRef.current.trim();

    if (!hasUrlQuery && fallbackQuery) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("q", fallbackQuery);
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (normalizedInputQuery) {
      window.sessionStorage.setItem(
        PENDING_SEARCH_QUERY_KEY,
        normalizedInputQuery,
      );
      return;
    }

    if (location.pathname === "/search") {
      window.sessionStorage.removeItem(PENDING_SEARCH_QUERY_KEY);
    }
  }, [location.pathname, normalizedInputQuery]);

  // Quick preview modal removed - navigation to details is used instead

  const language = i18n.language;

  // Update URL params when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (normalizedQuery) params.q = normalizedQuery;
    if (mediaTypeFilter !== "all") params.type = mediaTypeFilter;
    if (genreFilters.length > 0) params.genre = serializeMultiValue(genreFilters);
    if (yearFilter) params.year = yearFilter;
    if (languageFilters.length > 0) {
      params.lang = serializeMultiValue(languageFilters);
    }
    if (sortBy !== "popularity.desc") params.sort = sortBy;
    if (runtimeFilter) params.runtime = runtimeFilter;
    if (streamingFilters.length > 0) {
      params.streaming = serializeMultiValue(streamingFilters);
    }
    const nextParams = new URLSearchParams(params);
    const nextParamsString = nextParams.toString();

    if (normalizedLocationSearch !== nextParamsString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    normalizedQuery,
    mediaTypeFilter,
    genreFilters,
    yearFilter,
    languageFilters,
    sortBy,
    runtimeFilter,
    streamingFilters,
    normalizedLocationSearch,
    setSearchParams,
  ]);

  const { data: movieGenres } = useQuery({
    queryKey: ["genres", "movie", language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["genres", "tv", language],
    queryFn: () => getTVGenres(language),
  });

  // Combine and deduplicate genres
  const allGenres = useMemo(() => {
    const genreMap = new Map<number, Genre>();
    movieGenres?.genres?.forEach((g) => genreMap.set(g.id, g));
    tvGenres?.genres?.forEach((g) => genreMap.set(g.id, g));
    return Array.from(genreMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [movieGenres, tvGenres]);

  // Use genre filter directly
  const effectiveGenres =
    genreFilters.length > 0 ? genreFilters.join("|") : undefined;
  const effectiveLanguages = languageFilters.length > 0 ? languageFilters : [];
  const effectiveStreaming =
    streamingFilters.length > 0 ? streamingFilters.join("|") : undefined;

  // Get runtime params
  const runtimeConfig = runtimeFilter
    ? RUNTIMES.find((r) => r.id === runtimeFilter)
    : undefined;

  // Determine if we should use text search or discover API
  const hasFilters =
    mediaTypeFilter !== "all" ||
    genreFilters.length > 0 ||
    !!yearFilter ||
    languageFilters.length > 0 ||
    !!runtimeFilter ||
    streamingFilters.length > 0;
  const useDiscoverMode = normalizedQuery.length === 0 && hasFilters;
  const useSearchMode = normalizedQuery.length > 0;
  const showTrending = !useDiscoverMode && !useSearchMode;

  // Text search query (infinite)
  const searchQuery = useInfiniteQuery({
    queryKey: ["search", normalizedQuery, language, includeAdult],
    queryFn: ({ pageParam = 1 }) =>
      searchCatalogTitles(
        normalizedQuery,
        pageParam as number,
        language,
        includeAdult,
      ),
    enabled: Boolean(useSearchMode),
    retry: 1,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  // Discover query (combined movies + TV when needed)
  const discoverQuery = useInfiniteQuery<PagedDiscoverMedia>({
    queryKey: [
      "discover",
      mediaTypeFilter,
      genreFilters.join("|"),
      yearFilter,
      languageFilters.join("|"),
      sortBy,
      runtimeConfig?.gte,
      runtimeConfig?.lte,
      streamingFilters.join("|"),
      language,
      includeAdult,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const page = pageParam as number;
      const common = {
        with_genres: effectiveGenres,
        with_runtime_gte: runtimeConfig?.gte,
        with_runtime_lte: runtimeConfig?.lte,
        with_watch_providers: effectiveStreaming,
        watch_region: effectiveStreaming ? "US" : undefined,
      };

      const selectedLanguages = effectiveLanguages.length > 0 ? effectiveLanguages : [undefined];

      const fetchMovieResults = async (selectedLanguage?: string) => {
        const resp = await discoverMovies(
          {
            ...common,
            page,
            primary_release_year: yearFilter || undefined,
            with_original_language: selectedLanguage,
            sort_by: getDiscoverSort(sortBy, "movie"),
            include_adult: includeAdult ? "true" : "false",
          },
          language,
        );
        return tagDiscoverResponse(resp, "movie");
      };

      const fetchTVResults = async (selectedLanguage?: string) => {
        const resp = await discoverTV(
          {
            ...common,
            page,
            first_air_date_year: yearFilter || undefined,
            with_original_language: selectedLanguage,
            sort_by: getDiscoverSort(sortBy, "tv"),
            include_adult: includeAdult ? "true" : "false",
          },
          language,
        );
        return tagDiscoverResponse(resp, "tv");
      };

      if (mediaTypeFilter === "movie") {
        const movieResponses = await Promise.all(
          selectedLanguages.map((selectedLanguage) =>
            fetchMovieResults(selectedLanguage),
          ),
        );
        const combined = combineDiscoverResponses(page, movieResponses);
        return {
          ...combined,
          results: dedupeMedia(combined.results),
        };
      }

      if (mediaTypeFilter === "tv") {
        const tvResponses = await Promise.all(
          selectedLanguages.map((selectedLanguage) =>
            fetchTVResults(selectedLanguage),
          ),
        );
        const combined = combineDiscoverResponses(page, tvResponses);
        return {
          ...combined,
          results: dedupeMedia(combined.results),
        };
      }

      const combinedResponses = await Promise.all(
        selectedLanguages.flatMap((selectedLanguage) => [
            fetchMovieResults(selectedLanguage),
            fetchTVResults(selectedLanguage),
          ]),
      );

      const combined = combineDiscoverResponses(page, combinedResponses);
      return {
        ...combined,
        results: dedupeMedia(combined.results),
      };
    },
    enabled: Boolean(useDiscoverMode),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  // Trending for default view (infinite)
  const trendingQuery = useInfiniteQuery({
    queryKey: ["trending", "all", "week", language, includeAdult],
    queryFn: ({ pageParam = 1 }) =>
      getTrending("all", "week", language, pageParam as number, includeAdult),
    enabled: Boolean(showTrending),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const activeQuery = useSearchMode
    ? searchQuery
    : useDiscoverMode
      ? discoverQuery
      : trendingQuery;
  const isLoading = activeQuery.isLoading;
  const isRefreshingResults =
    (useSearchMode || useDiscoverMode) &&
    activeQuery.isFetching &&
    !activeQuery.isFetchingNextPage;
  const isError = activeQuery.isError;
  const activeError = activeQuery.error as Error | null;
  const hasMore = Boolean(activeQuery.hasNextPage);
  const isLoadingOrRefreshing = isLoading || isRefreshingResults;
  const loadingTimedOut = useLoadingTimeout(isLoadingOrRefreshing, 12000);
  const canonicalQuery = searchParams.toString();
  const searchErrorMessage = loadingTimedOut
    ? t("search.timeout", "Search took too long. Please try again.")
    : t(
        "search.loadError",
        "We couldn't load search results. Please try again.",
      );

  useEffect(() => {
    if (!activeError) {
      return;
    }

    logger.debug("Query failed", activeError);
  }, [activeError]);
  const faqItems = [
    {
      question: t(
        "search.faq.q1",
        "What can I search for in CineTrekker?",
      ),
      answer: t(
        "search.faq.a1",
        "You can search for movies, TV shows, and people, then refine results with genre, year, language, runtime, and streaming filters.",
      ),
    },
    {
      question: t(
        "search.faq.q2",
        "Why use search inside a movie tracker?",
      ),
      answer: t(
        "search.faq.a2",
        "Search is connected to watchlist actions, detail pages, follow tools, and saved progress, so every result is immediately useful instead of isolated.",
      ),
    },
  ];

  const handleLoadMore = () => {
    if (!activeQuery.hasNextPage || activeQuery.isFetchingNextPage) return;
    activeQuery.fetchNextPage();
  };

  // Combine and filter results
  const results = useMemo(() => {
    const pages = activeQuery.data?.pages ?? [];
    const combined = pages.flatMap((page) => page.results || []);

    if (useSearchMode) {
      // Filter search results by type and genre
      let filtered = combined.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      );

      if (mediaTypeFilter !== "all") {
        filtered = filtered.filter(
          (item) => item.media_type === mediaTypeFilter,
        );
      }

      if (genreFilters.length > 0) {
        filtered = filtered.filter((item) =>
          genreFilters.some((genreId) =>
            item.genre_ids?.includes(Number.parseInt(genreId, 10)),
          ),
        );
      }

      if (yearFilter) {
        filtered = filtered.filter((item) => getMediaYear(item) === yearFilter);
      }

      if (languageFilters.length > 0) {
        filtered = filtered.filter(
          (item) =>
            !!item.original_language &&
            languageFilters.includes(item.original_language),
        );
      }

      return sortClientResults(
        applySafetyFilter(filtered, strictFiltering, moderateFiltering),
        sortBy,
      );
    }

    if (useDiscoverMode) {
      return sortClientResults(
        applySafetyFilter(combined, strictFiltering, moderateFiltering),
        sortBy,
      );
    }

    const trending = combined.filter(
      (item) => item.media_type === "movie" || item.media_type === "tv",
    );
    return sortClientResults(
      applySafetyFilter(trending, strictFiltering, moderateFiltering),
      sortBy,
    );
  }, [
    activeQuery.data,
    useSearchMode,
    useDiscoverMode,
    mediaTypeFilter,
    genreFilters,
    yearFilter,
    languageFilters,
    sortBy,
    strictFiltering,
    moderateFiltering,
  ]);

  const clearFilters = () => {
    setMediaTypeFilter("all");
    setGenreFilters([]);
    setYearFilter("");
    setLanguageFilters([]);
    setSortBy("popularity.desc");
    setRuntimeFilter("");
    setStreamingFilters([]);
  };

  const clearSearch = () => {
    setQuery("");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(normalizedInputQuery);
  };

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersRef = useRef<HTMLDivElement | null>(null);
  const [desktopFiltersExpanded, setDesktopFiltersExpanded] = useState(
    initialType !== "all" ||
      initialGenres.length > 0 ||
      Boolean(initialYear) ||
      initialLanguages.length > 0 ||
      initialSort !== "popularity.desc" ||
      Boolean(initialRuntime) ||
      initialStreaming.length > 0,
  );
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const activeFiltersCount = [
    mediaTypeFilter !== "all",
    genreFilters.length > 0,
    yearFilter,
    languageFilters.length > 0,
    runtimeFilter,
    streamingFilters.length > 0,
  ].filter(Boolean).length;

  // Keyboard shortcut: 'f' to open filters on mobile when not focused on input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (
        e.key.toLowerCase() === "f" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        window.innerWidth < 768 &&
        !isEditableTarget
      ) {
        e.preventDefault();
        setMobileFiltersOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // When mobile filters open, scroll to top and focus first control for better UX
  useEffect(() => {
    if (mobileFiltersOpen) {
      const frameId = window.requestAnimationFrame(() => {
        mobileFiltersRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        const first = mobileFiltersRef.current?.querySelector<HTMLElement>(
          "button, input, select",
        );
        first?.focus();
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [mobileFiltersOpen]);

  useEffect(() => {
    setRecentSearches(getSearchHistory().slice(0, 6));
  }, [normalizedLocationSearch]);

  useEffect(() => {
    if (activeFiltersCount > 0) {
      setDesktopFiltersExpanded(true);
    }
  }, [activeFiltersCount]);

  const genreOptions = allGenres.map((genre) => ({
    id: genre.id.toString(),
    label: genre.name,
  }));
  const languageOptions = LANGUAGES.map((lang) => ({
    id: lang.code,
    label: t(lang.key, lang.fallback),
  }));
  const streamingOptions = STREAMING_SERVICES.map((service) => ({
    id: service.id,
    label: t(service.key, service.fallback),
    logo: service.logo,
  }));

  const activeFilterPills = [
    mediaTypeFilter !== "all"
      ? {
          key: "type",
          label: `${t("filters.type")}: ${t(
            mediaTypeFilter === "movie" ? "common.movies" : "common.tvShows",
          )}`,
          ariaLabel: t("search.removeTypeFilter", "Remove type filter"),
          clear: () => setMediaTypeFilter("all"),
        }
      : null,
    ...genreFilters.map((genreId) => ({
      key: `genre-${genreId}`,
      label: genreOptions.find((option) => option.id === genreId)?.label ?? genreId,
      ariaLabel: t("search.removeGenreFilter", "Remove genre filter"),
      clear: () => setGenreFilters((current) => current.filter((item) => item !== genreId)),
    })),
    yearFilter
      ? {
          key: "year",
          label: `${t("filters.year")}: ${yearFilter}`,
          ariaLabel: t("search.removeYearFilter", "Remove year filter"),
          clear: () => setYearFilter(""),
        }
      : null,
    ...languageFilters.map((lang) => ({
      key: `lang-${lang}`,
      label: languageOptions.find((option) => option.id === lang)?.label ?? lang.toUpperCase(),
      ariaLabel: t("search.removeLanguageFilter", "Remove language filter"),
      clear: () => setLanguageFilters((current) => current.filter((item) => item !== lang)),
    })),
    runtimeFilter
      ? {
          key: "runtime",
          label:
            RUNTIMES.find((runtime) => runtime.id === runtimeFilter)?.fallback ??
            runtimeFilter,
          ariaLabel: t("search.removeRuntimeFilter", "Remove runtime filter"),
          clear: () => setRuntimeFilter(""),
        }
      : null,
    ...streamingFilters.map((serviceId) => ({
      key: `streaming-${serviceId}`,
      label:
        streamingOptions.find((option) => option.id === serviceId)?.label ??
        serviceId,
      ariaLabel: t("search.removeStreamingFilter", "Remove streaming filter"),
      clear: () =>
        setStreamingFilters((current) =>
          current.filter((item) => item !== serviceId),
        ),
    })),
  ].filter(Boolean) as Array<{ key: string; label: string; ariaLabel: string; clear: () => void }>;

  // Card click navigates via the card's Link; quick preview removed

  // Filters markup shared by the desktop panel and the mobile drawer.
  // NOTE: this is a plain JSX *element*, not a `() => (...)` component. Defining a
  // component inside render gives it a new function identity on every keystroke
  // (setQuery re-renders Search), which made React unmount/remount the whole
  // filter subtree — closing open dropdowns and dropping focus. An element keeps
  // stable child types, so React reconciles it in place.
  const filtersContent = (
    <>
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="font-semibold">{safeT(t, "search.filters", "Filters")}</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-primary/10 text-primary border-0"
            >
              {activeFiltersCount} {t("search.active")}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground md:hover:text-primary active:text-primary focus-visible:text-primary"
          >
            <X className="w-4 h-4 mr-1" />
            {t("search.clearFilters")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {/* Type Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.type")}
          </label>
          <Select
            value={mediaTypeFilter}
            onValueChange={(v) => setMediaTypeFilter(v as MediaType)}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="movie">{t("common.movies")}</SelectItem>
              <SelectItem value="tv">{t("common.tvShows")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Genre Filter */}
        <SearchMultiSelect
          label={t("filters.genre")}
          options={genreOptions}
          selectedValues={genreFilters}
          onChange={setGenreFilters}
          allLabel={t("common.all")}
          t={t}
        />

        {/* Runtime Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.runtime") || "Runtime"}
          </label>
          <Select
            value={runtimeFilter || "__all__"}
            onValueChange={(v) => setRuntimeFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("common.all")}</SelectItem>
              {RUNTIMES.map((runtime) => (
                <SelectItem key={runtime.id} value={runtime.id}>
                  {t(runtime.key, runtime.fallback)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Streaming Service Filter */}
        <SearchMultiSelect
          label={t("filters.streaming") || "Streaming"}
          options={streamingOptions}
          selectedValues={streamingFilters}
          onChange={setStreamingFilters}
          allLabel={t("common.all")}
          t={t}
        />

        {/* Year Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.year")}
          </label>
          <Select
            value={yearFilter || "__all__"}
            onValueChange={(v) => setYearFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("common.all")}</SelectItem>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Filter */}
        <SearchMultiSelect
          label={t("filters.language")}
          options={languageOptions}
          selectedValues={languageFilters}
          onChange={setLanguageFilters}
          allLabel={t("common.all")}
          t={t}
        />

        {/* Sort */}
        <div className="space-y-1 sm:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("filters.sort")}
          </label>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(normalizeSortBy(v))}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity.desc">
                {t("filters.sortOptions.popularity")}
              </SelectItem>
              <SelectItem value="vote_average.desc">
                {t("filters.sortOptions.rating")}
              </SelectItem>
              <SelectItem value="primary_release_date.desc">
                {t("filters.sortOptions.newest")}
              </SelectItem>
              <SelectItem value="original_title.asc">
                {t("filters.sortOptions.title")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  return (
    <div className="page-container pt-20 pb-24 md:pb-4">
      <SEO
        title={
          query
            ? t(
                "search.seoTitleWithQuery",
                'Search "{{query}}" | CineTrekker Movie Tracker',
                { query },
              )
            : t(
                "search.seoTitleDefault",
                "Search Movies and TV Shows | CineTrekker Movie Tracker",
              )
        }
        description={
          query
            ? t(
                "search.seoDescriptionWithQuery",
                'Search results for "{{query}}" in CineTrekker, the movie tracker for finding movies, TV shows, people, and watchlist-ready picks.',
                { query },
              )
            : t(
                "search.seoDescriptionDefault",
                "Search and discover movies and TV shows by genre, year, rating, runtime, and streaming service in CineTrekker.",
              )
        }
        keywords={
          query
            ? t(
                "search.seoKeywordsWithQuery",
                "{{query}}, movie tracker search, movies, TV shows, streaming",
                { query },
              )
            : t(
                "search.seoKeywordsDefault",
                "movie tracker search, TV show search, genre filter, streaming services, watchlist discovery",
              )
        }
        canonical={
          canonicalQuery
            ? `${buildCanonicalUrl("/search")}?${canonicalQuery}`
            : buildCanonicalUrl("/search")
        }
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.search", "Search"), path: "/search" },
          ]),
          toFaqJsonLd(faqItems),
        ]}
      />
      {/* Search Header */}
      <div className="mb-5 rounded-3xl border border-border/60 bg-[linear-gradient(180deg,hsla(var(--card)/0.9),hsla(var(--card)/0.76))] px-4 py-5 shadow-[0_14px_32px_rgba(0,0,0,0.1)] backdrop-blur-md sm:px-6">
        <div className="max-w-3xl">
          <p className="ct-kicker mb-1">{t("search.discoveryLab", "Discovery Lab")}</p>
          <h1 className="heading-cinematic text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-3xl">
            {t("nav.search")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "search.heroSubtitle",
              "Search by title, then narrow fast with genre, runtime, language, release year, and streaming filters without losing momentum.",
            )}
          </p>
          <p className="mt-1.5 text-xs font-medium text-primary/90">
            {t(
              "search.internationalTitleHint",
              "Original, translated, and alternate international titles are all supported.",
            )}
          </p>
        </div>

        {/* Search Input with Clear Button */}
        <form className="relative mt-4 max-w-3xl" onSubmit={handleSearchSubmit}>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t("search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 h-14 text-lg bg-card/50 border-white/10 rounded-xl focus:border-primary focus:ring-primary/20 transition-all"
            aria-label={t("search.placeholder")}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary transition-all"
              aria-label={t("search.clearSearch", "Clear search")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

      </div>
      {/* Advanced Filters (desktop) */}
      <div className="hidden md:block">
        <div className="ct-toolbar sticky top-20 z-20 mb-5 justify-between px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("search.filters", "Filters")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeFiltersCount > 0
                  ? t(
                      "search.filtersSummaryActive",
                      "{{count}} filters are shaping these results.",
                      { count: activeFiltersCount },
                    )
                  : t(
                      "search.filtersSummaryIdle",
                      "Open filters when you want to narrow by genre, runtime, year, language, or service.",
                    )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setDesktopFiltersExpanded((current) => !current)}
              aria-expanded={desktopFiltersExpanded}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {desktopFiltersExpanded
                ? t("search.hideFilters", "Hide Filters")
                : t("search.showFilters", "Show Filters")}
            </Button>
          </div>

          {desktopFiltersExpanded ? (
            <div className="mt-3 border-t border-border/50 pt-4">
              {filtersContent}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile filter button and dialog */}
      <div className="mb-6 flex items-center justify-end gap-3 md:hidden">
        <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <DrawerTrigger asChild>
            <Button variant="default" className="flex min-h-11 items-center gap-2 whitespace-nowrap px-4">
              <Filter className="w-4 h-4" />
              {t("search.filters")}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[88vh] rounded-t-[28px] border-border/60 bg-background px-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <DrawerHeader className="border-b border-border/60 px-4 pb-4 pt-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DrawerTitle className="text-lg">{t("search.filters")}</DrawerTitle>
                </div>
                <DrawerClose asChild>
                  <button
                    type="button"
                    aria-label={t("common.close", "Close")}
                    title={t("common.close", "Close")}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div ref={mobileFiltersRef} className="max-h-[64vh] overflow-y-auto px-4 py-4">
              {filtersContent}
            </div>

            <DrawerFooter className="border-t border-border/60 px-4 pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 min-h-11"
                  onClick={() => {
                    clearFilters();
                    mobileFiltersRef.current?.scrollTo({ top: 0 });
                  }}
                >
                  {t("search.clearFilters")}
                </Button>
                <Button
                  className="flex-1 min-h-11"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  {t("common.apply", "Apply")}
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Results Header */}
      <div className="mb-3 min-h-5" aria-live="polite">
        <p className="text-sm text-muted-foreground">
          {isLoadingOrRefreshing && !loadingTimedOut ? (
            <>{t("common.loading")}</>
          ) : isError || loadingTimedOut ? (
            <>{activeError?.message || t("common.error")}</>
          ) : normalizedQuery ? (
            <>
              {t("search.resultsFor", { query: normalizedQuery })} (
              {results.length})
            </>
          ) : hasFilters ? (
            <>
              {t("search.filterResults")} ({results.length})
            </>
          ) : (
            <>{t("search.trendingNow")}</>
          )}
        </p>
      </div>

      {activeFilterPills.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {activeFilterPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={pill.clear}
              aria-label={pill.ariaLabel}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-accent/50"
            >
              <span>{pill.label}</span>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t("search.clearFilters")}
          </Button>
        </div>
      ) : null}

      {!normalizedQuery && activeFiltersCount === 0 && recentSearches.length > 0 ? (
        <div className="mb-6 rounded-[1.5rem] border border-border/60 bg-card/55 px-4 py-4 shadow-[0_14px_35px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("search.recentSearches", "Recent Searches")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "search.recentSearchesHint",
                  "Jump back into something you were already exploring.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={`${item.query}-${item.timestamp}`}
                  type="button"
                  onClick={() => setQuery(item.query)}
                  aria-label={t("search.searchRecentQuery", "Search for {{query}}", { query: item.query })}
                  className="rounded-full border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-accent/50"
                >
                  {item.query}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Results */}
      {isLoading && !loadingTimedOut ? (
        <div className="media-grid" aria-busy="true" aria-label={t("common.loading", "Loading results")}>
          {Array.from({ length: 20 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError || loadingTimedOut ? (
        <div className="text-center py-20 max-w-md mx-auto">
          <h3 className="text-2xl font-bold mb-3 title-display">
            {t("search.errorTitle", "Search unavailable")}
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {searchErrorMessage}
          </p>
          {import.meta.env.DEV && activeError?.message && (
            <p className="mb-6 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-left text-xs text-muted-foreground">
              {activeError.message}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => void activeQuery.refetch()}>
              {t("common.tryAgain", "Try again")}
            </Button>
            <Button asChild variant="outline">
              <Link to="/">{t("search.backHome", "Back to home")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/trending">
                {t("search.backTrending", "Browse trending")}
              </Link>
            </Button>
          </div>
        </div>
      ) : results.length > 0 ? (
        <LoadMoreMediaGrid
          items={results}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoadingMore={activeQuery.isFetchingNextPage}
          columns="normal"
          gap="md"
        />
      ) : (
        <div className="text-center py-20 max-w-md mx-auto" role="status" aria-live="polite">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <SearchIcon className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3 title-display">
            {normalizedQuery
              ? t("search.noResultsTitle", "No results available")
              : t("search.startJourney", "Your Journey Starts Here")}
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {normalizedQuery
              ? t(
                  "search.noResultsDescription",
                  `No results found for "${normalizedQuery}". Try adjusting your filters or search terms.`,
                )
              : t(
                  "search.trySearching",
                  "Search for movies, TV shows, or use the genre chips above to discover something new.",
                )}
          </p>
          {(hasFilters || normalizedQuery) && (
            <Button
              variant="default"
              onClick={() => {
                clearFilters();
                clearSearch();
              }}
              className="btn-primary-glow gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t("common.discoverTrending", "Discover Trending")}
            </Button>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link to="/trending">{t("search.backTrending", "Browse trending")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">{t("search.backHome", "Back to home")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
