import React, { useState, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Star,
  Check,
  Loader2,
  Bookmark,
} from "lucide-react";
import { Media } from "@/types/media";
import {
  getImageUrl,
  getMediaTitle,
  getMediaYear,
  getMediaType,
} from "@/services/tmdb";
import { useInView } from "@/hooks/useInView";
import { useUserLists } from "@/contexts/UserListsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TVWatchStatusModal } from "@/components/TVWatchStatusModal";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useEffect } from "react";
import { Image } from "@/components/ui/Image";
import { cn } from "../lib/utils";
import { getMediaAltText } from "@/lib/seo";

export interface MediaCardProps {
  media: Media & { watchStatus?: string };
  mediaType?: 'movie' | 'tv';
  showType?: boolean;
  showStatus?: boolean;
  onAction?: () => void;
}

export interface WatchStatusConfig {
  icon: string;
  label: string;
  color: string;
}

const STATUS_CONFIG: Record<string, WatchStatusConfig> = {
  watching: { icon: "", label: "Watching", color: "bg-primary" },
  completed: { icon: "", label: "Completed", color: "bg-green-500" },
  dropped: { icon: "", label: "Dropped", color: "bg-red-500" },
  plan_to_watch: { icon: "", label: "Plan to Watch", color: "bg-yellow-500" },
};

// Stable options — not an inline object, so the useInView effect dep array
// never sees a reference change and re-creates observers.
const POSTER_IN_VIEW_OPTIONS = { rootMargin: '300px' };

