import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Star,
  Check,
  Loader2,
  Bookmark,
  Share2,
} from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
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
import { Image } from "@/components/ui/Image";
import { cn } from "../lib/utils";
import { buildMediaPath, getMediaAltText } from "@/lib/seo";

export interface MediaCardProps {
  media: Media & { watchStatus?: string };
  mediaType?: "movie" | "tv";
  showType?: boolean;
  showStatus?: boolean;
  interactionMode?: "full" | "rail";
  onAction?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (mediaId: number, mediaType: "movie" | "tv") => void;
}

const STATUS_CONFIG: Record<string, { icon: string; labelKey: string; defaultLabel: string; color: string }> = {
  watching: { icon: "", labelKey: "status.watching", defaultLabel: "Watching", color: "bg-primary" },
  completed: { icon: "", labelKey: "status.completed", defaultLabel: "Completed", color: "bg-green-500" },
  dropped: { icon: "", labelKey: "status.dropped", defaultLabel: "Dropped", color: "bg-red-500" },
  plan_to_watch: { icon: "", labelKey: "status.planToWatch", defaultLabel: "Plan to Watch", color: "bg-yellow-500" },
};

// Lightweight genre lookup — covers the 19 TMDB genres used across movies & TV
const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};


const PosterImage = React.memo(function PosterImage({
  posterPath,
  alt,
}: {
  posterPath: string | null;
  alt: string;
}) {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "300px" });

  if (!posterPath) {
    return (
      <div
        ref={ref}
        className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted flex items-center justify-center"
      >
        <div className="text-center px-3">
          <Image
            src="/placeholder.svg"
            alt={t("mediaCard.posterNotFound", "Poster Not Found")}
            width={48}
            height={64}
            className="mx-auto h-16 w-12 object-contain opacity-80"
            loading="lazy"
          />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {t("mediaCard.posterNotFound", "Poster Not Found")}
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
      ref={ref}
      className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted"
    >
      {inView ? (
        tiny || small || medium ? (
            <Image
              src={small || medium || ""}
              srcSet={`${tiny ? `${tiny} 92w, ` : ""}${small ? `${small} 185w, ` : ""}${medium ? `${medium} 342w` : ""}`}
              sizes="(max-width: 639px) calc(50vw - 16px), (max-width: 1023px) calc(33vw - 24px), (max-width: 1279px) calc(25vw - 24px), 220px"
              alt={alt}
              width={185}
              height={278}
              className="w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-105"
              loading="lazy"
              fetchPriority="low"
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
PosterImage.displayName = "PosterImage";

export const MediaCard = React.memo(function MediaCard({
  media,
  mediaType: mediaTypeProp,
  showType = true,
  showStatus = false,
  interactionMode = "full",
  selectable = false,
  selected = false,
  onToggleSelect,
}: MediaCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const {
    isInWatchlist,
    isWatched,
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
  } = useUserLists();
  const { markEpisodeWatched } = useWatchedEpisodes();
  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState(false);
  const [optimisticWatched, setOptimisticWatched] = useState(false);
  const [isWatchlistPending, setIsWatchlistPending] = useState(false);
  const [isWatchedPending, setIsWatchedPending] = useState(false);
  const [watchStatusModalOpen, setWatchStatusModalOpen] = useState(false);
  
  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 30 });

  function handleMouseMove(event: React.MouseEvent<HTMLAnchorElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const title = useMemo(() => getMediaTitle(media), [media]);
  const year = useMemo(() => getMediaYear(media), [media]);
  const mediaType = useMemo(
    () => mediaTypeProp ?? getMediaType(media),
    [mediaTypeProp, media],
  );
  const posterAlt = getMediaAltText(title, mediaType, "poster");
  const inWatchlist = isInWatchlist(media.id, mediaType);
  const watched = isWatched(media.id, mediaType);
  const watchStatus = media.watchStatus;
  const rating = media.vote_average;
  const showInlineActions = true;
  const mediaLabel = useMemo(
    () => (mediaType === "movie" ? t("common.movie") : t("common.tvShow")),
    [mediaType, t],
  );
  const metaLine = useMemo(() => {
    const parts = [year];

    if (showType) {
      parts.push(mediaLabel);
    }

    return parts.join(" • ");
  }, [year, showType, mediaLabel]);

  useEffect(() => {
    setOptimisticInWatchlist(inWatchlist);
  }, [inWatchlist]);

  useEffect(() => {
    setOptimisticWatched(watched);
  }, [watched]);

  type PreventableEvent = {
    preventDefault: () => void;
    stopPropagation: () => void;
  };

  const handleWatchlistClick = async (e: PreventableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !optimisticInWatchlist;
    setOptimisticInWatchlist(nextState);
    setIsWatchlistPending(true);
    try {
      if (nextState) {
        await addToWatchlist(media.id, mediaType);
        try {
          if (typeof navigator !== "undefined" && "vibrate" in navigator)
            (navigator as Navigator).vibrate?.(10);
        } catch {
          // Ignore vibration API failures for unsupported devices/browsers.
        }
      } else {
        await removeFromWatchlist(media.id, mediaType);
      }
    } catch {
      setOptimisticInWatchlist(!nextState);
    } finally {
      setIsWatchlistPending(false);
    }
  };

  const handleWatchedClick = async (e: PreventableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (optimisticWatched) {
      setOptimisticWatched(false);
      setIsWatchedPending(true);
      try {
        await removeFromWatched(media.id, mediaType);
      } catch {
        setOptimisticWatched(true);
      } finally {
        setIsWatchedPending(false);
      }
    } else {
      // For TV shows, open modal to choose watch type
      if (mediaType === "tv" && user) {
        setWatchStatusModalOpen(true);
      } else {
        // Guests can still track watched titles locally.
        setOptimisticWatched(true);
        setIsWatchedPending(true);
        try {
          await addToWatched(media.id, mediaType);
        } catch {
          setOptimisticWatched(false);
        } finally {
          setIsWatchedPending(false);
        }
      }
    }
  };

  const handleWatchAllSeries = () => {
    addToWatched(media.id, mediaType);
  };

  const handleSelectEpisodes = (
    episodes: Array<{ season: number; episode: number }>,
  ): void => {
    // Mark selected episodes as watched
    for (const ep of episodes) {
      markEpisodeWatched({
        showId: media.id,
        seasonNumber: ep.season,
        episodeNumber: ep.episode,
        episodeName: undefined,
        airDate: undefined,
        showName: title,
        posterPath: media.poster_path,
      });
    }
  };

  const handleToggleSelect = (e: PreventableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.(media.id, mediaType);
  };

  // Quick view removed - card links to details page via the surrounding <Link>

  return (
    <>
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        <Link
          to={buildMediaPath(mediaType, media.id, title)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 shadow-card transition-all duration-300 glass-card-hover md:hover:border-primary/20 active:scale-[0.98] active:border-primary/30 focus-ring focus-visible:border-primary/35"
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
                  type="button"
                  variant={selected ? "default" : "secondary"}
                  size="sm"
                  className="min-h-[44px] min-w-[44px] rounded-full px-3 text-xs shadow-lg"
                  onClick={(event) => void handleToggleSelect(event)}
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
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-10 w-full justify-center gap-2 backdrop-blur-md",
                    optimisticInWatchlist
                      ? "border-red-500/70 bg-red-600 text-white hover:bg-red-700"
                      : "border-white/20 bg-background/80 text-foreground",
                  )}
                  onClick={(event) => void handleWatchlistClick(event)}
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
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-10 w-full justify-center gap-2 backdrop-blur-md",
                    optimisticWatched
                      ? "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-white/20 bg-background/70 text-foreground",
                  )}
                  onClick={(event) => void handleWatchedClick(event)}
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
              <div className="absolute left-2 top-12 z-20 flex flex-col gap-2 md:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className={cn(
                        "h-11 w-11 rounded-full border-white/15 bg-black/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl",
                        optimisticInWatchlist &&
                          "border-red-500/70 bg-red-600 text-white hover:bg-red-700",
                      )}
                      onClick={(event) => void handleWatchlistClick(event)}
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
                      type="button"
                      size="icon"
                      variant="outline"
                      className={cn(
                        "h-11 w-11 rounded-full border-white/15 bg-black/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl",
                        optimisticWatched &&
                          "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700",
                      )}
                      onClick={(event) => void handleWatchedClick(event)}
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
                      t(STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG]
                        .labelKey, STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG].defaultLabel)
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
            <div className="mt-auto pt-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{metaLine}</p>
              </div>
              {/* Genre chips — up to 2, shown when genre_ids are available */}
              {Array.isArray(media.genre_ids) && media.genre_ids.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {media.genre_ids.slice(0, 2).map((gid) => {
                    const name = GENRE_MAP[gid];
                    if (!name) return null;
                    return (
                      <span
                        key={gid}
                        className="inline-block rounded-full bg-white/5 border border-white/8 px-2 py-0.5 text-[10px] font-medium text-muted-foreground leading-none"
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Media preview removed */}

      {/* TV Watch Status Modal - only for TV shows when user is authenticated */}
      {mediaType === "tv" && user && (
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
}, (prevProps, nextProps) => {
  return (
    prevProps.media.id === nextProps.media.id &&
    (prevProps.mediaType ?? prevProps.media.media_type) ===
      (nextProps.mediaType ?? nextProps.media.media_type) &&
    prevProps.media.poster_path === nextProps.media.poster_path &&
    prevProps.media.vote_average === nextProps.media.vote_average &&
    prevProps.media.watchStatus === nextProps.media.watchStatus &&
    prevProps.showType === nextProps.showType &&
    prevProps.showStatus === nextProps.showStatus &&
    prevProps.interactionMode === nextProps.interactionMode &&
    prevProps.selectable === nextProps.selectable &&
    prevProps.selected === nextProps.selected
  );
});
MediaCard.displayName = "MediaCard";

export const MediaCardSkeleton = React.forwardRef<
  HTMLDivElement,
  { delay?: number; className?: string }
>(({ delay = 0, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "glass-card overflow-hidden rounded-xl",
        "border border-border/50",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-t-xl bg-muted/60">
        <div className="poster-skeleton h-full w-full rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        <div className="absolute left-2 right-2 top-2 flex items-start justify-between gap-2">
          <div className="h-5 w-14 rounded-md skeleton-shimmer bg-background/70" />
          <div className="h-5 w-8 rounded-md skeleton-shimmer bg-background/70" />
        </div>

        <div className="absolute bottom-2 left-2 h-6 w-12 rounded-md skeleton-shimmer bg-black/60" />
      </div>

      <div className="flex min-h-[6.25rem] flex-col p-3">
        <div className="space-y-2">
          <div className="h-4 w-[88%] rounded-md skeleton-shimmer" />
          <div className="h-4 w-[64%] rounded-md skeleton-shimmer" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="h-3 w-12 rounded-md skeleton-shimmer" />
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full skeleton-shimmer" />
            <div className="h-6 w-6 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading media content...</span>
    </div>
  );
});
MediaCardSkeleton.displayName = "MediaCardSkeleton";
