import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Play,
  Shuffle,
  Bookmark,
  Check,
  Info,
  SlidersHorizontal,
  Clock,
  Film,
  Tv,
  Star,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  discoverMovies,
  discoverTV,
  getBackdropUrl,
  getImageUrl,
  getMediaTitle,
  getMediaYear,
  getTrending,
} from "@/services/tmdb";
import { useUserLists } from "@/contexts/UserListsContext";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { buildMediaPath } from "@/lib/seo";
import TrailerModal from "@/components/TrailerModal";
import type { Media } from "@/types/media";

// ── Vibe definitions ──────────────────────────────────────────────────────────
type VibeKey = "action" | "comedy" | "scifi" | "horror" | "drama" | "feelgood";

interface VibeOption {
  key: VibeKey;
  label: string;
  movieGenre: string;
  tvGenre: string;
  description: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    key: "action",
    label: "High-Octane",
    movieGenre: "28,53",
    tvGenre: "10759",
    description: "Adrenaline, fast pacing, edge-of-your-seat thrills",
  },
  {
    key: "comedy",
    label: "Laugh Out Loud",
    movieGenre: "35",
    tvGenre: "35",
    description: "Uplifting, sharp wit, zero stress",
  },
  {
    key: "scifi",
    label: "Mind-Bending",
    movieGenre: "878,9648",
    tvGenre: "10765,9648",
    description: "Deep mysteries, futuristic concepts, twists",
  },
  {
    key: "horror",
    label: "Chilling & Dark",
    movieGenre: "27,80",
    tvGenre: "80,9648",
    description: "Psychological tension, crime, and darkness",
  },
  {
    key: "drama",
    label: "Deep & Gripping",
    movieGenre: "18",
    tvGenre: "18",
    description: "Character-driven, powerful storytelling",
  },
  {
    key: "feelgood",
    label: "Cozy & Feel-Good",
    movieGenre: "16,10751",
    tvGenre: "16,10751",
    description: "Warm, visually rich, comfortable watching",
  },
];

// ── Runtime & Format options ──────────────────────────────────────────────────
type FormatKey = "quick" | "standard" | "epic" | "series";

interface FormatOption {
  key: FormatKey;
  label: string;
  hint: string;
  isTv: boolean;
  runtimeGte?: string;
  runtimeLte?: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    key: "quick",
    label: "Under 95 min",
    hint: "Short & punchy film",
    isTv: false,
    runtimeLte: "95",
  },
  {
    key: "standard",
    label: "95–130 min",
    hint: "Standard feature film",
    isTv: false,
    runtimeGte: "95",
    runtimeLte: "130",
  },
  {
    key: "epic",
    label: "130+ min",
    hint: "Deep cinematic epic",
    isTv: false,
    runtimeGte: "130",
  },
  {
    key: "series",
    label: "TV Series",
    hint: "Episodic season binge",
    isTv: true,
  },
];

// ── Era filter options ────────────────────────────────────────────────────────
type EraKey = "any" | "modern" | "millennium" | "classic";

interface EraOption {
  key: EraKey;
  label: string;
  dateGte?: string;
  dateLte?: string;
  minRating: number;
}

const ERA_OPTIONS: EraOption[] = [
  {
    key: "any",
    label: "Any Era (Top Rated)",
    minRating: 7.4,
  },
  {
    key: "modern",
    label: "Recent (2020s)",
    dateGte: "2020-01-01",
    minRating: 7.1,
  },
  {
    key: "millennium",
    label: "2000s–2010s",
    dateGte: "2000-01-01",
    dateLte: "2019-12-31",
    minRating: 7.3,
  },
  {
    key: "classic",
    label: "Pre-2000 Classics",
    dateLte: "1999-12-31",
    minRating: 7.6,
  },
];

