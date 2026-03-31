import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  searchMulti,
  getMovieGenres,
  getTVGenres,
  discoverMovies,
  discoverTV,
  getTrending,
} from "@/services/tmdb";
import { Media } from "@/types/media";
import { LoadMoreMediaGrid } from "@/components/MediaGrid";
import SkeletonCard from "@/components/ui/SkeletonCard";
import { RandomTrekButton } from "@/components/RandomTrekButton";
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
  { id: "8", key: "search.streamingOptions.netflix", fallback: "Netflix" },
  { id: "9", key: "search.streamingOptions.amazonPrime", fallback: "Amazon Prime" },
  { id: "337", key: "search.streamingOptions.disneyPlus", fallback: "Disney+" },
  { id: "1899", key: "search.streamingOptions.max", fallback: "Max" },
  { id: "15", key: "search.streamingOptions.hulu", fallback: "Hulu" },
  { id: "350", key: "search.streamingOptions.appleTv", fallback: "Apple TV+" },
  { id: "531", key: "search.streamingOptions.paramount", fallback: "Paramount+" },
  { id: "387", key: "search.streamingOptions.peacock", fallback: "Peacock" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) =>
  (currentYear - i).toString(),
);

const PENDING_SEARCH_QUERY_KEY = "cinetrekker_pending_search_query";

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

type PagedMedia = {
  page: number;
  total_pages: number;
  results: Media[];
};

