import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, ChevronRight } from 'lucide-react';
import { Media, type UserMediaItem } from '@/types/media';
import { getImageUrl, getMediaTitle, getMediaYear, getMediaType } from '@/services/tmdb';
import { useInView } from '@/hooks/useInView';
import { useUserLists } from '@/contexts/user-lists-context';
import { useAuth } from '@/contexts/auth-context';
import { getWatchlistIds, addToLocalWatchlist, removeFromLocalWatchlist, toggleLocalWatchlist, isInLocalWatchlist } from '@/lib/watchlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TVWatchStatusModal } from '@/components/TVWatchStatusModal';
import { useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { useEffect } from 'react';
import { Image } from '@/components/ui/Image';

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
  watching: { icon: '📺', label: 'Watching', color: 'bg-blue-500' },
  completed: { icon: '✅', label: 'Completed', color: 'bg-green-500' },
  dropped: { icon: '❌', label: 'Dropped', color: 'bg-red-500' },
  plan_to_watch: { icon: '📋', label: 'Plan to Watch', color: 'bg-yellow-500' },
};

function PosterImage({ posterPath, alt }: { posterPath: string | null; alt: string }) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '300px' });

  const small = posterPath ? getImageUrl(posterPath, 'w342') : null;
  const medium = posterPath ? getImageUrl(posterPath, 'w780') : null;

  return (
    <div ref={ref} className="w-full h-full aspect-[2/3] relative overflow-hidden bg-muted">
      {inView ? (
        medium ? (
          <img
            src={medium}
            srcSet={`${small ? `${small} 342w, ` : ''}${medium} 780w`}
            sizes="(max-width: 640px) 115px, (max-width: 1024px) 180px, 250px"
            alt={alt}
            className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-105"
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

export const MediaCard = React.memo(function MediaCard({ media, mediaType: mediaTypeProp, showType = true, showStatus = false }: MediaCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isInWatchlist, isWatched, addToWatchlist, removeFromWatchlist, addToWatched, removeFromWatched } = useUserLists();
  const { markEpisodeWatched } = useWatchedEpisodes();
  const [localInWatchlist, setLocalInWatchlist] = useState<boolean>(() => isInLocalWatchlist(media.id));
  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState(false);
  const [optimisticWatched, setOptimisticWatched] = useState(false);
  const [watchStatusModalOpen, setWatchStatusModalOpen] = useState(false);
  
  const title = useMemo(() => getMediaTitle(media), [media]);
  const year = useMemo(() => getMediaYear(media), [media]);
  const mediaType = useMemo(() => mediaTypeProp ?? getMediaType(media), [mediaTypeProp, media]);
  const posterUrl = useMemo(() => getImageUrl(media.poster_path, 'w342'), [media.poster_path]);
  const posterAlt = `${title} Poster`;
  const inWatchlist = user ? isInWatchlist(media.id, mediaType) : localInWatchlist;
  const watched = isWatched(media.id, mediaType);
  const watchStatus = media.watchStatus;
  const rating = media.vote_average;
  const ratingClass = rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low';

  useEffect(() => {
    setOptimisticInWatchlist(inWatchlist);
  }, [inWatchlist]);

  useEffect(() => {
    setOptimisticWatched(watched);
  }, [watched]);

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      const nextState = !optimisticInWatchlist;
      setOptimisticInWatchlist(nextState);
      try {
        if (nextState) {
          await addToWatchlist(media.id, mediaType);
          try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as Navigator).vibrate?.(10); } catch (e) { /* TODO: add optional debug logging for vibration API failures */ }
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
        try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as Navigator).vibrate?.(10); } catch (e) { /* TODO: add optional debug logging for vibration API failures */ }
      }
    }
  };

  const handleWatchedClick = async (e: React.MouseEvent) => {
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
      if (mediaType === 'tv' && user) {
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

  // Quick view removed — card links to details page via the surrounding <Link>

  return (
    <>
      <Link
        to={`/${mediaType}/${media.id}`}
        className="group relative glass-card-hover overflow-hidden block focus-ring rounded-xl border border-white/5 shadow-card hover:shadow-card-hover hover:border-primary/20 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300"
        aria-label={`${title} — open details`}
        tabIndex={0}
      >
        {/* Poster with gradient overlay for text readability */}
        <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl bg-surface-dark-3">
          {posterUrl ? (
            <PosterImage posterPath={media.poster_path} alt={title} />
          ) : (
            <div className="w-full h-full skeleton-shimmer flex items-center justify-center">
              <span className="text-muted-foreground text-xs">{t('common.noResults')}</span>
            </div>
          )}

          {/* Enhanced gradient overlay - darker on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark-2 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status Badges - positioned above gradient */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
            {showType && (
              <span className="px-2 py-1 text-[10px] font-medium rounded bg-background/80 backdrop-blur-sm">
                {mediaType === 'movie' ? t('common.movie') : t('common.tvShow')}
              </span>
            )}
            {/* Watch Status Badge */}
            {showStatus && watchStatus && STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG] && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs font-semibold shadow-lg backdrop-blur-sm border-0 text-white",
                  STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG].color
                )}
              >
                <span className="mr-1">
                  {STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG].icon}
                </span>
                {STATUS_CONFIG[watchStatus as keyof typeof STATUS_CONFIG].label}
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
            <span className={cn("absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold shadow bg-black/80", rating >= 7 ? "text-green-400" : rating >= 5 ? "text-yellow-300" : "text-red-400")}
              style={{ letterSpacing: '0.01em' }}
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
                  <button
                    onClick={handleWatchlistClick}
                    className={cn(
                      "w-8 h-8 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out",
                      optimisticInWatchlist
                        ? "bg-primary text-primary-foreground hover:scale-110"
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-[#E50914] hover:text-white hover:scale-110"
                    )}
                    aria-label={optimisticInWatchlist ? t('actions.removeFromWatchlist') : t('actions.addToWatchlist')}
                  >
                    {optimisticInWatchlist ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground">
                  {optimisticInWatchlist ? t('actions.removeFromWatchlist') : t('actions.addToWatchlist')}
                </TooltipContent>
              </Tooltip>

              {/* Watched Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleWatchedClick}
                    className={cn(
                      "w-8 h-8 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out",
                      optimisticWatched
                        ? "bg-success text-success-foreground hover:scale-110"
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-success hover:text-success-foreground hover:scale-110"
                    )}
                    aria-label={optimisticWatched ? t('actions.removeFromWatched') : t('actions.markAsWatched')}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground">
                  {optimisticWatched ? t('actions.removeFromWatched') : t('actions.markAsWatched')}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Quick preview removed; click card to open details */}
        </div>

        {/* Info - Using Playfair Display for title */}
        <div className="p-3">
          <h3 className="title-display font-semibold text-base md:text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          {year && (
            <p className="text-xs text-muted-foreground mt-1">{year}</p>
          )}
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
MediaCardSkeleton.displayName = 'MediaCardSkeleton';