import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  ArrowUpDown,
  Layers,
  Globe,
  Clock,
  X,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  discoverMovies,
  discoverTV,
  getMovieGenres,
  getTVGenres,
} from "@/services/tmdb";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { buildCanonicalUrl, toBreadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const DECADES = [
  {
    value: "2020",
    label: "2020s",
    start: 2020,
    end: 2029,
    emoji: "🤖",
    color: "from-cyan-600/15 to-transparent border-cyan-500/35 hover:border-cyan-500/60 text-cyan-500",
  },
  {
    value: "2010",
    label: "2010s",
    start: 2010,
    end: 2019,
    emoji: "📱",
    color: "from-blue-600/15 to-transparent border-blue-500/35 hover:border-blue-500/60 text-blue-500",
  },
  {
    value: "2000",
    label: "2000s",
    start: 2000,
    end: 2009,
    emoji: "💿",
    color: "from-indigo-600/15 to-transparent border-indigo-500/35 hover:border-indigo-500/60 text-indigo-500",
  },
  {
    value: "1990",
    label: "1990s",
    start: 1990,
    end: 1999,
    emoji: "📼",
    color: "from-pink-600/15 to-transparent border-pink-500/35 hover:border-pink-500/60 text-pink-400",
  },
  {
    value: "1980",
    label: "1980s",
    start: 1980,
    end: 1989,
    emoji: "👾",
    color: "from-purple-600/15 to-transparent border-purple-500/35 hover:border-purple-500/60 text-purple-500",
  },
  {
    value: "1970",
    label: "1970s",
    start: 1970,
    end: 1979,
    emoji: "🕺",
    color: "from-yellow-600/15 to-transparent border-yellow-500/35 hover:border-yellow-500/60 text-yellow-500",
  },
  {
    value: "1960",
    label: "1960s",
    start: 1960,
    end: 1969,
    emoji: "☮️",
    color: "from-emerald-600/15 to-transparent border-emerald-500/35 hover:border-emerald-500/60 text-emerald-500",
  },
  {
    value: "1950",
    label: "1950s",
    start: 1950,
    end: 1959,
    emoji: "🛸",
    color: "from-amber-600/15 to-transparent border-amber-500/35 hover:border-amber-500/60 text-amber-500",
  },
  {
    value: "1940",
    label: "Classic (Pre-1950)",
    start: 1900,
    end: 1949,
    emoji: "📜",
    color: "from-slate-600/15 to-transparent border-slate-500/35 hover:border-slate-500/60 text-slate-400",
  },
];

export default function DecadeExplorer() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const [searchParams, setSearchParams] = useSearchParams();

  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  // Active query parameters
  const decadeVal = searchParams.get("decade") || DECADES[0].value;
  const mediaType = (searchParams.get("type") as "movie" | "tv") || "movie";
  const sortBy = searchParams.get("sort") || "popularity.desc";
  const selectedGenre = searchParams.get("genre") || "all";
  const selectedLang = searchParams.get("lang") || "all";
  const selectedRuntime = searchParams.get("runtime") || "all";

  const selectedDecade = DECADES.find((d) => d.value === decadeVal) || DECADES[0];

  // Helper to update specific search parameters
  const updateParams = (newParams: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === "" || (value === "all" && key !== "decade")) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams);
  };

  // 1. Fetch movie and TV genres from TMDB for cross-filtering
  const { data: movieGenres } = useQuery({
    queryKey: ["movie-genres", language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tv-genres", language],
    queryFn: () => getTVGenres(language),
  });

  const genres = useMemo(() => {
    return mediaType === "movie" ? movieGenres?.genres || [] : tvGenres?.genres || [];
  }, [mediaType, movieGenres, tvGenres]);

  // 2. Discover media based on active decade and advanced filters
  const { data: media, isLoading } = useQuery({
    queryKey: [
      "decade-media-enhanced",
      selectedDecade.value,
      mediaType,
      sortBy,
      selectedGenre,
      selectedLang,
      selectedRuntime,
      language,
      includeAdult,
    ],
    queryFn: async () => {
      let currentSort = sortBy;
      if (currentSort === "primary_release_date.desc" && mediaType === "tv") {
        currentSort = "first_air_date.desc";
      }

      const discoverParams: any = {
        sort_by: currentSort,
        include_adult: includeAdult ? "true" : "false",
      };

      if (mediaType === "movie") {
        discoverParams.primary_release_date_gte = `${selectedDecade.start}-01-01`;
        discoverParams.primary_release_date_lte = `${selectedDecade.end}-12-31`;
      } else {
        discoverParams.first_air_date_gte = `${selectedDecade.start}-01-01`;
        discoverParams.first_air_date_lte = `${selectedDecade.end}-12-31`;
      }

      if (selectedGenre !== "all") {
        discoverParams.with_genres = selectedGenre;
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
  });

  const hasActiveFilters =
    sortBy !== "popularity.desc" ||
    selectedGenre !== "all" ||
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

  return (
    <>
      <SEO
        title={t("decades.seoTitle", "Explore by Decade - CineTrekker")}
        description={t(
          "decades.seoDescription",
          "Explore movies and TV shows by decade on CineTrekker, from modern releases to classic cinema eras.",
        )}
        keywords={t(
          "decades.seoKeywords",
          "movies by decade, tv shows by decade, classic films, 1990s movies, 2000s movies, CineTrekker decades",
        )}
        canonical={buildCanonicalUrl("/decades")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
            { name: t("nav.decades", "Decades"), path: "/decades" },
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
              <Calendar className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <p className="ct-kicker mb-1">
                {t("decades.kicker", "Browse by era")}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("decades.title", "Explore by Decade")}
              </h1>
              <p className="mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {t(
                  "decades.intro",
                  "Travel through film and TV history decade by decade. Switch eras to surface standout titles and compare how storytelling trends evolved over time.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Tab Format Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Tabs
            value={mediaType}
            onValueChange={(value) =>
              updateParams({ type: value, decade: selectedDecade.value })
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
        </div>

        {/* Premium Era Grid Picker */}
        <section className="ct-panel p-5 rounded-3xl border border-border/40 bg-card/20 backdrop-blur-md">
          <p className="mb-4 text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            {t("decades.pickEra", "Choose an era to open its collection")}
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4">
            {DECADES.map((decade) => {
              const isActive = selectedDecade.value === decade.value;
              const colorClass = decade.color;

              return (
                <button
                  key={decade.value}
                  onClick={() => updateParams({ decade: decade.value })}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-2xl transition-all duration-300 gap-2 cursor-pointer bg-gradient-to-b",
                    isActive
                      ? cn(colorClass, "bg-card shadow-lg shadow-primary/5 -translate-y-1")
                      : "bg-card/30 border-border/20 hover:bg-card/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {decade.emoji}
                  </span>
                  <span className="text-xs font-bold text-center leading-tight">
                    {decade.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Discovery Filtering Options */}
        <div className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-6 bg-primary rounded-full" />
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {selectedDecade.label}{" "}
                {mediaType === "movie"
                  ? t("common.movies", "Movies")
                  : t("common.tvShows", "TV Shows")}
              </h2>
            </div>

            {/* Filtering parameters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort Order Selector */}
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

              {/* Genre Selector */}
              <Select
                value={selectedGenre}
                onValueChange={(val) => updateParams({ genre: val })}
              >
                <SelectTrigger className="w-40 rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                    <Layers className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Genres" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-md">
                  <SelectItem value="all">All Genres</SelectItem>
                  {genres.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Language Selector */}
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

              {/* Duration Selector */}
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

              {/* Reset Filters Option */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateParams({
                      sort: "popularity.desc",
                      genre: "all",
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

          {/* Media Listing Grid */}
          {isLoading ? (
            <div className="media-grid">
              {Array.from({ length: 12 }).map((_, index) => (
                <MediaCardSkeleton key={index} />
              ))}
            </div>
          ) : media && media.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="media-grid"
            >
              {media.map((item) => (
                <MediaCard key={item.id} media={item} />
              ))}
            </motion.div>
          ) : (
            <div className="ct-panel py-20 text-center border-dashed border-border/80">
              <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-bold">No Discovery Matches</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t("decades.noResults", "No results available for this decade")} Try adjusting filter selections.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
