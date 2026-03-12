import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star, ChevronRight, Check, BookmarkCheck } from "lucide-react";
import Plus from "lucide-react/dist/esm/icons/plus";
import { Media, type UserMediaItem } from "@/types/media";
import {
  getImageUrl,
  getMediaTitle,
  getMediaYear,
  getMediaType,
} from "@/services/tmdb";
import { useInView } from "@/hooks/useInView";
import { useUserLists } from "@/contexts/user-lists-context";
import { useAuth } from "@/contexts/auth-context";
import {
  getWatchlistIds,
  addToLocalWatchlist,
  removeFromLocalWatchlist,
  toggleLocalWatchlist,
  isInLocalWatchlist,
} from "@/lib/watchlist";
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
import { getFilmedInBadge } from "@/lib/filmingLocations";

export interface MediaCardProps {
  media: Media & { watchStatus?: string };
  mediaType?: "movie" | "tv";
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
  watching: { icon: "", label: "Watching", color: "bg-blue-500" },
  completed: { icon: "", label: "Completed", color: "bg-green-500" },
  dropped: { icon: "", label: "Dropped", color: "bg-red-500" },
  plan_to_watch: { icon: "", label: "Plan to Watch", color: "bg-yellow-500" },
};

function PosterImage({
  posterPath,
  alt,
}: {
  posterPath: string | null;
  alt: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "300px" });

  if (!posterPath) {
    return (
      <div
        ref={ref}
        className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted flex items-center justify-center"
      >
        <div className="text-center px-3">
          <img
            src="/placeholder.svg"
            alt="Poster Not Found"
            className="mx-auto h-16 w-12 object-contain opacity-80"
            loading="lazy"
          />
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
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
      ref={ref}
      className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted"
    >
      {inView ? (
        tiny || small || medium ? (
          <img
            src={small || medium || ""}
            srcSet={`${tiny ? `${tiny} 92w, ` : ""}${small ? `${small} 185w, ` : ""}${medium ? `${medium} 342w` : ""}`}
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
}

export const MediaCard = React.memo(function MediaCard({
  media,
  mediaType: mediaTypeProp,
  showType = true,
  showStatus = false,
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
  const [localInWatchlist, setLocalInWatchlist] = useState<boolean>(() =>
    isInLocalWatchlist(media.id),
  );
  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState(false);
  const [optimisticWatched, setOptimisticWatched] = useState(false);
  const [watchStatusModalOpen, setWatchStatusModalOpen] = useState(false);

  const title = useMemo(() => getMediaTitle(media), [media]);
  const year = useMemo(() => getMediaYear(media), [media]);
  const mediaType = useMemo(
    () => mediaTypeProp ?? getMediaType(media),
    [mediaTypeProp, media],
  );
  const posterUrl = useMemo(
    () => getImageUrl(media.poster_path, "w342"),
    [media.poster_path],
  );
  const posterAlt = `${title} Poster`;
  const inWatchlist = user
    ? isInWatchlist(media.id, mediaType)
    : localInWatchlist;
  const watched = isWatched(media.id, mediaType);
  const watchStatus = media.watchStatus;
  const rating = media.vote_average;
  const filmedInBadge = getFilmedInBadge(media);
  const ratingClass =
    rating >= 7 ? "rating-high" : rating >= 5 ? "rating-medium" : "rating-low";

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
    if (user) {
      const nextState = !optimisticInWatchlist;
      setOptimisticInWatchlist(nextState);
      try {
        if (nextState) {
          await addToWatchlist(media.id, mediaType);
          try {
            if (typeof navigator !== "undefined" && "vibrate" in navigator)
              (navigator as Navigator).vibrate?.(10);
          } catch (e) {
            /* TODO: add optional debug logging for vibration API failures */
          }
        } else {
          await removeFromWatchlist(media.id, mediaType);
        }
      } catch {
        setOptimisticInWatchlist(!nextState);
      }
    } else {
      const newState = toggleLocalWatchlist(media.id);
      setLocalInWatchlist(newState);
      setOptimisticInWatchlist(newState);
      if (newState) {
        try {
          if (typeof navigator !== "undefined" && "vibrate" in navigator)
            (navigator as Navigator).vibrate?.(10);
        } catch (e) {
          /* TODO: add optional debug logging for vibration API failures */
        }
      }
    }
  };

  const handleWatchedClick = async (e: PreventableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (optimisticWatched) {
      setOptimisticWatched(false);
      try {
        await removeFromWatched(media.id, mediaType);
      } catch {
        setOptimisticWatched(true);
      }
    } else {
      // For TV shows, open modal to choose watch type
      if (mediaType === "tv" && user) {
        setWatchStatusModalOpen(true);
      } else {
        // For movies or guests, just mark as watched
        setOptimisticWatched(true);
        try {
          await addToWatched(media.id, mediaType);
        } catch {
          setOptimisticWatched(false);
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
      });
    }
  };

  // Quick view removed - card links to details page via the surrounding <Link>

  return (
    <>
      <Link
        to={`/${mediaType}/${media.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 shadow-card transition-all duration-300 glass-card-hover hover:border-primary/20 hover:scale-[1.03] hover:-translate-y-1 focus-ring"
        aria-label={`${title} - open details`}
        tabIndex={0}
      >
        {/* Poster with gradient overlay for text readability */}
        <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl bg-surface-dark-3">
          <PosterImage posterPath={media.poster_path} alt={title} />

          {/* Enhanced gradient overlay - darker on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark-2 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status Badges - positioned above gradient */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
            {showType && (
              <span className="px-2 py-1 text-[10px] font-medium rounded bg-background/80 backdrop-blur-sm">
                {mediaType === "movie" ? t("common.movie") : t("common.tvShow")}
              </span>
            )}
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
              <span className="px-2 py-1 text-[10px] font-medium rounded bg-success/90 text-success-foreground flex items-center gap-1">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Rating Badge */}
          {rating > 0 && (
            <span
              className={cn(
                "absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold shadow bg-black/80 tracking-[0.01em]",
                rating >= 7
                  ? "text-green-400"
                  : rating >= 5
                    ? "text-yellow-300"
                    : "text-red-400",
              )}
            >
              <Star className="w-3 h-3 mr-1 fill-current inline-block" />
              {rating.toFixed(1)}
            </span>
          )}

          {/* Quick Action Buttons - 32x32px circles with blur background */}
          {user && (
            <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 z-10 flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              {/* Watchlist Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleWatchlistClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void handleWatchlistClick(e);
                      }
                    }}
                    className={cn(
                      "w-8 h-8 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out cursor-pointer",
                      optimisticInWatchlist
                        ? "bg-primary text-primary-foreground hover:scale-110"
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-[#E50914] hover:text-white hover:scale-110",
                    )}
                    aria-label={
                      optimisticInWatchlist
                        ? t("actions.removeFromWatchlist")
                        : t("actions.addToWatchlist")
                    }
                  >
                    {optimisticInWatchlist ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-popover text-popover-foreground"
                >
                  {optimisticInWatchlist
                    ? t("actions.removeFromWatchlist")
                    : t("actions.addToWatchlist")}
                </TooltipContent>
              </Tooltip>

              {/* Watched Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleWatchedClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void handleWatchedClick(e);
                      }
                    }}
                    className={cn(
                      "w-8 h-8 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out cursor-pointer",
                      optimisticWatched
                        ? "bg-success text-success-foreground hover:scale-110"
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-success hover:text-success-foreground hover:scale-110",
                    )}
                    aria-label={
                      optimisticWatched
                        ? t("actions.removeFromWatched")
                        : t("actions.markAsWatched")
                    }
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-popover text-popover-foreground"
                >
                  {optimisticWatched
                    ? t("actions.removeFromWatched")
                    : t("actions.markAsWatched")}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Quick preview removed; click card to open details */}
        </div>

        {/* Info */}
        <div className="flex min-h-[6.25rem] flex-col p-3">
          <h3 className="title-display min-h-[3.5rem] line-clamp-2 text-base font-semibold transition-colors group-hover:text-primary md:text-lg">
            {title}
          </h3>
          <span className="mt-1 inline-flex w-fit rounded-full border border-[#f2c572]/40 bg-[#160f05]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4cb80]">
            {filmedInBadge}
          </span>
          {year && (
            <p className="mt-auto pt-1 text-xs text-muted-foreground">{year}</p>
          )}
        </div>
      </Link>

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
});

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
      {/* Poster placeholder with aspect ratio */}
      <div className="poster-skeleton" />

      {/* Content area */}
      <div className="p-3 space-y-2">
        {/* Title placeholder */}
        <div className="h-4 skeleton-shimmer rounded" />

        {/* Metadata placeholder */}
        <div className="h-3 skeleton-shimmer rounded w-1/2" />

        {/* Tags/badges placeholder */}
        <div className="flex gap-2 mt-2">
          <div className="h-6 w-12 skeleton-shimmer rounded-full" />
          <div className="h-6 w-16 skeleton-shimmer rounded-full" />
        </div>
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading media content...</span>
    </div>
  );
});
MediaCardSkeleton.displayName = "MediaCardSkeleton";