const PosterImage = React.memo(function PosterImage({
  posterPath,
  alt,
}: {
  posterPath: string | null;
  alt: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(POSTER_IN_VIEW_OPTIONS);

  if (!posterPath) {
    return (
      <div
        ref={ref as React.RefCallback<HTMLDivElement>}
        className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted flex items-center justify-center"
      >
        <div className="text-center px-3">
          <Image
            src="/placeholder.svg"
            alt="Poster Not Found"
            width={48}
            height={64}
            className="mx-auto h-16 w-12 object-contain opacity-80"
            loading="lazy"
          />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Poster Not Found
          </p>
        </div>
      </div>
    );
  }

  const tiny = getImageUrl(posterPath, "w92");
  const small = getImageUrl(posterPath, "w185");
  const medium = getImageUrl(posterPath, "w342");

  return (
    <div
      ref={ref as React.RefCallback<HTMLDivElement>}
      className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted"
    >
      {inView ? (
        (tiny || small || medium) ? (
          <img
            src={small || medium || ''}
            srcSet={`${tiny ? `${tiny} 92w, ` : ''}${small ? `${small} 185w, ` : ''}${medium ? `${medium} 342w` : ''}`}
            sizes="(max-width: 480px) calc(50vw - 24px), (max-width: 768px) calc(33vw - 20px), (max-width: 1024px) calc(25vw - 20px), 200px"
            alt={alt}
            width={185}
            height={278}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full skeleton-shimmer" />
        )
      ) : (
        <div className="w-full h-full skeleton-shimmer" />
      )}
    </div>
  );
});

export const MediaCard = React.memo(function MediaCard({ media, mediaType: mediaTypeProp, showType = true, showStatus = false }: MediaCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const {
    isInWatchlist,
    isWatched,
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
    watched: watchedList,
  } = useUserLists();
  const { markEpisodeWatched } = useWatchedEpisodes();

  const triggerMilestoneConfetti = useCallback(() => {
    const movieCount = (watchedList ?? []).filter((w) => w.mediaType === "movie").length;
    // Burst on the 25th, 50th, 100th… movie milestone
    if (movieCount > 0 && movieCount % 25 === 0) {
      void confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#E50914", "#F97316", "#F2C572", "#FB7185", "#ffffff"],
        gravity: 1.1,
        scalar: 0.9,
      });
    }
  }, [watchedList]);
  // Pending flags are only used to drive spinner display during async ops.
  // We read watchlist/watched truth directly from context (already optimistic
  // via React Query's onMutate) so we don't need redundant local state that
  // would cause a double-render on every toggle.
  const [isWatchlistPending, setIsWatchlistPending] = useState(false);
  const [isWatchedPending, setIsWatchedPending] = useState(false);
  const [watchStatusModalOpen, setWatchStatusModalOpen] = useState(false);

  const title = useMemo(() => getMediaTitle(media), [media]);
  const year = useMemo(() => getMediaYear(media), [media]);
  const mediaType = useMemo(
    () => mediaTypeProp ?? getMediaType(media),
    [mediaTypeProp, media],
  );
  const posterAlt = getMediaAltText(title, mediaType, "poster");
  // Read directly from context — context is already optimistically updated
  // by React Query's onMutate, so the UI responds at 0 ms.
  const optimisticInWatchlist = isInWatchlist(media.id, mediaType);
  const optimisticWatched = isWatched(media.id, mediaType);
  const watchStatus = media.watchStatus;
  const rating = media.vote_average;
  const ratingClass = rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low';

  type PreventableEvent = {
    preventDefault: () => void;
    stopPropagation: () => void;
    nativeEvent?: Event;
  };

  const suppressCardNavigation = (e: PreventableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      e.nativeEvent &&
      typeof (e.nativeEvent as Event & { stopImmediatePropagation?: () => void })
        .stopImmediatePropagation === "function"
    ) {
      (e.nativeEvent as Event & { stopImmediatePropagation: () => void })
        .stopImmediatePropagation();
    }
  };

  const handleWatchlistClick = async (e: PreventableEvent) => {
    suppressCardNavigation(e);
    setIsWatchlistPending(true);
    const nextState = !optimisticInWatchlist;
    setOptimisticInWatchlist(nextState);

    try {
      if (nextState) {
        await addToWatchlist(media.id, mediaType);
      } else {
        await removeFromWatchlist(media.id, mediaType);
      }

      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          (navigator as Navigator).vibrate?.(10);
        }
      } catch {
        // Ignore vibration API failures for unsupported devices/browsers.
      }
    } catch {
      setOptimisticInWatchlist(!nextState);
    } finally {
      setIsWatchlistPending(false);
    }
  };

  const handleWatchedClick = async (e: PreventableEvent) => {
    suppressCardNavigation(e);

    if (optimisticWatched) {
      setIsWatchedPending(true);
      try {
        await removeFromWatched(media.id, mediaType);
      } finally {
        setIsWatchedPending(false);
      }
      return;
    }

    // For TV shows, open modal to choose watch type
    if (mediaType === "tv" && user) {
      setWatchStatusModalOpen(true);
      return;
    }

    // Guests can still track watched titles locally.
    setIsWatchedPending(true);
    try {
      await addToWatched(media.id, mediaType);

      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          (navigator as Navigator).vibrate?.([10, 30, 15]);
        }
      } catch {
        // Ignore vibration API failures.
      }

      // Milestone confetti
      triggerMilestoneConfetti();
    } finally {
      setIsWatchedPending(false);
    }
  };

  const handleWatchAllSeries = () => {
    addToWatched(media.id, mediaType);
  };

  const handleSelectEpisodes = (episodes: Array<{ season: number; episode: number }>): void => {
    // Mark selected episodes as watched
    for (const ep of episodes) {
      markEpisodeWatched({
        showId: media.id,
        seasonNumber: ep.season,
        episodeNumber: ep.episode,
        episodeName: undefined,
        airDate: undefined,
      });
    }
  };

  const handleToggleSelect = (e: PreventableEvent) => {
    suppressCardNavigation(e);
    onToggleSelect?.(media.id, mediaType);
  };

  const actionEventProps = {
    "data-card-action": "true",
  };

  // Quick view removed - card links to details page via the surrounding <Link>

  return (
    <>
      <Link
        to={buildMediaPath(mediaType, media.id, title)}
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 shadow-card transition-all duration-300 glass-card-hover md:hover:border-primary/20 md:hover:scale-[1.03] md:hover:-translate-y-1 active:scale-[1.01] active:border-primary/30 focus-ring focus-visible:border-primary/35"
        aria-label={`${title} - open details`}
        tabIndex={0}
      >
        {/* Poster with gradient overlay for text readability */}
        <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl bg-surface-dark-3">
          <PosterImage posterPath={media.poster_path} alt={posterAlt} />

          {/* Enhanced gradient overlay - darker on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark-2/80 via-transparent to-transparent opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100" />
          {selectable ? (
            <div className="absolute right-2 top-2 z-20">
              <Button
                {...actionEventProps}
                type="button"
                variant={selected ? "default" : "secondary"}
                size="sm"
                className="min-h-[44px] min-w-[44px] rounded-full px-3 text-xs shadow-lg"
                onPointerDown={suppressCardNavigation}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleToggleSelect(event);
                }}
                aria-pressed={selected}
                aria-label={
                  selected
                    ? t("mediaCard.deselectTitle", "Deselect title")
                    : t("mediaCard.selectTitle", "Select title")
                }
              >
                {selected ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  t("mediaCard.select", "Select")
                )}
              </Button>
            </div>
          ) : null}
          {showInlineActions ? (
            <div className="absolute inset-x-3 bottom-3 z-20 hidden translate-y-2 flex-col gap-2 opacity-0 transition-all duration-200 md:flex md:group-hover:translate-y-0 md:group-hover:opacity-100">
              <Button
                {...actionEventProps}
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-10 w-full justify-center gap-2 backdrop-blur-md",
                  optimisticInWatchlist
                    ? "border-red-500/70 bg-red-600 text-white hover:bg-red-700"
                    : "border-white/20 bg-background/80 text-foreground",
                )}
                onPointerDown={suppressCardNavigation}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleWatchlistClick(event);
                }}
                aria-label={`Add ${title} to watchlist`}
              >
                {isWatchlistPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                {t("actions.watchlist", "Watchlist")}
              </Button>
              <Button
                {...actionEventProps}
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-10 w-full justify-center gap-2 backdrop-blur-md",
                  optimisticWatched
                    ? "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-white/20 bg-background/70 text-foreground",
                )}
                onPointerDown={suppressCardNavigation}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleWatchedClick(event);
                }}
                aria-label={`Mark ${title} as watched`}
              >
                {isWatchedPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t("actions.watched", "Watched")}
              </Button>
            </div>
          ) : null}

          {showInlineActions ? (
            <div className="absolute right-2 top-12 z-20 flex flex-col gap-2 md:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    {...actionEventProps}
                    type="button"
                    size="icon"
                    variant="outline"
                    className={cn(
                      "h-12 w-12 rounded-full border-white/15 bg-black/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl",
                      optimisticInWatchlist &&
                        "border-red-500/70 bg-red-600 text-white hover:bg-red-700",
                    )}
                    onPointerDown={suppressCardNavigation}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleWatchlistClick(event);
                    }}
                    aria-label={`Add ${title} to watchlist`}
                  >
                    {isWatchlistPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("actions.watchlist", "Watchlist")}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    {...actionEventProps}
                    type="button"
                    size="icon"
                    variant="outline"
                    className={cn(
                      "h-12 w-12 rounded-full border-white/15 bg-black/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl",
                      optimisticWatched &&
                        "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                    onPointerDown={suppressCardNavigation}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleWatchedClick(event);
                    }}
                    aria-label={`Mark ${title} as watched`}
                  >
                    {isWatchedPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("actions.watched", "Watched")}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}

          {/* Status Badges - positioned above gradient */}
          <div className="absolute top-2 left-2 right-2 flex justify-start items-start z-10">
            {/* Watch Status Badge */}
            {showStatus &&
              watchStatus &&
              STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG] && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-semibold shadow-lg backdrop-blur-sm border-0 text-white",
                    STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG]
                      .color,
                  )}
                >
                  <span className="mr-1">
                    {
                      STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG]
                        .icon
                    }
                  </span>
                  {
                    STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG]
                      .label
                  }
                </Badge>
              )}

            {optimisticWatched && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-success/90 text-success-foreground flex items-center gap-1">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Rating Badge */}
          {rating > 0 && (
            <span
              className={cn(
                "absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.25)] backdrop-blur-xl",
              )}
            >
              <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
              {rating.toFixed(1)}
            </span>
          )}

          {/* Quick preview removed; click card to open details */}
        </div>

        {/* Info */}
        <div className="flex min-h-[4.75rem] flex-col p-3">
          <h3 className="min-h-[2.75rem] line-clamp-2 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-lg">
            <bdi dir="auto">{title}</bdi>
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground">{metaLine}</p>
          </div>
        </div>
      </Link>

      {/* Media preview removed */}
      
      {/* TV Watch Status Modal - only for TV shows when user is authenticated */}
      {mediaType === 'tv' && user && (
        <TVWatchStatusModal
          open={watchStatusModalOpen}
          onOpenChange={setWatchStatusModalOpen}
          showId={media.id}
          showName={title}
          onWatchAll={handleWatchAllSeries}
          onSelectEpisodes={handleSelectEpisodes}
          language={i18n.language}
        />
      )}
    </>
  );
});