type MultiSelectOption = {
  id: string;
  label: string;
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
}: {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  allLabel: string;
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
      <label className="text-xs text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between bg-background/50 px-3 font-normal"
          >
            <span className="truncate text-left">{summary}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              Select one or more options.
            </p>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => onChange([])}
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
                    aria-label={`${checked ? "Remove" : "Select"} ${option.label}`}
                  />
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
    () => query.normalize("NFKC").trim(),
    [query],
  );
  const normalizedQuery = useMemo(
    () => debouncedQuery.normalize("NFKC").trim(),
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
  const useDiscoverMode = !normalizedQuery && hasFilters;
  const useSearchMode = normalizedQuery.length > 0;
  const showTrending = !useDiscoverMode && !useSearchMode;

  // Text search query (infinite)
  const searchQuery = useInfiniteQuery({
    queryKey: ["search", normalizedQuery, language, includeAdult],
    queryFn: ({ pageParam = 1 }) =>
      searchMulti(normalizedQuery, pageParam as number, language, includeAdult),
    enabled: Boolean(useSearchMode),
    retry: 1,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  // Discover query (combined movies + TV when needed)
  const discoverQuery = useInfiniteQuery<PagedMedia>({
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
        return {
          totalPages: resp.total_pages,
          results: resp.results.map((m) => ({
            ...m,
            media_type: "movie" as const,
          })),
        };
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
        return {
          totalPages: resp.total_pages,
          results: resp.results.map((show) => ({
            ...show,
            media_type: "tv" as const,
          })),
        };
      };

      if (mediaTypeFilter === "movie") {
        const movieResponses = await Promise.all(
          selectedLanguages.map((selectedLanguage) =>
            fetchMovieResults(selectedLanguage),
          ),
        );
        return {
          page,
          total_pages: Math.max(...movieResponses.map((response) => response.totalPages)),
          results: dedupeMedia(
            movieResponses.flatMap((response) => response.results),
          ),
        };
      }

      if (mediaTypeFilter === "tv") {
        const tvResponses = await Promise.all(
          selectedLanguages.map((selectedLanguage) =>
            fetchTVResults(selectedLanguage),
          ),
        );
        return {
          page,
          total_pages: Math.max(...tvResponses.map((response) => response.totalPages)),
          results: dedupeMedia(
            tvResponses.flatMap((response) => response.results),
          ),
        };
      }

      const combinedResponses = await Promise.all(
        selectedLanguages.flatMap((selectedLanguage) => [
            fetchMovieResults(selectedLanguage),
            fetchTVResults(selectedLanguage),
          ]),
      );

      return {
        page,
        total_pages: Math.max(
          ...combinedResponses.map((response) => response.totalPages),
        ),
        results: dedupeMedia(
          combinedResponses.flatMap((response) => response.results) as Media[],
        ),
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
  const canonicalQuery = searchParams.toString();
  const faqItems = [
    {
      question: "What can I search for in CineTrekker?",
      answer:
        "You can search for movies, TV shows, and people, then refine results with genre, year, language, runtime, and streaming filters.",
    },
    {
      question: "Why use search inside a movie tracker?",
      answer:
        "Search is connected to watchlist actions, detail pages, follow tools, and saved progress, so every result is immediately useful instead of isolated.",
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

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut: 'f' to open filters on mobile when not focused on input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "f" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
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
      setTimeout(() => {
        mobileFiltersRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        const first = mobileFiltersRef.current?.querySelector<HTMLElement>(
          "button, input, select",
        );
        first?.focus();
      }, 50);
    }
  }, [mobileFiltersOpen]);

  const activeFiltersCount = [
    mediaTypeFilter !== "all",
    genreFilters.length > 0,
    yearFilter,
    languageFilters.length > 0,
    runtimeFilter,
    streamingFilters.length > 0,
  ].filter(Boolean).length;

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
  }));

  // Card click navigates via the card's Link; quick preview removed

  // Extracted filters content so it can be used in desktop and mobile drawer
  const FiltersContent = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-semibold">{t("search.filters")}</span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Type Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
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
        />

        {/* Runtime Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
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
        />

        {/* Year Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
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
        />

        {/* Sort */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="text-xs text-muted-foreground">
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
    <div className="page-container pt-20">
      <SEO
        title={
          query
            ? `Search "${query}" | CineTrekker Movie Tracker`
            : "Search Movies and TV Shows | CineTrekker Movie Tracker"
        }
        description={
          query
            ? `Search results for "${query}" in CineTrekker, the movie tracker for finding movies, TV shows, people, and watchlist-ready picks.`
            : "Search and discover movies and TV shows by genre, year, rating, runtime, and streaming service in CineTrekker."
        }
        keywords={
          query
            ? `${query}, movie tracker search, movies, TV shows, streaming`
            : "movie tracker search, TV show search, genre filter, streaming services, watchlist discovery"
        }
        canonical={
          canonicalQuery
            ? `${buildCanonicalUrl("/search")}?${canonicalQuery}`
            : buildCanonicalUrl("/search")
        }
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Search", path: "/search" },
          ]),
          toFaqJsonLd(faqItems),
        ]}
      />
      {/* Search Header */}
      <div className="mb-8 border-b border-border/60 bg-background/95 py-2 backdrop-blur-md">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="section-title mb-0">{t("nav.search")}</h1>
          <RandomTrekButton />
        </div>

        {/* Search Input with Clear Button */}
        <div className="relative max-w-2xl">
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
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary transition-all"
              aria-label={t("search.clearSearch", "Clear search")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter hint */}
        <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          {t("search.filterHint")}
        </p>
      </div>
      {/* Advanced Filters (desktop) */}
      <div className="hidden md:block">
        <div className="glass-card p-5 mb-8">
          <FiltersContent />
        </div>
      </div>

      {/* Mobile filter button and dialog */}
      <div className="md:hidden mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                {t("search.filterHint")}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {t("search.openFilters", "Open filters (Press F)")}
            </TooltipContent>
          </Tooltip>
        </div>

        <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t("search.filters")}
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed right-0 top-0 h-full w-full max-w-sm bg-background p-4 z-50">
            <DialogDescription className="sr-only">
              {t("search.filterHint")}
            </DialogDescription>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-semibold">{t("search.filters")}</span>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label={t("common.close", "Close")}
                  title={t("common.close", "Close")}
                  className="p-2 rounded-md hover:bg-muted/30 ml-2 min-w-[44px] min-h-[44px]"
                >
                  <X className="w-4 h-4" />
                </button>
              </DialogClose>
            </div>
            <div ref={mobileFiltersRef} className="overflow-auto max-h-[80vh]">
              <FiltersContent />
            </div>

            <div className="border-t border-border/50 mt-4 pt-3 flex items-center gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  clearFilters();
                  mobileFiltersRef.current?.scrollTo({ top: 0 });
                }}
              >
                {t("search.clearFilters")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setMobileFiltersOpen(false)}
              >
                {t("common.apply", "Apply")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Results Header */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {isLoading || isRefreshingResults ? (
            <>{t("common.loading")}</>
          ) : isError ? (
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

      {/* Results */}
      {isLoading || isRefreshingResults ? (
        <div className="media-grid">
          {Array.from({ length: 18 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20 max-w-md mx-auto">
          <h3 className="text-2xl font-bold mb-3 title-display">
            {t("common.error")}
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {activeError?.message ||
              t(
                "search.noResultsDescription",
                "Something went wrong while searching.",
              )}
          </p>
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
        <div className="text-center py-20 max-w-md mx-auto">
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
                  `We couldn't find anything matching "${normalizedQuery}". Try adjusting your filters or search terms.`,
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
        </div>
      )}
    </div>
  );
}
