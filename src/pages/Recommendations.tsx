import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock3,
  EyeOff,
  Sparkles,
  TrendingUp,
  Film,
  Tv,
  Timer,
  Star,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Share2,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserLists } from "@/contexts/UserListsContext";
import {
  getRecommendations,
  getSimilar,
  getImageUrl,
  getBackdropUrl,
  getMediaTitle,
  getMovieDetails,
  getTVDetails,
} from "@/services/tmdb";
import { Media } from "@/types/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import SEO from "@/components/SEO";
import { trackEngagementEvent } from "@/lib/engagement";
import { ShareButton } from "@/components/ShareButton";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/Image";

/* ─────────────────────── types ─────────────────────── */
type RecommendationSection = {
  sourceItem: {
    mediaId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    rating?: number;
  } | null;
  title: string;
  subtitle: string;
  tag: string;
  items: Media[];
};

type FilterKey = "all" | "movie" | "tv" | "short" | "toprated" | "trending";

const FILTER_OPTIONS: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: "movie", label: "Movies", icon: <Film className="h-3.5 w-3.5" /> },
  { key: "tv", label: "Series", icon: <Tv className="h-3.5 w-3.5" /> },
  { key: "short", label: "Under 2h", icon: <Timer className="h-3.5 w-3.5" /> },
  { key: "toprated", label: "Highly Rated", icon: <Star className="h-3.5 w-3.5" /> },
  { key: "trending", label: "Trending", icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

/* ─────────────── useCountUp ─────────────── */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/* ─────────────── HiddenUndoToast ─────────────── */
function HiddenUndoToast({
  title,
  onUndo,
  onDismiss,
}: {
  title: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-border/60 bg-neutral-900/95 px-5 py-3 shadow-2xl backdrop-blur-md md:bottom-8"
    >
      <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm text-foreground">
        <span className="font-semibold">{title}</span> hidden
      </p>
      <button
        type="button"
        onClick={onUndo}
        className="ml-1 flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/25"
      >
        <RotateCcw className="h-3 w-3" />
        Undo
      </button>
      <button type="button" onClick={onDismiss} className="ml-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/* ─────────────── RecommendationCarousel ─────────────── */
function RecommendationCarousel({
  items,
  sectionTitle,
  onHide,
}: {
  items: Media[];
  sectionTitle: string;
  onHide: (media: Media) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < max - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [items.length, sync]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -360 : 360, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Arrow buttons */}
      <button
        type="button"
        onClick={() => scroll("left")}
        disabled={!canLeft}
        className="absolute -left-4 top-1/3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-30 md:flex"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        disabled={!canRight}
        className="absolute -right-4 top-1/3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-30 md:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Edge fade overlays */}
      {canLeft && (
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-background to-transparent md:hidden" />
      )}
      {canRight && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background to-transparent md:hidden" />
      )}

      <div
        ref={scrollRef}
        className="hide-scrollbar -mx-4 flex snap-x snap-proximity gap-4 overflow-x-auto px-4 pb-3 scroll-smooth overscroll-x-contain"
      >
        {items.map((media) => (
          <div
            key={`${sectionTitle}-${media.media_type}-${media.id}`}
            className="group/card relative h-[17rem] w-[132px] flex-shrink-0 snap-start sm:h-[18rem] sm:w-[150px] md:w-[165px]"
          >
            <MediaCard media={media} interactionMode="rail" />
            {/* Hide button */}
            <button
              type="button"
              className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-400 group-hover/card:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHide(media);
              }}
              aria-label={`Hide ${getMediaTitle(media)}`}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── PodiumSection (Top Rated) ─────────────── */
function PodiumSection({
  items,
  onHide,
}: {
  items: Media[];
  onHide: (media: Media) => void;
}) {
  const { t } = useTranslation();
  const [first, second, third, ...rest] = items;

  return (
    <div className="space-y-6">
      {/* Top 3 podium */}
      {first && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Rank #1 – large featured */}
          <div className="relative sm:col-span-2">
            <div className="group/card relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[0_0_40px_rgba(229,9,20,0.12)]">
              {/* Rank badge */}
              <div className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black text-white shadow-lg">
                1
              </div>
              <div className="flex gap-4 p-4">
                <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl sm:h-48 sm:w-32">
                  <Image
                    src={getImageUrl(first.poster_path ?? null, "w342")}
                    alt={getMediaTitle(first)}
                    width={342}
                    height={513}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    showSkeleton
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80 mb-1">
                      {t("recommendations.topPick", "#1 Pick For You")}
                    </p>
                    <h3 className="line-clamp-2 text-lg font-black tracking-tight text-foreground sm:text-xl">
                      {getMediaTitle(first)}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      {first.vote_average ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                          <Star className="h-3 w-3" />
                          {first.vote_average.toFixed(1)}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground capitalize">
                        {first.media_type === "tv" ? "Series" : "Movie"}
                      </span>
                    </div>
                    {first.overview && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {first.overview}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" className="rounded-full text-xs">
                      <Link to={`/${first.media_type === "tv" ? "tv" : "movie"}/${first.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <button
                      type="button"
                      onClick={() => onHide(first)}
                      className="flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-red-500/50 hover:text-red-400"
                    >
                      <EyeOff className="h-3 w-3" />
                      Hide
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ranks #2 & #3 stacked */}
          <div className="flex flex-col gap-4 sm:col-span-1">
            {[second, third].filter(Boolean).map((item, idx) => (
              <div
                key={item!.id}
                className="group/card relative flex gap-3 overflow-hidden rounded-xl border border-border/50 bg-card/70 p-3"
              >
                <div className="absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-card/80 text-xs font-black text-muted-foreground border border-border/50">
                  {idx + 2}
                </div>
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={getImageUrl(item!.poster_path ?? null, "w154")}
                    alt={getMediaTitle(item!)}
                    width={154}
                    height={231}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    showSkeleton
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold text-foreground">{getMediaTitle(item!)}</p>
                  {item!.vote_average ? (
                    <span className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                      <Star className="h-3 w-3" />
                      {item!.vote_average.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onHide(item!)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:text-red-400 group-hover/card:opacity-100"
                >
                  <EyeOff className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rest in carousel */}
      {rest.length > 0 && (
        <RecommendationCarousel items={rest} sectionTitle="top-rated-rest" onHide={onHide} />
      )}
    </div>
  );
}

/* ─────────────── SkeletonHero ─────────────── */
function SkeletonHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 p-8 md:p-10">
      <div className="h-4 w-28 rounded-full skeleton-shimmer mb-4" />
      <div className="h-10 w-72 rounded-xl skeleton-shimmer mb-3" />
      <div className="h-4 w-96 rounded-lg skeleton-shimmer mb-6" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-32 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="h-6 w-48 rounded-lg skeleton-shimmer" />
        <div className="h-6 w-28 rounded-lg skeleton-shimmer" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 w-[132px] shrink-0 sm:w-[150px]">
            <MediaCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function Recommendations() {
  const { t, i18n } = useTranslation();
  const {
    watched,
    watchlist,
    isHiddenFromRecommendations,
    hideFromRecommendations,
    unhideFromRecommendations,
  } = useUserLists();
  const language = i18n.language;

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [undoState, setUndoState] = useState<{
    mediaId: number;
    mediaType: "movie" | "tv";
    title: string;
  } | null>(null);

  const recentWatched = watched.slice(-6).reverse();

  const { data: groupedSections = [], isLoading } = useQuery({
    queryKey: [
      "recommendations-grouped-v2",
      recentWatched.map((item) => `${item.mediaType}-${item.mediaId}`),
      language,
    ],
    queryFn: async () => {
      const watchedIds = new Set(
        watched.map((item) => `${item.mediaType}-${item.mediaId}`),
      );
      const watchlistIds = new Set(
        watchlist.map((item) => `${item.mediaType}-${item.mediaId}`),
      );

      const sections = await Promise.all(
        recentWatched.slice(0, 3).map(async (item) => {
          let items: Media[] = [];
          let sourceTitle = item.mediaType === "tv" ? t("common.tvShow", "TV Show") : t("common.movie", "Movie");
          let sourcePoster: string | null = null;

          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId, language)
                : await getTVDetails(item.mediaId, language);
            sourceTitle = details.title || details.name || sourceTitle;
            sourcePoster = details.poster_path || null;
          } catch {
            // Ignore error
          }

          try {
            const recs = await getRecommendations(item.mediaType, item.mediaId, language);
            items = (recs.results || []).map((media) => ({
              ...media,
              media_type: item.mediaType,
            }));

            if (items.length < 8) {
              const similar = await getSimilar(item.mediaType, item.mediaId, language);
              const existing = new Set(items.map((media) => media.id));
              items = [
                ...items,
                ...(similar.results || [])
                  .filter((media) => !existing.has(media.id))
                  .map((media) => ({ ...media, media_type: item.mediaType })),
              ];
            }
          } catch {
            items = [];
          }

          const deduped = items
            .filter((media, index, self) => {
              const key = `${media.media_type}-${media.id}`;
              return (
                index ===
                  self.findIndex(
                    (c) => c.id === media.id && c.media_type === media.media_type,
                  ) &&
                !watchedIds.has(key) &&
                !watchlistIds.has(key) &&
                !isHiddenFromRecommendations(
                  media.id,
                  media.media_type === "tv" ? "tv" : "movie",
                )
              );
            })
            .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
            .slice(0, 10);

          const watchedEntry = watched.find(
            (w) => w.mediaId === item.mediaId && w.mediaType === item.mediaType,
          );

          return {
            sourceItem: {
              mediaId: item.mediaId,
              mediaType: item.mediaType,
              title: sourceTitle,
              posterPath: sourcePoster,
              rating: watchedEntry?.rating ?? undefined,
            },
            title:
              item.mediaType === "tv"
                ? t("recommendations.becauseYouWatchedSeries", "Because you watched")
                : t("recommendations.becauseYouWatchedFilm", "Because you watched"),
            subtitle: t(
              "recommendations.becauseYouLikedDesc",
              "A stronger next watch built from your recent viewing history.",
            ),
            tag: "Personalised",
            items: deduped,
          } satisfies RecommendationSection;
        }),
      );

      const combined = sections.flatMap((s) => s.items);
      const tonight = combined
        .filter(
          (media) =>
            (media.runtime ?? 0) <= 120 || media.media_type !== "movie",
        )
        .slice(0, 10);
      const prestige = [...combined]
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 10);

      const result: RecommendationSection[] = [
        ...sections.filter((s) => s.items.length > 0),
      ];

      if (tonight.length > 0) {
        result.push({
          sourceItem: null,
          title: t("recommendations.shortWatchTonight", "Short Watch Tonight"),
          subtitle: t(
            "recommendations.shortWatchTonightDesc",
            "Lower-friction picks when you want something easy to start.",
          ),
          tag: "Quick Pick",
          items: tonight,
        });
      }

      if (prestige.length > 0) {
        result.push({
          sourceItem: null,
          title: t("recommendations.topRatedForYou", "Top Rated For You"),
          subtitle: t(
            "recommendations.topRatedForYouDesc",
            "High-confidence picks ranked by quality and fit.",
          ),
          tag: "Prestige",
          items: prestige,
        });
      }

      return result;
    },
    enabled: recentWatched.length > 0,
  });

  const totalCount = useMemo(
    () => groupedSections.reduce((n, s) => n + s.items.length, 0),
    [groupedSections],
  );
  const countSections = useCountUp(groupedSections.length, 800);
  const countTitles = useCountUp(totalCount, 1000);

  /* Top backdrop for cinematic hero */
  const heroPosterPaths = useMemo(() => {
    const all: string[] = [];
    groupedSections.forEach((s) =>
      s.items.slice(0, 3).forEach((m) => {
        if (m.backdrop_path) all.push(m.backdrop_path);
        else if (m.poster_path) all.push(m.poster_path);
      }),
    );
    return all.slice(0, 4);
  }, [groupedSections]);

  /* Filter logic */
  const filteredSections = useMemo(() => {
    if (activeFilter === "all") return groupedSections;
    return groupedSections
      .map((section) => ({
        ...section,
        items: section.items.filter((m) => {
          if (activeFilter === "movie") return m.media_type !== "tv";
          if (activeFilter === "tv") return m.media_type === "tv";
          if (activeFilter === "short") return (m.runtime ?? 999) <= 120;
          if (activeFilter === "toprated") return (m.vote_average ?? 0) >= 7.5;
          if (activeFilter === "trending") return (m.popularity ?? 0) > 100;
          return true;
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [groupedSections, activeFilter]);

  /* Hide with undo */
  const handleHide = useCallback(
    (media: Media) => {
      const mType = media.media_type === "tv" ? "tv" : "movie";
      hideFromRecommendations(media.id, mType);
      trackEngagementEvent("recommendation_hide", { mediaId: media.id, mediaType: mType });
      setUndoState({ mediaId: media.id, mediaType: mType, title: getMediaTitle(media) });
    },
    [hideFromRecommendations],
  );

  const handleUndo = useCallback(() => {
    if (!undoState) return;
    unhideFromRecommendations?.(undoState.mediaId, undoState.mediaType);
    setUndoState(null);
  }, [undoState, unhideFromRecommendations]);

  /* ─── Empty: no history ─── */
  if (!isLoading && watched.length === 0) {
    return (
      <>
        <SEO
          title="Recommendations - CineTrekker"
          description="Personalized movie and TV show recommendations based on what you've watched"
          canonical="https://cinetrekker.vercel.app/recommendations"
        />
        <div className="ct-page-shell min-h-screen">
          <div className="page-container flex min-h-[80vh] flex-col items-center justify-center pt-20">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto max-w-md text-center"
            >
              <div className="relative mx-auto mb-8 h-28 w-28">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 blur-xl" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground">
                {t("recommendations.empty", "Your feed is empty")}
              </h1>
              <p className="mb-8 text-muted-foreground">
                {t(
                  "recommendations.emptyDesc",
                  "Log a few films or episodes and CineTrekker will start shaping your personal feed.",
                )}
              </p>

              {/* Step guide */}
              <div className="mb-8 space-y-3 text-left">
                {[
                  { n: 1, label: "Search for a movie you've seen", icon: <Film className="h-4 w-4" /> },
                  { n: 2, label: "Mark it as Watched", icon: <TrendingUp className="h-4 w-4" /> },
                  { n: 3, label: "Come back here for your feed", icon: <Sparkles className="h-4 w-4" /> },
                ].map(({ n, label, icon }) => (
                  <div
                    key={n}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">
                      {n}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      {icon}
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/search">
                <Button className="gap-2 rounded-full px-6">
                  <TrendingUp className="h-4 w-4" />
                  {t("common.discoverTrending", "Discover Trending")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  /* ─── Empty: not enough history ─── */
  if (!isLoading && groupedSections.length === 0) {
    const progress = Math.min(100, (watched.length / 5) * 100);
    return (
      <>
        <SEO
          title="Recommendations - CineTrekker"
          description="Personalized movie and TV show recommendations based on what you've watched"
          canonical="https://cinetrekker.vercel.app/recommendations"
        />
        <div className="ct-page-shell min-h-screen">
          <div className="page-container flex min-h-[80vh] flex-col items-center justify-center pt-20">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-sm text-center"
            >
              <div className="relative mx-auto mb-8 h-24 w-24">
                <div className="absolute inset-0 rounded-3xl bg-muted/40 blur-xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/50 border border-border/50">
                  <Clock3 className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">
                {t("recommendations.watchMore", "Building your feed…")}
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                {t(
                  "recommendations.watchMoreDesc",
                  "A few more titles and your recommendations will unlock.",
                )}
              </p>

              {/* Progress bar */}
              <div className="mb-6 rounded-xl border border-border/50 bg-card/60 p-4">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted-foreground">Feed progress</span>
                  <span className="font-bold text-foreground">
                    {watched.length}/5 titles
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[#ff6b73]"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {5 - watched.length} more to unlock full recommendations
                </p>
              </div>

              <Link to="/">
                <Button variant="outline" className="gap-2 rounded-full">
                  <TrendingUp className="h-4 w-4" />
                  {t("common.backHome", "Back Home")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  /* ─── Main content ─── */
  return (
    <>
      <SEO
        title="Recommendations - CineTrekker"
        description="Personalized movie and TV show recommendations based on what you've watched"
        canonical="https://cinetrekker.vercel.app/recommendations"
      />

      <div className="ct-page-shell min-h-screen">
        <div className="page-container space-y-8 pt-20 pb-28 md:pb-12">

          {/* ── Hero Header ── */}
          {isLoading ? (
            <SkeletonHero />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md"
            >
              {/* Backdrop mosaic */}
              {heroPosterPaths.length > 0 && (
                <div className="absolute inset-0 grid grid-cols-4 overflow-hidden opacity-15">
                  {heroPosterPaths.map((path, i) => (
                    <img
                      key={i}
                      src={getBackdropUrl(path, "w780") ?? getImageUrl(path, "w342")}
                      alt=""
                      aria-hidden
                      className="h-full w-full object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-background/60" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(229,9,20,0.08),transparent_60%)]" />

              <div className="relative z-10 p-7 md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    {/* Kicker */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                        {t("recommendations.updatedToday", "Updated today")}
                      </span>
                    </div>

                    {/* Title */}
                    <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground md:text-5xl">
                      <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                        {t("recommendations.title", "For You")}
                      </span>
                    </h1>
                    <p className="max-w-lg text-sm text-muted-foreground">
                      {t(
                        "recommendations.subtitle",
                        "Fresh picks organized by why they fit, so your feed feels trustworthy and easy to act on.",
                      )}
                    </p>
                  </div>

                  {/* Stats + Share */}
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-2xl border border-border/50 bg-background/50 px-5 py-3 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t("recommendations.sections", "Sections")}
                      </p>
                      <p className="mt-0.5 text-2xl font-black text-foreground tabular-nums">
                        {countSections}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-background/50 px-5 py-3 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t("recommendations.titlesReady", "Titles")}
                      </p>
                      <p className="mt-0.5 text-2xl font-black text-foreground tabular-nums">
                        {countTitles}
                      </p>
                    </div>
                    <div className="flex items-center rounded-2xl border border-border/50 bg-background/50 px-4 py-3 backdrop-blur-sm">
                      <ShareButton
                        title={t("recommendations.shareTitle", "My CineTrekker recommendations")}
                        url={`${window.location.origin}/recommendations`}
                        text={t(
                          "recommendations.shareText",
                          "These are the titles CineTrekker is recommending for me right now.",
                        )}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Mood / Filter Strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="hide-scrollbar flex gap-2 overflow-x-auto pb-1"
          >
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setActiveFilter(opt.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
                  activeFilter === opt.key
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_20px_rgba(229,9,20,0.3)]"
                    : "border-border/50 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </motion.div>

          {/* ── Sections ── */}
          {isLoading ? (
            <div className="space-y-12">
              <SkeletonSection />
              <SkeletonSection />
            </div>
          ) : filteredSections.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/50 bg-card/40 py-16 text-center"
            >
              <Zap className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-lg font-semibold text-foreground">No titles match this filter</p>
              <p className="text-sm text-muted-foreground">Try another category above.</p>
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className="mt-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50"
              >
                Show all
              </button>
            </motion.div>
          ) : (
            <div className="space-y-14">
              {filteredSections.map((section, sectionIndex) => {
                const isPrestige = section.title === t("recommendations.topRatedForYou", "Top Rated For You");

                return (
                  <motion.section
                    key={section.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sectionIndex * 0.08, duration: 0.45, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    {/* Section header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-start gap-4">
                        {/* Source context card */}
                        {section.sourceItem && (
                          <Link
                            to={`/${section.sourceItem.mediaType === "tv" ? "tv" : "movie"}/${section.sourceItem.mediaId}`}
                            className="group relative shrink-0"
                            aria-label={`View ${section.sourceItem.title}`}
                          >
                            <div className="relative h-16 w-11 overflow-hidden rounded-xl border-2 border-primary/40 shadow-[0_0_20px_rgba(229,9,20,0.2)] transition-all group-hover:border-primary group-hover:shadow-[0_0_28px_rgba(229,9,20,0.4)]">
                              <Image
                                src={getImageUrl(section.sourceItem.posterPath, "w154")}
                                alt={section.sourceItem.title}
                                width={154}
                                height={231}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                showSkeleton
                              />
                              {section.sourceItem.rating && (
                                <div className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white">
                                  {section.sourceItem.rating}
                                </div>
                              )}
                            </div>
                          </Link>
                        )}

                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full border-primary/30 bg-primary/10 px-2 py-0 text-[10px] font-bold text-primary"
                            >
                              {section.tag}
                            </Badge>
                          </div>
                          <h2 className="text-xl font-black tracking-tight text-foreground">
                            {section.title}
                            {section.sourceItem && (
                              <span className="ml-2 text-primary">
                                {section.sourceItem.title}
                              </span>
                            )}
                          </h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {section.subtitle}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
                        {t("recommendations.feedbackHint", "Hide anything that misses the mark")}
                      </p>
                    </div>

                    {/* Items */}
                    {isPrestige ? (
                      <PodiumSection items={section.items} onHide={handleHide} />
                    ) : (
                      <RecommendationCarousel
                        items={section.items}
                        sectionTitle={section.title}
                        onHide={handleHide}
                      />
                    )}
                  </motion.section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Undo Toast ── */}
      <AnimatePresence>
        {undoState && (
          <HiddenUndoToast
            title={undoState.title}
            onUndo={handleUndo}
            onDismiss={() => setUndoState(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
