import { useState, useMemo } from "react";
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
  Film,
  Tv,
  Star,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  discoverMovies,
  discoverTV,
  getBackdropUrl,
  getImageUrl,
  getMediaTitle,
  getMediaYear,
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

type ModalStep = 1 | 2 | 3 | "result";

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

  // Modal dialog and step states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
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

  // Filter pool by removing already watched titles and honoring watchlist mode when chosen
  const candidates: Media[] = useMemo(() => {
    const rawList = discoverData || [];
    const pool = rawList.filter(
      (item) => !watchedIds.has(item.id) && Boolean(item.backdrop_path || item.poster_path),
    );

    if (useWatchlistMode && watchlist.length > 0) {
      const watchlistIds = new Set(watchlist.map((w) => w.mediaId));
      const watchlistFiltered = pool.filter((item) => watchlistIds.has(item.id));
      if (watchlistFiltered.length > 0) {
        return watchlistFiltered;
      }
    }

    return pool;
  }, [discoverData, watchedIds, useWatchlistMode, watchlist]);

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

  const handleOpenModal = () => {
    setModalStep(1);
    setIsModalOpen(true);
  };

  const handleRollAnother = () => {
    if (candidates.length <= 1) {
      void refetch();
      return;
    }
    setActiveCandidateIndex((prev) => (prev + 1) % candidates.length);
  };

  const handleNextStep = () => {
    if (modalStep === 1) setModalStep(2);
    else if (modalStep === 2) setModalStep(3);
  };

  const handlePrevStep = () => {
    if (modalStep === 2) setModalStep(1);
    else if (modalStep === 3) setModalStep(2);
    else if (modalStep === "result") setModalStep(3);
  };

  const handleDecide = () => {
    setActiveCandidateIndex(0);
    setModalStep("result");
  };

  return (
    <section
      id="tonights-pick"
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-sm md:p-6"
      aria-labelledby="tonights-pick-title"
    >
      <div className="relative">
        {/* Header Eyebrow & Title */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("home.tonightsPickKicker", "30-Second Decision Tool")}</span>
            </div>
            <h2
              id="tonights-pick-title"
              className="text-xl font-bold tracking-tight text-foreground md:text-2xl"
            >
              {t("home.tonightsPickTitle", "Tonight's Pick")}
            </h2>
          </div>

          {/* Secondary Watchlist toggle styled as a crisp segmented control */}
          {watchlist.length > 0 && (
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setUseWatchlistMode(false)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  !useWatchlistMode
                    ? "bg-secondary text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("home.discoverNew", "Discover New")}
              </button>
              <button
                type="button"
                onClick={() => setUseWatchlistMode(true)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  useWatchlistMode
                    ? "bg-secondary text-foreground shadow-xs"
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

        {/* Minimal, confident hero copy: clean, legible, restrained */}
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {t(
            "home.tonightsPickDescription",
            "Stop endless scrolling. Pick a vibe and your available time tonight to get one confident title recommendation.",
          )}
        </p>

        {/* Clear, solid CTA button without neon glow */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleOpenModal}
            className="min-h-10 gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("home.decideWhatToWatch", "Decide What to Watch")}</span>
          </Button>

          <span className="text-xs text-muted-foreground">
            {t("home.quickDecisionSubtext", "3 guided steps • Tailored to your time")}
          </span>
        </div>
      </div>

      {/* ── STEP-BY-STEP GUIDED MODAL ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden border border-border/80 bg-background/95 backdrop-blur-md shadow-xl duration-200",
            // Mobile: bottom-sheet takeover; Desktop: clean centered modal
            "max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[90vh] max-sm:border-x-0 max-sm:border-b-0",
            "sm:max-w-xl sm:rounded-2xl sm:max-h-[85vh]",
          )}
        >
          {/* Modal Header & Minimalist Stepper */}
          <DialogHeader className="border-b border-border/50 bg-card/40 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 text-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-bold text-foreground">
                  {t("home.tonightsPickTitle", "Tonight's Pick")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {modalStep === "result"
                    ? t("home.yourTailoredPick", "Your tailored recommendation for tonight")
                    : t("home.modalStepCounter", "Step {{current}} of 3", {
                        current: modalStep,
                      })}
                </DialogDescription>
              </div>
            </div>

            {/* Clean 3-step progress bar */}
            {modalStep !== "result" && (
              <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-200",
                    modalStep >= 1 ? "bg-primary" : "bg-muted/60",
                  )}
                />
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-200",
                    modalStep >= 2 ? "bg-primary" : "bg-muted/60",
                  )}
                />
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-200",
                    modalStep >= 3 ? "bg-primary" : "bg-muted/60",
                  )}
                />
              </div>
            )}
          </DialogHeader>

          {/* Modal Body: One Step at a Time */}
          <div className="overflow-y-auto p-5 sm:p-6 max-h-[calc(85vh-140px)]">
            {/* ── STEP 1: VIBE ── */}
            {modalStep === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("home.pickVibeLabel", "Pick Your Vibe")}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {t("home.vibePrompt", "What kind of energy or mood are you craving tonight?")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {VIBE_OPTIONS.map((vibe) => {
                    const isSelected = selectedVibe === vibe.key;
                    return (
                      <button
                        key={vibe.key}
                        type="button"
                        onClick={() => setSelectedVibe(vibe.key)}
                        aria-pressed={isSelected}
                        className={cn(
                          "group relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "border-primary/80 bg-primary/[0.04] text-foreground ring-1 ring-primary/20"
                            : "border-border/60 bg-secondary/20 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground",
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <span
                            className={cn(
                              "text-xs font-semibold leading-tight",
                              isSelected
                                ? "text-foreground"
                                : "text-foreground/90 group-hover:text-foreground",
                            )}
                          >
                            {vibe.label}
                          </span>
                          {isSelected && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {vibe.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 2: TIME & FORMAT ── */}
            {modalStep === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("home.availableTimeLabel", "Available Time & Format")}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {t(
                      "home.timePrompt",
                      "How much time do you want to invest in tonight's watch?",
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {FORMAT_OPTIONS.map((format) => {
                    const isSelected = selectedFormat === format.key;
                    return (
                      <button
                        key={format.key}
                        type="button"
                        onClick={() => setSelectedFormat(format.key)}
                        aria-pressed={isSelected}
                        className={cn(
                          "group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "border-primary/80 bg-primary/[0.04] text-foreground ring-1 ring-primary/20"
                            : "border-border/60 bg-secondary/20 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                              isSelected
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border/50 bg-background/50 text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            {format.isTv ? (
                              <Tv className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Film className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </div>
                          {isSelected && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-tight text-foreground">
                            {format.label}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-3 text-muted-foreground">
                            {format.hint}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: ERA & FOCUS ── */}
            {modalStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("home.eraFilterLabel", "Era & Focus")}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {t(
                      "home.eraPrompt",
                      "Filter by release period or open it up to all-time top-rated classics.",
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ERA_OPTIONS.map((era) => {
                    const isSelected = selectedEra === era.key;
                    return (
                      <button
                        key={era.key}
                        type="button"
                        onClick={() => setSelectedEra(era.key)}
                        aria-pressed={isSelected}
                        className={cn(
                          "group flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "border-primary/80 bg-primary/[0.04] text-foreground ring-1 ring-primary/20"
                            : "border-border/60 bg-secondary/20 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                          <span className="text-xs font-semibold text-foreground">
                            {era.label}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          ★ {era.minRating}+
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP "RESULT": DECISIVE PICK CARD ── */}
            {modalStep === "result" && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                {isDiscoverFetching && !currentPick ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-card/40 p-6 text-center">
                    <Sparkles className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">
                      {t("home.findingBestPick", "Finding your decisive pick tonight...")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("home.filteringByVibe", "Matching {{vibe}} with top community ratings", {
                        vibe: activeVibe.label,
                      })}
                    </p>
                  </div>
                ) : currentPick ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50">
                    {/* Visual Banner Header */}
                    <div className="relative min-h-[210px] w-full overflow-hidden bg-black/60 sm:min-h-[250px]">
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
                          className="absolute inset-0 h-full w-full object-cover object-center opacity-40 blur-md filter"
                        />
                      ) : null}

                      {/* Single clean dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                      {/* Badges on top */}
                      <div className="absolute left-3 top-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 sm:left-4 sm:top-4 sm:right-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-primary/40 bg-background/80 text-xs font-semibold text-primary"
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
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/85 px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-xs">
                            <Star
                              className="h-3 w-3 fill-amber-400 text-amber-400"
                              aria-hidden="true"
                            />
                            <span>{currentPick.vote_average.toFixed(1)}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              ({currentPick.vote_count.toLocaleString()})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content anchored to bottom */}
                      <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-1.5 sm:inset-x-4 sm:bottom-4">
                        <h4 className="text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-2xl">
                          {currentTitle}
                        </h4>

                        {currentPick.overview && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-white/80 sm:text-sm">
                            {currentPick.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Primary Decision Action Bar */}
                    <div className="border-t border-border/50 bg-card/40 p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Commit Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Watch Trailer */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setTrailerOpen(true)}
                            className="h-9 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            <span>{t("actions.watchTrailer", "Watch Trailer")}</span>
                          </Button>

                          {/* Add to Watchlist */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (inWatchlist) {
                                void removeFromWatchlist(currentPick.id, currentMediaType);
                              } else {
                                void addToWatchlist(currentPick.id, currentMediaType);
                              }
                            }}
                            className={cn(
                              "h-9 rounded-lg border-border/60 bg-background/50 gap-1.5 text-xs font-medium",
                              inWatchlist && "border-primary/40 bg-primary/10 text-primary",
                            )}
                          >
                            <Bookmark
                              className={cn("h-3.5 w-3.5", inWatchlist && "fill-primary text-primary")}
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
                            size="sm"
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
                              "h-9 rounded-lg border-border/60 bg-background/50 gap-1.5 text-xs font-medium",
                              inWatched && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {inWatched
                                ? t("actions.watched", "Watched")
                                : t("actions.markAsWatched", "Mark as Watched")}
                            </span>
                          </Button>

                          {/* Full Details link */}
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            <Link to={currentMediaPath} onClick={() => setIsModalOpen(false)}>
                              <Info className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              <span>{t("common.details", "Details")}</span>
                            </Link>
                          </Button>
                        </div>

                        {/* Roll Another / Adjust Preferences */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleRollAnother}
                            className="h-9 rounded-lg border-border/60 bg-background/50 gap-1.5 text-xs font-medium text-foreground hover:bg-secondary/60"
                          >
                            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t("home.rollAnotherPick", "Roll Another")}</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setModalStep(1)}
                            className="h-9 rounded-lg gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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
                  <div className="rounded-xl border border-border/60 bg-card/30 p-6 text-center">
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
                      onClick={() => setModalStep(1)}
                      className="mt-3.5 h-9 gap-1.5 rounded-lg border-border/60 bg-background/50 text-xs font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>{t("home.resetFilters", "Reset Filters")}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between border-t border-border/50 bg-card/40 px-5 py-3 sm:px-6">
            {modalStep === "result" ? (
              <div className="flex w-full items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevStep}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>{t("home.adjustCriteria", "Adjust Criteria")}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 rounded-lg border-border/60 text-xs font-medium"
                >
                  <span>{t("common.done", "Done")}</span>
                </Button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                {modalStep > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevStep}
                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>{t("common.back", "Back")}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>{t("common.cancel", "Cancel")}</span>
                  </Button>
                )}

                {modalStep < 3 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNextStep}
                    className="h-8 gap-1 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium shadow-xs"
                  >
                    <span>{t("common.next", "Next")}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDecide}
                    disabled={isDiscoverLoading && !candidates.length}
                    className="h-8 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 text-xs font-semibold shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("home.decideWhatToWatch", "Decide What to Watch")}</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Trailer Modal */}
      {currentPick && (
        <TrailerModal
          id={currentPick.id}
          mediaType={currentMediaType}
          open={trailerOpen}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </section>
  );
}
