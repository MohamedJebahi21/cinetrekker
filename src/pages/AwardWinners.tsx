import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  discoverMovies,
  discoverTV,
  getPersonDetails,
  searchPeople,
  getMovieGenres,
  getTVGenres,
} from "@/services/tmdb";
import { MediaCard } from "@/components/MediaCard";
import type { Media } from "@/types/media";
import MovieSkeleton from "@/components/ui/MovieSkeleton";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Award, Globe, Clock, Layers, Calendar, X, SlidersHorizontal, Search, Sparkles } from "lucide-react";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { useTranslation } from "react-i18next";
import { buildCanonicalUrl, toBreadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const CATEGORY_CARDS = [
  {
    value: "oscar",
    label: "Oscars",
    emoji: "🏆",
    color: "from-yellow-600/15 to-transparent border-yellow-500/35 hover:border-yellow-500/60 text-yellow-500",
  },
  {
    value: "emmy",
    label: "Emmys",
    emoji: "📺",
    color: "from-purple-600/15 to-transparent border-purple-500/35 hover:border-purple-500/60 text-purple-400",
  },
  {
    value: "golden_globe",
    label: "Golden Globes",
    emoji: "🌐",
    color: "from-amber-600/15 to-transparent border-amber-500/35 hover:border-amber-500/60 text-amber-500",
  },
  {
    value: "bafta",
    label: "BAFTA",
    emoji: "🎭",
    color: "from-slate-600/15 to-transparent border-slate-500/35 hover:border-slate-500/60 text-slate-400",
  },
];

export default function AwardWinners() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const [searchParams, setSearchParams] = useSearchParams();

  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  // Active query parameters
  const selectedCategory = searchParams.get("category") || "oscar";
  const selectedYear = Number(
    searchParams.get("year") || (new Date().getFullYear() - 1).toString(),
  );
  const selectedGenre = searchParams.get("genre") || "all";
  const selectedLang = searchParams.get("lang") || "all";
  const selectedRuntime = searchParams.get("runtime") || "all";
  const selectedActor = searchParams.get("actor") || "";

  // Actor search dropdown states
  const [actorQuery, setActorQuery] = useState("");
  const [actorOptions, setActorOptions] = useState<{ id: number; name: string }[]>([]);

  // Ceremony options config
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 25 }, (_, i) => currentYear - 1 - i);

  // Helper to update specific search parameters
  const updateParams = (newParams: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (
        value === "" ||
        (value === "all" && key !== "category" && key !== "year")
      ) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams);
  };

  // Fetch genres from TMDB for cross-filtering nominees
  const { data: movieGenres } = useQuery({
    queryKey: ["movie-genres", language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tv-genres", language],
    queryFn: () => getTVGenres(language),
  });

  const activeTab = useMemo(() => {
    const categoryToTab: Record<string, "oscars" | "emmys" | "critical"> = {
      oscar: "oscars",
      emmy: "emmys",
      golden_globe: "critical",
    };
    return categoryToTab[selectedCategory] || "oscars";
  }, [selectedCategory]);

  const currentMediaType = activeTab === "emmys" ? "tv" : "movie";

  const genres = useMemo(() => {
    return currentMediaType === "movie" ? movieGenres?.genres || [] : tvGenres?.genres || [];
  }, [currentMediaType, movieGenres, tvGenres]);

  // Actor search effect
  React.useEffect(() => {
    let ignore = false;
    if (actorQuery.length < 2) {
      setActorOptions([]);
      return;
    }
    searchPeople(actorQuery).then((res) => {
      if (!ignore) {
        setActorOptions(res.results.map((p) => ({ id: p.id, name: p.name })));
      }
    });
    return () => {
      ignore = true;
    };
  }, [actorQuery]);

  // Fetch Oscar-nominated movies (using high vote average + vote count as proxy)
  const {
    data: oscarMovies,
    isLoading: loadingOscar,
    isError: isOscarError,
    error: oscarError,
  } = useQuery({
    queryKey: [
      "oscar-winners-enhanced",
      selectedYear,
      selectedGenre,
      selectedLang,
      selectedRuntime,
      includeAdult,
    ],
    queryFn: async () => {
      const oscarParams: any = {
        page: 1,
        primary_release_year: selectedYear.toString(),
        sort_by: "vote_average.desc",
        vote_count_gte: "150",
        include_adult: includeAdult ? "true" : "false",
      };

      if (selectedGenre !== "all") oscarParams.with_genres = selectedGenre;
      if (selectedLang !== "all") oscarParams.with_original_language = selectedLang;
      if (selectedRuntime !== "all") {
        if (selectedRuntime === "short") oscarParams.with_runtime_lte = "90";
        else if (selectedRuntime === "medium") {
          oscarParams.with_runtime_gte = "90";
          oscarParams.with_runtime_lte = "120";
        } else if (selectedRuntime === "long") oscarParams.with_runtime_gte = "120";
      }

      const results = await discoverMovies(oscarParams, language);
      return applySafetyFilter(
        results.results || [],
        strictFiltering,
        moderateFiltering,
      ).slice(0, 16);
    },
  });

  // Fetch Emmy-nominated shows (using high vote average as proxy)
  const {
    data: emmyShows,
    isLoading: loadingEmmy,
    isError: isEmmyError,
    error: emmyError,
  } = useQuery({
    queryKey: [
      "emmy-winners-enhanced",
      selectedYear,
      selectedGenre,
      selectedLang,
      selectedRuntime,
      includeAdult,
    ],
    queryFn: async () => {
      const emmyParams: any = {
        page: 1,
        first_air_date_year: selectedYear.toString(),
        sort_by: "vote_average.desc",
        include_adult: includeAdult ? "true" : "false",
      };

      if (selectedGenre !== "all") emmyParams.with_genres = selectedGenre;
      if (selectedLang !== "all") emmyParams.with_original_language = selectedLang;
      if (selectedRuntime !== "all") {
        if (selectedRuntime === "short") emmyParams.with_runtime_lte = "90";
        else if (selectedRuntime === "medium") {
          emmyParams.with_runtime_gte = "90";
          emmyParams.with_runtime_lte = "120";
        } else if (selectedRuntime === "long") emmyParams.with_runtime_gte = "120";
      }

      const results = await discoverTV(emmyParams, language);
      return applySafetyFilter(
        results.results || [],
        strictFiltering,
        moderateFiltering,
      ).slice(0, 16);
    },
  });

  // Fetch critically acclaimed movies (Golden Globe style)
  const {
    data: criticallyAcclaimed,
    isLoading: loadingCritical,
    isError: isCriticalError,
    error: criticalError,
  } = useQuery({
    queryKey: [
      "critically-acclaimed-enhanced",
      selectedYear,
      selectedGenre,
      selectedLang,
      selectedRuntime,
      includeAdult,
    ],
    queryFn: async () => {
      const criticalParams: any = {
        page: 1,
        primary_release_year: selectedYear.toString(),
        sort_by: "popularity.desc",
        include_adult: includeAdult ? "true" : "false",
      };

      if (selectedGenre !== "all") criticalParams.with_genres = selectedGenre;
      if (selectedLang !== "all") criticalParams.with_original_language = selectedLang;
      if (selectedRuntime !== "all") {
        if (selectedRuntime === "short") criticalParams.with_runtime_lte = "90";
        else if (selectedRuntime === "medium") {
          criticalParams.with_runtime_gte = "90";
          criticalParams.with_runtime_lte = "120";
        } else if (selectedRuntime === "long") criticalParams.with_runtime_gte = "120";
      }

      const results = await discoverMovies(criticalParams, language);
      return applySafetyFilter(
        results.results || [],
        strictFiltering,
        moderateFiltering,
      ).slice(0, 16);
    },
  });

  // Details lookup for selected actor
  const { data: selectedActorDetails } = useQuery({
    queryKey: ["awards-selected-actor", selectedActor, includeAdult],
    queryFn: () => getPersonDetails(Number(selectedActor)),
    enabled: Boolean(selectedActor),
  });

  const actorMediaIds = useMemo(() => {
    if (!selectedActorDetails?.combined_credits) return null;
    const ids = new Set<number>();
    selectedActorDetails.combined_credits.cast.forEach((credit) => {
      if (typeof credit.id === "number") ids.add(credit.id);
    });
    selectedActorDetails.combined_credits.crew.forEach((credit) => {
      if (typeof credit.id === "number") ids.add(credit.id);
    });
    return ids;
  }, [selectedActorDetails]);

  // Apply actor combined credits filter locally
  const applyActorFilter = <T extends { id: number }>(items: T[] | undefined) => {
    if (!items) return [] as T[];
    if (!actorMediaIds) return items;
    return items.filter((item) => actorMediaIds.has(item.id));
  };

  const filteredOscarMovies = useMemo(() => applyActorFilter(oscarMovies), [oscarMovies, actorMediaIds]);
  const filteredEmmyShows = useMemo(() => applyActorFilter(emmyShows), [emmyShows, actorMediaIds]);
  const filteredCritical = useMemo(() => applyActorFilter(criticallyAcclaimed), [criticallyAcclaimed, actorMediaIds]);

  const categoryImplemented = selectedCategory !== "bafta";

  const awardsLoadingTimedOut = useLoadingTimeout(
    loadingOscar || loadingEmmy || loadingCritical,
    12000,
  );

  const hasActiveFilters =
    selectedGenre !== "all" ||
    selectedLang !== "all" ||
    selectedRuntime !== "all" ||
    selectedActor !== "";

  // Reset filters helper
  const handleClearFilters = () => {
    updateParams({
      genre: "all",
      lang: "all",
      runtime: "all",
      actor: "",
    });
    setActorQuery("");
  };

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

  const handleTabChange = (value: string) => {
    if (value === "oscars") updateParams({ category: "oscar" });
    if (value === "emmys") updateParams({ category: "emmy" });
    if (value === "critical") updateParams({ category: "golden_globe" });
  };

  const renderGrid = (
    items: Media[],
    loading: boolean,
    emptyMessage: string,
    hasError?: boolean,
    errorMessage?: string,
  ) => {
    if (loading) {
      return (
        <div className="media-grid">
          {[...Array(12)].map((_, i) => (
            <MovieSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (hasError || awardsLoadingTimedOut) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-12 text-center text-destructive">
          {awardsLoadingTimedOut
            ? t(
                "awards.loadingTimeout",
                "Loading award contenders took too long. Please try again.",
              )
            : errorMessage || t("awards.loadFailed", "Failed to load award contenders.")}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="ct-panel py-20 text-center border-dashed border-border/80">
          <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-bold">No Nominees Found</h3>
          <p className="text-xs text-muted-foreground mt-1">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="media-grid"
      >
        {items.map((item) => (
          <MediaCard key={item.id} media={item} />
        ))}
      </motion.div>
    );
  };

  return (
    <>
      <SEO
        title={t("awards.seoTitle", "Award Winners & Nominees")}
        description={t(
          "awards.seoDescription",
          "Explore award-inspired and critically acclaimed movies and TV shows",
        )}
        canonical={buildCanonicalUrl("/awards")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
            { name: t("nav.awards", "Awards"), path: "/awards" },
          ]),
        ]}
      />

      <div className="page-container pt-20 pb-24 md:pb-12 space-y-8">
        {/* Gold Prestige Header Block */}
        <section className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-card/25 p-6 md:p-8 backdrop-blur-md">
          {/* Glowing overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(250,204,21,0.1),transparent_70%)] pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
              <Award className="h-6 w-6 animate-pulse" />
            </span>
            <div className="min-w-0">
              <p className="ct-kicker text-yellow-500/90 mb-1">
                {t("awards.kicker", "Prestige-first browsing")}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("awards.title", "Award Winners & Nominees")}
              </h1>
              <p className="mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {t(
                  "awards.subtitle",
                  "Browse award-inspired and critically acclaimed collections across film and television.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Visual Award Category Grid */}
        <section className="ct-panel p-5 rounded-3xl border border-border/40 bg-card/20 backdrop-blur-md">
          <p className="mb-4 text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
            Select Award Ceremony
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORY_CARDS.map((cat) => {
              const isActive = selectedCategory === cat.value;
              const colorClass = cat.color;

              return (
                <button
                  key={cat.value}
                  onClick={() => updateParams({ category: cat.value })}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-2xl transition-all duration-300 gap-2 cursor-pointer bg-gradient-to-b",
                    isActive
                      ? cn(colorClass, "bg-card shadow-lg shadow-yellow-500/5 -translate-y-1")
                      : "bg-card/30 border-border/20 hover:bg-card/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {cat.emoji}
                  </span>
                  <span className="text-xs font-bold text-center leading-tight">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Advanced Discovery Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Ceremony Selector (Year) */}
            <div className="flex flex-col gap-1 w-32">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Ceremony
              </span>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => updateParams({ year: v })}
              >
                <SelectTrigger className="rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Ceremony" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-md">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Genre selector */}
            <div className="flex flex-col gap-1 w-40">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Nominee Genre
              </span>
              <Select
                value={selectedGenre}
                onValueChange={(val) => updateParams({ genre: val })}
              >
                <SelectTrigger className="rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
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
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1 w-32">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Language
              </span>
              <Select value={selectedLang} onValueChange={(val) => updateParams({ lang: val })}>
                <SelectTrigger className="rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
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
            </div>

            {/* Duration Selector */}
            <div className="flex flex-col gap-1 w-32">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Duration
              </span>
              <Select
                value={selectedRuntime}
                onValueChange={(val) => updateParams({ runtime: val })}
              >
                <SelectTrigger className="rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
            </div>

            {/* Actor search autocomplete dropdown */}
            <div className="flex flex-col gap-1 w-48">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Filter by Actor
              </span>
              <Select value={selectedActor} onValueChange={(val) => updateParams({ actor: val })}>
                <SelectTrigger className="rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue
                      placeholder={t("awards.searchActor", "Search actor")}
                    />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-sm">
                  <div className="px-2 py-1.5">
                    <input
                      className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      placeholder={t("awards.typeToSearch", "Type to search...")}
                      value={actorQuery}
                      onChange={(e) => setActorQuery(e.target.value)}
                    />
                  </div>
                  {actorOptions.length === 0 && actorQuery.length >= 2 ? (
                    <div className="px-3 py-2 text-xs text-neutral-400">
                      {t("awards.noResults", "No results")}
                    </div>
                  ) : (
                    actorOptions.map((actor) => (
                      <SelectItem key={actor.id} value={actor.id.toString()}>
                        {actor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Action options */}
          <div className="flex items-end h-full">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs font-bold text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/5 min-h-[38px] px-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5"
              >
                <X className="h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Selected Actor Banner Badge */}
        {selectedActorDetails && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-2xl text-xs max-w-md">
            <span className="font-bold text-yellow-500">Nominee Filter Active:</span>
            <span className="text-foreground font-black">{selectedActorDetails.name}</span>
            <button
              onClick={() => {
                updateParams({ actor: "" });
                setActorQuery("");
              }}
              className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BAFTA Pending Screen */}
        {!categoryImplemented && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-sm text-yellow-200">
            {t(
              "awards.baftaComingSoon",
              "BAFTA filtering is coming soon. For now, use Oscar, Emmy, or Golden Globe.",
            )}
          </div>
        )}

        {/* Proxy warnings */}
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground leading-relaxed">
          {t(
            "awards.proxyNote",
            "These collections are discovery proxies based on ratings, popularity, and release year. They are meant to help you browse prestige picks quickly, not serve as official nomination records.",
          )}
        </div>

        {/* Ceremony listing tabs */}
        {categoryImplemented && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="oscars">Oscars</TabsTrigger>
              <TabsTrigger value="emmys">Emmys</TabsTrigger>
              <TabsTrigger value="critical">Golden Globes</TabsTrigger>
            </TabsList>

            <TabsContent value="oscars" className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {t("awards.oscarHeading", "Academy Award Contenders {{year}}", {
                    year: selectedYear,
                  })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "awards.oscarDescription",
                    "Top-rated films from {{year}} eligible for Oscar consideration",
                    { year: selectedYear },
                  )}
                </p>
              </div>

              {renderGrid(
                filteredOscarMovies,
                loadingOscar,
                selectedActor
                  ? t(
                      "awards.noOscarWithActor",
                      "No Oscar contenders matched the selected actor and filters.",
                    )
                  : t("awards.noOscarForYear", "No Oscar contenders found for this year."),
                isOscarError,
                (oscarError as Error | undefined)?.message,
              )}
            </TabsContent>

            <TabsContent value="emmys" className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {t("awards.emmyHeading", "Emmy Award Contenders {{year}}", {
                    year: selectedYear,
                  })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "awards.emmyDescription",
                    "Top-rated series from {{year}} eligible for Emmy consideration",
                    { year: selectedYear },
                  )}
                </p>
              </div>

              {renderGrid(
                filteredEmmyShows,
                loadingEmmy,
                selectedActor
                  ? t(
                      "awards.noEmmyWithActor",
                      "No Emmy contenders matched the selected actor and filters.",
                    )
                  : t("awards.noEmmyForYear", "No Emmy contenders found for this year."),
                isEmmyError,
                (emmyError as Error | undefined)?.message,
              )}
            </TabsContent>

            <TabsContent value="critical" className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {t("awards.criticalHeading", "Critically Acclaimed {{year}}", {
                    year: selectedYear,
                  })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("awards.criticalDescription", "Highest-rated and most popular films from {{year}}", {
                    year: selectedYear,
                  })}
                </p>
              </div>

              {renderGrid(
                filteredCritical,
                loadingCritical,
                selectedActor
                  ? t(
                      "awards.noCriticalWithActor",
                      "No Golden Globe-style contenders matched the selected actor and filters.",
                    )
                  : t(
                      "awards.noCriticalForYear",
                      "No critically acclaimed titles found for this year.",
                    ),
                isCriticalError,
                (criticalError as Error | undefined)?.message,
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
