import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Star,
  Check,
  Loader2,
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
import { buildMediaPath, getMediaAltText } from "@/lib/seo";

export interface MediaCardProps {
  media: Media & { watchStatus?: string };
  mediaType?: "movie" | "tv";
  showType?: boolean;
  showStatus?: boolean;
  onAction?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (mediaId: number, mediaType: "movie" | "tv") => void;
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
          <Image
            src="/placeholder.svg"
            alt="Poster Not Found"
            width={48}
            height={64}
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
}

export const MediaCard = React.memo(function MediaCard({
  media,
  mediaType: mediaTypeProp,
  showType = true,
  showStatus = false,
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
  const [localInWatchlist, setLocalInWatchlist] = useState<boolean>(() =>
    false,
  );
  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState(false);
  const [optimisticWatched, setOptimisticWatched] = useState(false);
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
  const inWatchlist = user
    ? isInWatchlist(media.id, mediaType)
    : localInWatchlist;
  const watched = isWatched(media.id, mediaType);
  const watchStatus = media.watchStatus;
  const rating = media.vote_average;

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
    } else {
      window.dispatchEvent(new CustomEvent("cinetrekker:auth-required"));
    }
  };

  const handleWatchedClick = async (e: PreventableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new CustomEvent("cinetrekker:auth-required"));
      return;
    }

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
        // For movies or guests, just mark as watched
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
      <Link
        to={buildMediaPath(mediaType, media.id, title)}
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 shadow-card transition-all duration-300 glass-card-hover hover:border-primary/20 hover:scale-[1.03] hover:-translate-y-1 active:scale-[1.01] active:border-primary/30 focus-ring focus-visible:border-primary/35"
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
                aria-label={selected ? "Deselect title" : "Select title"}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : "Select"}
              </Button>
            </div>
          ) : null}
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
              ) : null}
              Watchlist
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
              ) : null}
              Watched
            </Button>
          </div>

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

          {/* Quick preview removed; click card to open details */}
        </div>

        {/* Info */}
        <div className="flex min-h-[6.25rem] flex-col p-3">
          <h3 className="title-display min-h-[3.5rem] line-clamp-2 text-base font-semibold transition-colors group-hover:text-primary md:text-lg">
            {title}
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            {year ? (
              <p className="text-xs text-muted-foreground">{year}</p>
            ) : (
              <span />
            )}
          </div>
          {!user ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sign in to save, track, and review this title.
            </p>
          ) : null}
        </div>

        <div className="border-t border-border/50 p-3 md:hidden">
          <div className="flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "min-h-[48px] w-full justify-center backdrop-blur-md active:scale-95 transition-transform",
                      optimisticInWatchlist
                        ? "border-red-500/70 bg-red-600 text-white hover:bg-red-700"
                        : "border-white/20 bg-gradient-to-b from-background/90 to-background/65 text-foreground",
                    )}
                    onClick={(event) => void handleWatchlistClick(event)}
                    aria-label={`Add ${title} to watchlist`}
                  >
                    {isWatchlistPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Watchlist
                  </Button>
                </div>
              </TooltipTrigger>
              {!user && (
                <TooltipContent>
                  Create a free account to save your watchlist.
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "min-h-[48px] w-full justify-center backdrop-blur-md active:scale-95 transition-transform",
                    optimisticWatched
                      ? "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-white/20 bg-gradient-to-b from-background/90 to-background/65 text-foreground",
                  )}
                  onClick={(event) => void handleWatchedClick(event)}
                  aria-label={`Mark ${title} as watched`}
                >
                  {isWatchedPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Watched
                </Button>
              </TooltipTrigger>
              {!user ? (
                <TooltipContent>
                  Sign in to save watched history and reviews.
                </TooltipContent>
              ) : null}
            </Tooltip>
          </div>
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

