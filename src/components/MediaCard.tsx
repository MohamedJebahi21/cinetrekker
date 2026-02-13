import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Star from 'lucide-react/dist/esm/icons/star';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import Check from 'lucide-react/dist/esm/icons/check';
import Plus from 'lucide-react/dist/esm/icons/plus';
import BookmarkCheck from 'lucide-react/dist/esm/icons/bookmark-check';
import { Media } from '@/types/media';
import { getImageUrl, getMediaTitle, getMediaYear, getMediaType } from '@/services/tmdb';
import { useInView } from '@/hooks/useInView';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';
import { getWatchlistIds, addToLocalWatchlist, removeFromLocalWatchlist, toggleLocalWatchlist, isInLocalWatchlist } from '@/lib/watchlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TVWatchStatusModal } from '@/components/TVWatchStatusModal';
import { useWatchedEpisodes } from '@/hooks/useFollowedShows';
// Media preview modal removed — navigate to details page instead
import { cn } from '@/lib/utils';

interface MediaCardProps {
  media: Media & { watchStatus?: string };
  showType?: boolean;
  showStatus?: boolean;
  onAction?: () => void;
}

const STATUS_CONFIG = {
  watching: { icon: '📺', label: 'Watching', color: 'bg-blue-500' },
  completed: { icon: '✅', label: 'Completed', color: 'bg-green-500' },
  dropped: { icon: '❌', label: 'Dropped', color: 'bg-red-500' },
  plan_to_watch: { icon: '📋', label: 'Plan to Watch', color: 'bg-yellow-500' },
};

function PosterImage({ posterPath, alt }: { posterPath: string | null; alt: string }) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '300px' });

  // build responsive URLs: use w342 for mobile and w500 for desktop
  const small = posterPath ? getImageUrl(posterPath, 'w342') : null;
  const medium = posterPath ? getImageUrl(posterPath, 'w500') : null;

  return (
    <div ref={ref} className="w-full h-full">
      {inView ? (
        medium ? (
          <img
            src={medium}
            srcSet={`${small ? `${small} 342w, ` : ''}${medium} 500w`}
            sizes="(max-width: 640px) 342px, 500px"
            width={500}
            height={750}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 bg-[#1a1a1a]"
            loading="lazy"
            decoding="async"
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

export const MediaCard = React.memo(function MediaCard({ media, showType = true, showStatus = false }: MediaCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isInWatchlist, isWatched, addToWatchlist, removeFromWatchlist, addToWatched, removeFromWatched } = useUserLists();
  const { markEpisodeWatched } = useWatchedEpisodes();
  const [localInWatchlist, setLocalInWatchlist] = useState<boolean>(() => isInLocalWatchlist(media.id));
  const [watchStatusModalOpen, setWatchStatusModalOpen] = useState(false);
  
  const title = useMemo(() => getMediaTitle(media), [media]);
  const year = useMemo(() => getMediaYear(media), [media]);
  const mediaType = useMemo(() => getMediaType(media), [media]);
  const posterUrl = useMemo(() => getImageUrl(media.poster_path, 'w342'), [media.poster_path]);
  const inWatchlist = user ? isInWatchlist(media.id, mediaType) : localInWatchlist;
  const watched = isWatched(media.id, mediaType);
  const watchStatus = media.watchStatus;
  const rating = media.vote_average;
  const ratingClass = rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low';

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      if (inWatchlist) {
        removeFromWatchlist(media.id, mediaType);
      } else {
        addToWatchlist(media.id, mediaType);
        // tiny haptic feedback on supported mobile devices
        try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate?.(10); } catch (e) {}
      }
    } else {
      const newState = toggleLocalWatchlist(media.id);
      setLocalInWatchlist(newState);
      if (newState) {
        try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate?.(10); } catch (e) {}
      }
    }
  };

  const handleWatchedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (watched) {
      removeFromWatched(media.id, mediaType);
    } else {
      // For TV shows, open modal to choose watch type
      if (mediaType === 'tv' && user) {
        setWatchStatusModalOpen(true);
      } else {
        // For movies or guests, just mark as watched
        addToWatched(media.id, mediaType);
      }
    }
  };

  const handleWatchAllSeries = () => {
    addToWatched(media.id, mediaType);
  };

  const handleSelectEpisodes = (episodes: Array<{ season: number; episode: number }>) => {
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
  }

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
            
            {watched && (
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
                      "w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out",
                      inWatchlist
                        ? "bg-primary text-primary-foreground hover:scale-110"
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-[#E50914] hover:text-white hover:scale-110"
                    )}
                    aria-label={inWatchlist ? t('actions.removeFromWatchlist') : 'Add to Watchlist'}
                  >
                    {inWatchlist ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground">
                  {inWatchlist ? t('actions.removeFromWatchlist') : 'Add to Watchlist'}
                </TooltipContent>
              </Tooltip>

              {/* Watched Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleWatchedClick}
                    className={cn(
                      "w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out",
                      watched
                        ? "bg-success text-success-foreground hover:scale-110"
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-success hover:text-success-foreground hover:scale-110"
                    )}
                    aria-label={watched ? t('actions.removeFromWatched') : t('actions.markAsWatched')}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground">
                  {watched ? t('actions.removeFromWatched') : t('actions.markAsWatched')}
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

export const MediaCardSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div ref={ref} className="glass-card overflow-hidden rounded-xl" {...props}>
        <div className="poster-skeleton" />
        <div className="p-3 space-y-2">
          <div className="h-4 skeleton-shimmer rounded" />
          <div className="h-3 skeleton-shimmer rounded w-1/2" />
        </div>
      </div>
    );
  }
);
MediaCardSkeleton.displayName = "MediaCardSkeleton";