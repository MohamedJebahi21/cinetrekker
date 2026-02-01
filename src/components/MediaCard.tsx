import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Bookmark, Check, Plus, Expand, BookmarkCheck } from 'lucide-react';
import { Media } from '@/types/media';
import { getImageUrl, getMediaTitle, getMediaYear, getMediaType } from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MediaPreviewModal } from '@/components/MediaPreviewModal';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  media: Media;
  showType?: boolean;
  onAction?: () => void;
}

export function MediaCard({ media, showType = true }: MediaCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isInWatchlist, isWatched, addToWatchlist, removeFromWatchlist, addToWatched, removeFromWatched } = useUserLists();
  const [showPreview, setShowPreview] = useState(false);
  
  const title = getMediaTitle(media);
  const year = getMediaYear(media);
  const mediaType = getMediaType(media);
  const posterUrl = getImageUrl(media.poster_path, 'w342');
  const inWatchlist = isInWatchlist(media.id, mediaType);
  const watched = isWatched(media.id, mediaType);
  
  const rating = media.vote_average;
  const ratingClass = rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low';

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWatchlist) {
      removeFromWatchlist(media.id, mediaType);
    } else {
      addToWatchlist(media.id, mediaType);
    }
  };

  const handleWatchedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (watched) {
      removeFromWatched(media.id, mediaType);
    } else {
      addToWatched(media.id, mediaType);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPreview(true);
  };

  return (
    <>
      <Link
        to={`/${mediaType}/${media.id}`}
        className="group relative glass-card-hover overflow-hidden block"
        aria-label={`${title} — open details`}
      >
        {/* Poster with gradient overlay for text readability */}
        <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl poster-overlay">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full skeleton-shimmer flex items-center justify-center">
              <span className="text-muted-foreground text-xs">{t('common.noResults')}</span>
            </div>
          )}

          {/* Status Badges - positioned above gradient */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
            {showType && (
              <span className="px-2 py-1 text-[10px] font-medium rounded bg-background/80 backdrop-blur-sm">
                {mediaType === 'movie' ? t('common.movie') : t('common.tvShow')}
              </span>
            )}
            
            {watched && (
              <span className="px-2 py-1 text-[10px] font-medium rounded bg-success/90 text-success-foreground flex items-center gap-1">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Rating Badge */}
          {rating > 0 && (
            <div className={cn("absolute bottom-2 left-2 rating-badge z-10", ratingClass)}>
              <Star className="w-3 h-3 mr-1 fill-current" />
              {rating.toFixed(1)}
            </div>
          )}

          {/* Quick Action Buttons - 32x32px circles with blur background */}
          {user && (
            <div className="absolute bottom-2 right-2 z-10 flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              {/* Watchlist Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleWatchlistClick}
                    className={cn(
                      "w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center transition-all duration-200 action-bounce",
                      inWatchlist 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-background/90"
                    )}
                    aria-label={inWatchlist ? t('actions.removeFromWatchlist') : t('actions.addToWatchlist')}
                  >
                    {inWatchlist ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground">
                  {inWatchlist ? t('actions.removeFromWatchlist') : t('actions.addToWatchlist')}
                </TooltipContent>
              </Tooltip>

              {/* Watched Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleWatchedClick}
                    className={cn(
                      "w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center transition-all duration-200 action-bounce",
                      watched 
                        ? "bg-success text-success-foreground" 
                        : "bg-background/80 backdrop-blur-md text-foreground hover:bg-background/90"
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

          {/* Hover Actions - Quick View (Desktop only) */}
          <div className="hidden md:flex card-actions z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 bg-background/90 backdrop-blur-sm hover:bg-background"
                  onClick={handleQuickView}
                >
                  <Expand className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover text-popover-foreground">
                {t('actions.quickView')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Info - Using Playfair Display for title */}
        <div className="p-3">
          <h3 className="title-display font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          {year && (
            <p className="text-xs text-muted-foreground mt-1">{year}</p>
          )}
        </div>
      </Link>

      {/* Quick View Modal */}
      <MediaPreviewModal
        media={media}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </>
  );
}

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