export const MediaCardSkeleton = React.forwardRef<
  HTMLDivElement,
  { delay?: number; className?: string }
>(({ delay = 0, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'glass-card overflow-hidden rounded-xl',
        'border border-border/50',
        className
      )}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      {/* Poster placeholder with aspect ratio */}
      <div className="poster-skeleton" style={{ animationDelay: `${delay}ms` }} />

      {/* Content area */}
      <div className="p-3 space-y-2">
        {/* Title placeholder */}
        <div
          className="h-4 skeleton-shimmer rounded"
          style={{ animationDelay: `${delay + 100}ms` }}
        />

        {/* Metadata placeholder */}
        <div
          className="h-3 skeleton-shimmer rounded w-1/2"
          style={{ animationDelay: `${delay + 200}ms` }}
        />

        {/* Tags/badges placeholder */}
        <div className="flex gap-2 mt-2">
          <div
            className="h-6 w-12 skeleton-shimmer rounded-full"
            style={{ animationDelay: `${delay + 300}ms` }}
          />
          <div
            className="h-6 w-16 skeleton-shimmer rounded-full"
            style={{ animationDelay: `${delay + 350}ms` }}
          />
        </div>
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading media content...</span>
    </div>
  );
});
MediaCardSkeleton.displayName = "MediaCardSkeleton";


