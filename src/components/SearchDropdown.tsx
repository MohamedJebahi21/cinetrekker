import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  Film,
  Tv,
  User,
  ArrowRight,
  Clock3,
  Trash2,
} from "lucide-react";
import {
  searchMovies,
  searchPeople,
  searchTV,
  getImageUrl,
} from "@/services/tmdb";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import { Image } from "@/components/ui/Image";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter, type SafetyMedia } from "@/lib/contentFilter";
import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryItem,
} from "@/lib/searchHistory";

// Skeleton for dropdown search results
function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Skeleton className="w-10 h-14 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Extended type for search results that includes person
interface SearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  person_role?: "actor" | "director";
  title?: string;
  name?: string;
  poster_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
}

interface SearchDropdownProps {
  className?: string;
  onNavigate?: () => void;
}

export function SearchDropdown({ className, onNavigate }: SearchDropdownProps) {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250); // Faster debounce for instant suggestions
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const language = i18n.language;

  const refreshRecentSearches = useCallback(() => {
    setRecentSearches(getSearchHistory().slice(0, 6));
  }, []);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    refreshRecentSearches();
  }, [refreshRecentSearches]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    data: searchResults,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["search-dropdown", debouncedQuery, language, includeAdult],
    queryFn: async () => {
      const q = debouncedQuery.trim();
      if (!q) return [] as SearchResult[];

      const [movieResponse, tvResponse, peopleResponse] = await Promise.all([
        searchMovies(q, 1, language, includeAdult),
        searchTV(q, 1, language, includeAdult),
        searchPeople(q, 1, language),
      ]);

      const movies = ((movieResponse?.results || []) as SearchResult[])
        .slice(0, 4)
        .map((item) => ({ ...item, media_type: "movie" as const }));
      const shows = ((tvResponse?.results || []) as SearchResult[])
        .slice(0, 4)
        .map((item) => ({ ...item, media_type: "tv" as const }));

      const peopleRaw = (peopleResponse?.results || []) as SearchResult[];
      const peopleWithRole = peopleRaw
        .map((person) => {
          const department = (
            (person as { known_for_department?: string })
              .known_for_department || ""
          ).toLowerCase();
          let personRole: "actor" | "director" | undefined;

          if (department.includes("direct")) {
            personRole = "director";
          } else if (department.includes("actor")) {
            personRole = "actor";
          }

          return personRole
            ? {
                ...person,
                media_type: "person" as const,
                person_role: personRole,
              }
            : null;
        })
        .filter(Boolean) as SearchResult[];

      const actors = peopleWithRole
        .filter((p) => p.person_role === "actor")
        .slice(0, 3);
      const directors = peopleWithRole
        .filter((p) => p.person_role === "director")
        .slice(0, 3);

      const merged = [...movies, ...shows, ...actors, ...directors];
      const deduped = merged.filter(
        (item, index, arr) =>
          arr.findIndex(
            (x) => x.media_type === item.media_type && x.id === item.id,
          ) === index,
      );

      return deduped.slice(0, 8);
    },
    enabled: debouncedQuery.trim().length >= 1,
    staleTime: 30000,
  });

  const results: SearchResult[] = applySafetyFilter(
    (searchResults || []) as unknown as SafetyMedia[],
    strictFiltering,
    moderateFiltering,
  ) as unknown as SearchResult[];

  const shouldShowRecentSearches =
    isOpen && query.trim().length === 0 && recentSearches.length > 0;

  const submitSearch = useCallback(
    (nextQuery: string) => {
      const normalizedQuery = nextQuery.trim();
      if (!normalizedQuery) return;

      addToSearchHistory(normalizedQuery);
      refreshRecentSearches();
      navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`);
      setIsOpen(false);
      onNavigate?.();
    },
    [navigate, onNavigate, refreshRecentSearches],
  );

  const getItemRoute = (item: SearchResult): string => {
    if (item.media_type === "person") return `/person/${item.id}`;
    return `/${item.media_type}/${item.id}`;
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            addToSearchHistory(query.trim());
            refreshRecentSearches();
            navigate(getItemRoute(results[selectedIndex]));
            setIsOpen(false);
            setQuery("");
            onNavigate?.();
          } else if (query.trim()) {
            submitSearch(query);
          }
          break;
      }
    },
    [
      isOpen,
      results,
      selectedIndex,
      query,
      navigate,
      onNavigate,
      refreshRecentSearches,
      submitSearch,
    ],
  );

  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleItemClick = (item: SearchResult) => {
    addToSearchHistory(query.trim());
    refreshRecentSearches();
    navigate(getItemRoute(item));
    setIsOpen(false);
    setQuery("");
    onNavigate?.();
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    submitSearch(recentQuery);
  };

  const handleRemoveRecentSearch = (
    event: React.MouseEvent<HTMLButtonElement>,
    recentQuery: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    removeFromSearchHistory(recentQuery);
    refreshRecentSearches();
  };

  const handleClearRecentSearches = () => {
    clearSearchHistory();
    refreshRecentSearches();
  };

  const getItemIcon = (item: SearchResult) => {
    if (item.media_type === "person")
      return <User className="w-4 h-4 text-muted-foreground" />;
    if (item.media_type === "movie")
      return <Film className="w-4 h-4 text-muted-foreground" />;
    return <Tv className="w-4 h-4 text-muted-foreground" />;
  };

  const getItemTypeLabel = (item: SearchResult): string => {
    if (item.media_type === "person") {
      if (item.person_role === "director") return "director";
      if (item.person_role === "actor") return "actor";
      return "person";
    }
    return item.media_type;
  };

  const getItemImage = (item: SearchResult) => {
    if (item.media_type === "person") {
      return getImageUrl(item.profile_path || null, "w92");
    }
    return getImageUrl(item.poster_path || null, "w92");
  };

  const getItemTitle = (item: SearchResult): string => {
    return item.title || item.name || "Unknown";
  };

  const getItemYear = (item: SearchResult): string => {
    if (item.media_type === "person") return "";
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear().toString() : "";
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-16 h-10 bg-card/50 border-white/10 rounded-lg focus:border-primary focus:ring-primary/20 transition-all"
          aria-label={t("search.placeholder")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="search-dropdown-results"
        />

        {/* Keyboard hint */}
        {!query && (
          <kbd className="absolute right-10 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        )}

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors min-w-[44px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen &&
        (debouncedQuery.trim().length >= 1 || shouldShowRecentSearches) && (
          <div
            id="search-dropdown-results"
            className="absolute top-full left-0 right-0 mt-2 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-y-auto max-h-screen z-50 animate-fade-in"
          >
            {shouldShowRecentSearches ? (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 pb-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Recent searches
                  </p>
                  <button
                    type="button"
                    onClick={handleClearRecentSearches}
                    aria-label="Clear recent searches"
                    className="rounded-sm px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Clear
                  </button>
                </div>
                <ul>
                  {recentSearches.map((item) => (
                    <li key={item.timestamp}>
                      <div className="flex items-center gap-3 px-4 py-1 transition-colors hover:bg-accent/50">
                        <button
                          type="button"
                          onClick={() => handleRecentSearchClick(item.query)}
                          aria-label={`Search again for ${item.query}`}
                          className="flex min-h-[44px] flex-1 items-center gap-3 rounded-md py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm font-medium text-foreground">
                            {item.query}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </button>
                        <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                          <button
                            type="button"
                            onClick={(event) =>
                              handleRemoveRecentSearch(event, item.query)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={`Remove ${item.query} from recent searches`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : isLoading || (isFetching && query !== debouncedQuery) ? (
              <div className="py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SearchResultSkeleton key={i} />
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <ul className="py-2">
                  {results.map((item, index) => (
                    <li key={`${item.media_type}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        aria-label={`Open ${getItemTitle(item)} ${getItemTypeLabel(item)} details`}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                          selectedIndex === index
                            ? "bg-accent"
                            : "hover:bg-accent/50",
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                          {getItemImage(item) ? (
                            <Image
                              src={
                                getImageUrl(
                                  item.poster_path ?? item.profile_path ?? null,
                                  "w185",
                                )!
                              }
                              srcSet={`${getImageUrl(item.poster_path ?? item.profile_path ?? null, "w92")!} 92w, ${getImageUrl(item.poster_path ?? item.profile_path ?? null, "w185")!} 185w`}
                              sizes="40px"
                              width={92}
                              height={138}
                              alt={
                                item.media_type === "person"
                                  ? `${getItemTitle(item)} profile`
                                  : `${getItemTitle(item)} poster`
                              }
                              className="w-full h-full object-cover bg-muted"
                              loading="lazy"
                              showSkeleton
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getItemIcon(item)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getItemTitle(item)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getItemIcon(item)}
                            <span className="capitalize">
                              {getItemTypeLabel(item)}
                            </span>
                            {item.media_type !== "person" &&
                              getItemYear(item) && (
                                <>
                                  <span>•</span>
                                  <span>{getItemYear(item)}</span>
                                </>
                              )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* View All Results */}
                <Link
                  to={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => {
                    submitSearch(query);
                  }}
                  className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-sm text-primary hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <span>
                    {t("common.seeAll")} results for "{query}"
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <div className="py-8 px-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t(
                    "search.noResults",
                    `No results available for "${debouncedQuery}"`,
                  )}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {t(
                    "search.tryDifferent",
                    "Try different keywords or check spelling",
                  )}
                </p>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
