import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  ArrowUpDown,
  Calendar,
  Globe,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  getMovieGenres,
  getTVGenres,
  discoverMovies,
  discoverTV,
  type DiscoverMovieParams,
  type DiscoverTVParams,
} from "@/services/tmdb";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { buildCanonicalUrl, toBreadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

// Mapping TMDB Genre IDs to Emojis and premium color gradient/glow themes
const GENRE_VISUALS: Record<number, { emoji: string; color: string }> = {
  // Movie & Shared Genres
  28: { emoji: "💥", color: "from-red-600/15 to-transparent border-red-500/35 hover:border-red-500/60 text-red-500" }, // Action
  12: { emoji: "🧭", color: "from-amber-600/15 to-transparent border-amber-500/35 hover:border-amber-500/60 text-amber-500" }, // Adventure
  16: { emoji: "🎨", color: "from-pink-600/15 to-transparent border-pink-500/35 hover:border-pink-500/60 text-pink-500" }, // Animation
  35: { emoji: "😂", color: "from-yellow-600/15 to-transparent border-yellow-500/35 hover:border-yellow-500/60 text-yellow-500" }, // Comedy
  80: { emoji: "🕵️", color: "from-slate-600/15 to-transparent border-slate-400/35 hover:border-slate-400/60 text-slate-400" }, // Crime
  99: { emoji: "📹", color: "from-teal-600/15 to-transparent border-teal-500/35 hover:border-teal-500/60 text-teal-500" }, // Documentary
  18: { emoji: "🎭", color: "from-emerald-600/15 to-transparent border-emerald-500/35 hover:border-emerald-500/60 text-emerald-500" }, // Drama
  10751: { emoji: "👨‍👩‍👧‍👦", color: "from-sky-600/15 to-transparent border-sky-500/35 hover:border-sky-500/60 text-sky-500" }, // Family
  14: { emoji: "🪄", color: "from-purple-600/15 to-transparent border-purple-500/35 hover:border-purple-500/60 text-purple-500" }, // Fantasy
  36: { emoji: "📜", color: "from-amber-800/15 to-transparent border-amber-700/35 hover:border-amber-700/60 text-amber-700" }, // History
  27: { emoji: "👻", color: "from-red-850/15 to-transparent border-red-700/35 hover:border-red-700/60 text-red-650" }, // Horror
  10402: { emoji: "🎵", color: "from-rose-600/15 to-transparent border-rose-500/35 hover:border-rose-500/60 text-rose-500" }, // Music
  9648: { emoji: "🔍", color: "from-indigo-600/15 to-transparent border-indigo-500/35 hover:border-indigo-500/60 text-indigo-500" }, // Mystery
  10749: { emoji: "💖", color: "from-pink-500/15 to-transparent border-pink-400/35 hover:border-pink-400/60 text-pink-400" }, // Romance
  878: { emoji: "🚀", color: "from-cyan-600/15 to-transparent border-cyan-500/35 hover:border-cyan-500/60 text-cyan-500" }, // Science Fiction
  10770: { emoji: "📺", color: "from-blue-600/15 to-transparent border-blue-500/35 hover:border-blue-500/60 text-blue-500" }, // TV Movie
  53: { emoji: "🔪", color: "from-orange-800/15 to-transparent border-orange-755/35 hover:border-orange-755/60 text-orange-600" }, // Thriller
  10752: { emoji: "⚔️", color: "from-red-900/15 to-transparent border-red-900/35 hover:border-red-900/60 text-red-700" }, // War
  37: { emoji: "🤠", color: "from-yellow-850/15 to-transparent border-yellow-800/35 hover:border-yellow-800/60 text-yellow-800" }, // Western

  // TV Specific Genres
  10759: { emoji: "⚔️", color: "from-red-600/15 to-transparent border-red-500/35 hover:border-red-500/60 text-red-500" }, // Action & Adventure
  10762: { emoji: "👶", color: "from-sky-500/15 to-transparent border-sky-400/35 hover:border-sky-400/60 text-sky-400" }, // Kids
  10763: { emoji: "📰", color: "from-zinc-600/15 to-transparent border-zinc-400/35 hover:border-zinc-400/60 text-zinc-400" }, // News
  10764: { emoji: "👥", color: "from-teal-500/15 to-transparent border-teal-400/35 hover:border-teal-400/60 text-teal-400" }, // Reality
  10765: { emoji: "👽", color: "from-purple-600/15 to-transparent border-purple-400/35 hover:border-purple-400/60 text-purple-400" }, // Sci-Fi & Fantasy
  10766: { emoji: "🧼", color: "from-pink-600/15 to-transparent border-pink-400/35 hover:border-pink-400/60 text-pink-400" }, // Soap
  10767: { emoji: "🗣️", color: "from-indigo-650/15 to-transparent border-indigo-600/35 hover:border-indigo-600/60 text-indigo-600" }, // Talk
  10768: { emoji: "🎖️", color: "from-orange-700/15 to-transparent border-orange-650/35 hover:border-orange-650/60 text-orange-650" }, // War & Politics
};

const DEFAULT_GENRE_VISUAL = {
  emoji: "🎬",
  color: "from-primary/10 to-transparent border-primary/20 hover:border-primary/55 text-primary",
};

export default function GenreBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  // Active query parameters
  const selectedGenre = searchParams.get("genre");
  const mediaType = (searchParams.get("type") as "movie" | "tv") || "movie";
  const sortBy = searchParams.get("sort") || "popularity.desc";
  const selectedYear = searchParams.get("year") || "all";
  const selectedLang = searchParams.get("lang") || "all";
  const selectedRuntime = searchParams.get("runtime") || "all";

  // Visual filter controls state
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);

  // Helper to update specific search parameters
  const updateParams = (newParams: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === "" || (value === "all" && key !== "genre")) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams);
  };

  // 1. Fetch movie and TV genre options from TMDB
  const { data: movieGenres } = useQuery({
    queryKey: ["movie-genres", language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tv-genres", language],
    queryFn: () => getTVGenres(language),
  });

  // 2. Discover media items matching parameters
  const { data: genreMedia, isLoading } = useQuery({
    queryKey: [
      "genre-media-enhanced",
      selectedGenre,
      mediaType,
      sortBy,
      selectedYear,
      selectedLang,
      selectedRuntime,
      language,
      includeAdult,
    ],
    queryFn: async () => {
      if (!selectedGenre) return null;

      // Adjust sort parameter based on media type mapping
      let currentSort = sortBy;
      if (currentSort === "primary_release_date.desc" && mediaType === "tv") {
        currentSort = "first_air_date.desc";
      }

      const discoverParams: DiscoverMovieParams & DiscoverTVParams = {
        with_genres: selectedGenre,
        include_adult: includeAdult ? "true" : "false",
        sort_by: currentSort,
      };

      if (selectedYear !== "all") {
        if (mediaType === "movie") {
          discoverParams.primary_release_year = selectedYear;
        } else {
          discoverParams.first_air_date_year = selectedYear;
        }
      }

      if (selectedLang !== "all") {
        discoverParams.with_original_language = selectedLang;
      }

      if (selectedRuntime !== "all") {
        if (selectedRuntime === "short") {
          discoverParams.with_runtime_lte = "90";
        } else if (selectedRuntime === "medium") {
          discoverParams.with_runtime_gte = "90";
          discoverParams.with_runtime_lte = "120";
        } else if (selectedRuntime === "long") {
          discoverParams.with_runtime_gte = "120";
        }
      }

      const results =
        mediaType === "movie"
          ? await discoverMovies(discoverParams, language)
          : await discoverTV(discoverParams, language);

      return applySafetyFilter(
        results.results.map((item) => ({ ...item, media_type: mediaType })),
        strictFiltering,
        moderateFiltering,
      );
    },
    enabled: !!selectedGenre,
  });

  // Genre lists calculation
  const genresList = useMemo(() => {
    return mediaType === "movie" ? movieGenres?.genres || [] : tvGenres?.genres || [];
  }, [mediaType, movieGenres, tvGenres]);

  const selectedGenreObj = useMemo(() => {
    return genresList.find((g) => g.id.toString() === selectedGenre);
  }, [genresList, selectedGenre]);

  // Dynamic filter for selector grid
  const filteredGenres = useMemo(() => {
    if (!genreSearch.trim()) return genresList;
    return genresList.filter((g) => g.name.toLowerCase().includes(genreSearch.toLowerCase()));
  }, [genresList, genreSearch]);

  const displayedGenres = useMemo(() => {
    if (genreSearch.trim() || showAllGenres) return filteredGenres;
    return filteredGenres.slice(0, 8);
  }, [filteredGenres, showAllGenres, genreSearch]);

  const hasActiveFilters =
    sortBy !== "popularity.desc" ||
    selectedYear !== "all" ||
    selectedLang !== "all" ||
    selectedRuntime !== "all";

  // Language options mapping
  const languageOptions = [
    { value: "all", label: "Languages" },
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "it", label: "Italian" },
    { value: "de", label: "German" },
    { value: "zh", label: "Mandarin" },
  ];

  // Runtime options mapping
  const runtimeOptions = [
    { value: "all", label: "Duration" },
    { value: "short", label: "Under 90m" },
    { value: "medium", label: "90m - 120m" },
    { value: "long", label: "Over 120m" },
  ];

  // Year options list
  const yearOptions = useMemo(() => {
    const years = Array.from({ length: 16 }, (_, i) => {
      const yr = (2026 - i).toString();
      return { value: yr, label: yr };
    });
    return [
      { value: "all", label: "All Years" },
      ...years,
      { value: "2010", label: "2010" },
      { value: "2005", label: "2005" },
      { value: "2000", label: "2000" },
      { value: "1995", label: "1995" },
      { value: "1990", label: "1990" },
      { value: "1980", label: "1980" },
    ];
  }, []);

  return (
    <>
      <SEO
        title={t("genres.seoTitle", "Browse by Genre - CineTrekker")}
        description={t(
          "genres.seoDescription",
          "Discover movies and TV shows by genre on CineTrekker, with curated discovery paths for action, drama, comedy, thriller, and more.",
        )}
        keywords={t(
          "genres.seoKeywords",
          "movie genres, tv genres, browse by genre, action movies, comedy movies, thriller series, cineTrekker discovery",
        )}
        canonical={buildCanonicalUrl("/genres")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
            { name: t("nav.genres", "Genres"), path: "/genres" },
          ]),
        ]}
      />

      <div className="page-container pt-20 pb-24 md:pb-12 space-y-8">
        {/* Cinematic Header Block */}
        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/25 p-6 md:p-8 backdrop-blur-md">
          {/* Glowing overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(229,9,20,0.12),transparent_70%)] pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Compass className="h-6 w-6 animate-spin-slow" />
            </span>
            <div>
              <p className="ct-kicker mb-1">
                {t("genres.kicker", "Genre-driven discovery")}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("genres.title", "Browse by Genre")}
              </h1>
              <p className="mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {t(
                  "genres.intro",
                  "Find your next watch by exploring genre-specific collections for both movies and TV shows. Select a genre to view popular titles and quickly jump from discovery to watchlist planning.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Tab Format Controls & Local Genre Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Tabs
            value={mediaType}
            onValueChange={(value) =>
              updateParams({ type: value, genre: selectedGenre || "" })
            }
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-2 rounded-2xl border border-border/40 bg-card/45 p-1 max-w-[280px]">
              <TabsTrigger value="movie" className="rounded-xl py-2 text-xs font-bold">
                {t("common.movies", "Movies")}
              </TabsTrigger>
              <TabsTrigger value="tv" className="rounded-xl py-2 text-xs font-bold">
                {t("common.tvShows", "TV Shows")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Genre card local search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              placeholder="Search genre categories..."
              className="pl-9 pr-4 rounded-xl border-border/40 bg-card/40 focus:bg-card/60 backdrop-blur-sm text-xs min-h-[38px]"
            />
          </div>
        </div>

        {/* Premium Grid Genre Picker */}
        <section className="ct-panel p-5 rounded-3xl border border-border/40 bg-card/20 backdrop-blur-md">
          <p className="mb-4 text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            {t("genres.pickGenre", "Pick a genre to open a focused collection")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {displayedGenres.map((genre) => {
              const isActive = selectedGenre === genre.id.toString();
              const visuals = GENRE_VISUALS[genre.id] || DEFAULT_GENRE_VISUAL;

              return (
                <button
                  key={genre.id}
                  onClick={() => updateParams({ genre: genre.id.toString() })}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-2xl transition-all duration-300 gap-2 cursor-pointer bg-gradient-to-b",
                    isActive
                      ? cn(visuals.color, "bg-card shadow-lg shadow-primary/5 -translate-y-1")
                      : "bg-card/30 border-border/20 hover:bg-card/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {visuals.emoji}
                  </span>
                  <span className="text-xs font-bold text-center leading-tight">
                    {genre.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Expand/Collapse Selector Grid */}
          {filteredGenres.length > 8 && !genreSearch.trim() && (
            <div className="flex justify-center mt-5 pt-3 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllGenres(!showAllGenres)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-muted/30"
              >
                {showAllGenres ? (
                  <>
                    Show Less Genres <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show All {filteredGenres.length} Genres <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </section>

        {/* Selected Genre details header and discovery filters */}
        {selectedGenreObj ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 bg-primary rounded-full" />
                <h2 className="text-2xl font-black text-foreground tracking-tight">
                  {selectedGenreObj.name}{" "}
                  {mediaType === "movie"
                    ? t("common.movies", "Movies")
                    : t("common.tvShows", "TV Shows")}
                </h2>
              </div>

              {/* Advanced Discovery Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Sort selector */}
                <Select
                  value={sortBy}
                  onValueChange={(val) => updateParams({ sort: val })}
                >
                  <SelectTrigger className="w-40 rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Sort By" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-md">
                    <SelectItem value="popularity.desc">Most Popular</SelectItem>
                    <SelectItem value="vote_average.desc">Top Rated</SelectItem>
                    <SelectItem value="primary_release_date.desc">Recently Released</SelectItem>
                  </SelectContent>
                </Select>

                {/* Year selector */}
                <Select
                  value={selectedYear}
                  onValueChange={(val) => updateParams({ year: val })}
                >
                  <SelectTrigger className="w-32 rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                      <Calendar className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Year" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-md">
                    {yearOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Language selector */}
                <Select
                  value={selectedLang}
                  onValueChange={(val) => updateParams({ lang: val })}
                >
                  <SelectTrigger className="w-32 rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                      <Globe className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Language" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-md">
                    {languageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Duration selector */}
                <Select
                  value={selectedRuntime}
                  onValueChange={(val) => updateParams({ runtime: val })}
                >
                  <SelectTrigger className="w-32 rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                      <Clock className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Duration" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-md">
                    {runtimeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Active Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateParams({
                        sort: "popularity.desc",
                        year: "all",
                        lang: "all",
                        runtime: "all",
                      })
                    }
                    className="text-xs font-bold text-primary hover:text-primary/90 hover:bg-primary/5 min-h-[38px] px-3.5 rounded-xl border border-primary/20 bg-primary/5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="media-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <MediaCardSkeleton key={index} />
                ))}
              </div>
            ) : genreMedia && genreMedia.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="media-grid"
              >
                {genreMedia.map((media) => (
                  <MediaCard key={media.id} media={media} />
                ))}
              </motion.div>
            ) : (
              <div className="ct-panel py-20 text-center border-dashed border-border/80">
                <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-bold">{t("genres.noMatchesTitle", "No discovery matches")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("genres.noResultsDescription", "No results are available for this genre. Try adjusting your filters.")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="ct-panel py-24 text-center border-dashed border-border/80">
            <Compass className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4 animate-pulse" />
            <h3 className="text-base font-bold">{t("genres.discoverCollections", "Discover collections")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("genres.selectPrompt", "Select a genre above to browse content")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