export function TonightsPick() {
  const { t, i18n } = useTranslation();
  const language = i18n.language || "en";
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);

  const {
    watchlist,
    watched,
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
    isInWatchlist,
    isWatched,
  } = useUserLists();

  // Mode and form selections
  const [useWatchlistMode, setUseWatchlistMode] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<VibeKey>("action");
  const [selectedFormat, setSelectedFormat] = useState<FormatKey>("standard");
  const [selectedEra, setSelectedEra] = useState<EraKey>("any");

  // Flow states: configuring -> decided
  const [isDecided, setIsDecided] = useState(false);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const activeVibe = useMemo(
    () => VIBE_OPTIONS.find((v) => v.key === selectedVibe) || VIBE_OPTIONS[0],
    [selectedVibe],
  );
  const activeFormat = useMemo(
    () => FORMAT_OPTIONS.find((f) => f.key === selectedFormat) || FORMAT_OPTIONS[1],
    [selectedFormat],
  );
  const activeEra = useMemo(
    () => ERA_OPTIONS.find((e) => e.key === selectedEra) || ERA_OPTIONS[0],
    [selectedEra],
  );

  // Exclude watched IDs to never recommend what's already completed
  const watchedIds = useMemo(
    () => new Set(watched.map((w) => w.mediaId)),
    [watched],
  );

  // Discover query for "Tonight's Pick"
  const {
    data: discoverData,
    isLoading: isDiscoverLoading,
    isFetching: isDiscoverFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "tonights-pick-discover",
      language,
      selectedVibe,
      selectedFormat,
      selectedEra,
      includeAdult,
    ],
    queryFn: async () => {
      if (activeFormat.isTv) {
        const params = {
          with_genres: activeVibe.tvGenre,
          vote_count_gte: "150",
          vote_average_gte: activeEra.minRating.toString(),
          sort_by: "popularity.desc",
          first_air_date_gte: activeEra.dateGte,
          first_air_date_lte: activeEra.dateLte,
          include_adult: includeAdult ? "true" : "false",
        };
        const res = await discoverTV(params, language);
        return res.results.map((item) => ({ ...item, media_type: "tv" as const }));
      }

      const params = {
        with_genres: activeVibe.movieGenre,
        vote_count_gte: "250",
        vote_average_gte: activeEra.minRating.toString(),
        sort_by: "popularity.desc",
        primary_release_date_gte: activeEra.dateGte,
        primary_release_date_lte: activeEra.dateLte,
        with_runtime_gte: activeFormat.runtimeGte,
        with_runtime_lte: activeFormat.runtimeLte,
        include_adult: includeAdult ? "true" : "false",
      };
      const res = await discoverMovies(params, language);
      return res.results.map((item) => ({ ...item, media_type: "movie" as const }));
    },
    staleTime: 1000 * 60 * 15,
  });

  // Filter pool by removing already watched titles
  const candidates: Media[] = useMemo(() => {
    const rawList = discoverData || [];
    const filtered = rawList.filter(
      (item) => !watchedIds.has(item.id) && Boolean(item.backdrop_path || item.poster_path),
    );
    return filtered.length > 0 ? filtered : rawList;
  }, [discoverData, watchedIds]);

  // Active Pick item
  const currentPick = candidates[activeCandidateIndex % Math.max(candidates.length, 1)];

  const currentTitle = currentPick ? getMediaTitle(currentPick) : "";
  const currentYear = currentPick ? getMediaYear(currentPick) : "";
  const currentMediaType = (currentPick?.media_type === "tv" ? "tv" : "movie") as "movie" | "tv";
  const currentMediaPath = currentPick
    ? buildMediaPath(currentMediaType, currentPick.id, currentTitle)
    : "";

  const inWatchlist = currentPick ? isInWatchlist(currentPick.id, currentMediaType) : false;
  const inWatched = currentPick ? isWatched(currentPick.id, currentMediaType) : false;

  const currentBackdrop = currentPick?.backdrop_path
    ? getBackdropUrl(currentPick.backdrop_path, "w1280")
    : null;
  const currentPoster = currentPick?.poster_path
    ? getImageUrl(currentPick.poster_path, "w342")
    : null;

  const handleRollAnother = () => {
    if (candidates.length <= 1) {
      void refetch();
      return;
    }
    setActiveCandidateIndex((prev) => (prev + 1) % candidates.length);
  };

  const handleFindPick = () => {
    setActiveCandidateIndex(0);
    setIsDecided(true);
  };

  const handleResetPreferences = () => {
    setIsDecided(false);
  };

  return (
    <section
      id="tonights-pick"
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card/75 p-5 shadow-lg backdrop-blur-md md:p-7"
      aria-labelledby="tonights-pick-title"
    >
      {/* Background ambient gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative">
        {/* Header Eyebrow & Title */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("home.tonightsPickKicker", "30-Second Decision Tool")}
            </div>
            <h2
              id="tonights-pick-title"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {t("home.tonightsPickTitle", "Tonight's Pick")}
            </h2>
          </div>

          {/* Watchlist toggle if user has saved items */}
          {watchlist.length > 0 && !isDecided && (
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setUseWatchlistMode(false)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-semibold transition-colors",
                  !useWatchlistMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("home.discoverNew", "Discover New")}
              </button>
              <button
                type="button"
                onClick={() => setUseWatchlistMode(true)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-semibold transition-colors",
                  useWatchlistMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("home.fromMyWatchlist", "My Watchlist ({{count}})", {
                  count: watchlist.length,
                })}
              </button>
            </div>
          )}
        </div>

        {/* ── MODE 1: CONFIGURING STEP-BY-STEP PICKER ── */}
        {!isDecided && (
          <div className="space-y-5">
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t(
                "home.tonightsPickDescription",
                "Stop endless scrolling. Pick a vibe and your available time tonight to get one confident title recommendation.",
              )}
            </p>

            {/* Step 1: Vibe Selection */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>1. {t("home.pickVibeLabel", "Pick Your Vibe")}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {VIBE_OPTIONS.map((vibe) => {
                  const isSelected = selectedVibe === vibe.key;
                  return (
                    <button
                      key={vibe.key}
                      type="button"
                      onClick={() => setSelectedVibe(vibe.key)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex flex-col items-start rounded-xl border p-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                      )}
                    >
                      <span className="text-xs font-bold leading-tight">{vibe.label}</span>
                      <span className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-80">
                        {vibe.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Time & Format */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>2. {t("home.availableTimeLabel", "Available Time & Format")}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FORMAT_OPTIONS.map((format) => {
                  const isSelected = selectedFormat === format.key;
                  return (
                    <button
                      key={format.key}
                      type="button"
                      onClick={() => setSelectedFormat(format.key)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                      )}
                    >
                      {format.isTv ? (
                        <Tv className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Film className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">{format.label}</p>
                        <p className="text-[10px] leading-3 opacity-75">{format.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Era / Quality Level */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                <Star className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>3. {t("home.eraFilterLabel", "Era & Focus")}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ERA_OPTIONS.map((era) => {
                  const isSelected = selectedEra === era.key;
                  return (
                    <button
                      key={era.key}
                      type="button"
                      onClick={() => setSelectedEra(era.key)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-2.5 px-3 text-left text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary bg-primary/10 font-bold text-primary shadow-sm"
                          : "border-border/60 bg-card/40 font-medium text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                      )}
                    >
                      <span>{era.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        ★ {era.minRating}+
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Action */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleFindPick}
                disabled={isDiscoverLoading && !candidates.length}
                className="btn-primary-glow min-h-12 w-full gap-2 rounded-xl text-sm font-bold sm:w-auto sm:px-8"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{t("home.findTonightsPick", "Decide What to Watch Tonight")}</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── MODE 2: DECISIVE PICK CARD ── */}
        {isDecided && (
          <div className="space-y-4">
            {isDiscoverFetching && !currentPick ? (
              <div className="min-h-[280px] animate-pulse rounded-xl border border-border/60 bg-card/50 p-6 flex flex-col justify-center items-center gap-3">
                <div className="h-6 w-48 rounded bg-muted skeleton-shimmer" />
                <div className="h-4 w-72 rounded bg-muted skeleton-shimmer" />
              </div>
            ) : currentPick ? (
              <div className="overflow-hidden rounded-xl border border-border/80 bg-background/60 shadow-md">
                {/* Visual Banner Header */}
                <div className="relative min-h-[220px] sm:min-h-[260px] md:min-h-[300px] w-full overflow-hidden bg-black/40">
                  {currentBackdrop ? (
                    <img
                      src={currentBackdrop}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : currentPoster ? (
                    <img
                      src={currentPoster}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-center filter blur-md opacity-40"
                    />
                  ) : null}

                  {/* Dark gradients for high legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />

                  {/* Badges on top */}
                  <div className="absolute left-4 top-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-primary/40 bg-primary/20 text-xs font-semibold text-primary"
                      >
                        {activeVibe.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border/60 bg-background/80 text-xs text-muted-foreground"
                      >
                        {currentMediaType === "tv" ? "TV Series" : "Movie"}
                      </Badge>
                      {currentYear && (
                        <span className="text-xs font-medium text-white/80">{currentYear}</span>
                      )}
                    </div>

                    {currentPick.vote_average > 0 && (
                      <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 text-xs font-bold text-primary shadow-sm">
                        <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
                        <span>{currentPick.vote_average.toFixed(1)}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({currentPick.vote_count.toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content anchored to bottom left */}
                  <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-2 sm:inset-x-6 sm:bottom-6">
                    <h3 className="text-2xl font-black tracking-tight text-white drop-shadow sm:text-3xl lg:text-4xl">
                      {currentTitle}
                    </h3>

                    {currentPick.overview && (
                      <p className="line-clamp-3 max-w-3xl text-xs leading-relaxed text-white/85 sm:text-sm">
                        {currentPick.overview}
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary Decision Action Bar */}
                <div className="border-t border-border/60 bg-card/60 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Commit Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Watch Trailer */}
                      <Button
                        type="button"
                        onClick={() => setTrailerOpen(true)}
                        className="btn-primary-glow min-h-11 rounded-lg gap-2 text-xs font-bold sm:text-sm"
                      >
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                        <span>{t("actions.watchTrailer", "Watch Trailer")}</span>
                      </Button>

                      {/* Add to Watchlist */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (inWatchlist) {
                            void removeFromWatchlist(currentPick.id, currentMediaType);
                          } else {
                            void addToWatchlist(currentPick.id, currentMediaType);
                          }
                        }}
                        className="min-h-11 rounded-lg border-border/80 bg-background/60 gap-2 text-xs font-semibold sm:text-sm"
                      >
                        <Bookmark
                          className={cn("h-4 w-4", inWatchlist && "fill-primary text-primary")}
                          aria-hidden="true"
                        />
                        <span>
                          {inWatchlist
                            ? t("actions.inWatchlist", "In Watchlist")
                            : t("actions.addToWatchlist", "Add to Watchlist")}
                        </span>
                      </Button>

                      {/* Mark Watched */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (inWatched) {
                            void removeFromWatched(currentPick.id, currentMediaType);
                          } else {
                            void addToWatched(
                              currentPick.id,
                              currentMediaType,
                              undefined,
                              undefined,
                              "completed",
                            );
                          }
                        }}
                        className={cn(
                          "min-h-11 rounded-lg border-border/80 bg-background/60 gap-2 text-xs font-medium sm:text-sm",
                          inWatched && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                        )}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {inWatched
                            ? t("actions.watched", "Watched")
                            : t("actions.markAsWatched", "Mark as Watched")}
                        </span>
                      </Button>

                      {/* Full Details link */}
                      <Button
                        asChild
                        variant="ghost"
                        className="min-h-11 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground sm:text-sm"
                      >
                        <Link to={currentMediaPath}>
                          <Info className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          <span>{t("common.details", "Details")}</span>
                        </Link>
                      </Button>
                    </div>

                    {/* Right: Roll Another / Adjust Preferences */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRollAnother}
                        className="min-h-11 rounded-lg border-border/80 bg-background/50 gap-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary sm:text-sm"
                      >
                        <Shuffle className="h-4 w-4" aria-hidden="true" />
                        <span>{t("home.rollAnotherPick", "Roll Another")}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResetPreferences}
                        className="min-h-11 rounded-lg gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t("home.changeVibe", "Change Vibe")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback if no matching title found */
              <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {t(
                    "home.noTonightsPickFound",
                    "No exact match found for this specific combination.",
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "home.tryBroadeningFilters",
                    "Try broadening your era or switching to 'Any Era' to find top-rated titles.",
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetPreferences}
                  className="mt-3 gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t("home.resetFilters", "Reset Filters")}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Video Trailer Modal */}
        {currentPick && (
          <TrailerModal
            id={currentPick.id}
            mediaType={currentMediaType}
            open={trailerOpen}
            onClose={() => setTrailerOpen(false)}
          />
        )}
      </div>
    </section>
  );
}
