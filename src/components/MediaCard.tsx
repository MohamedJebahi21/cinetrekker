import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Bookmark, Check, Plus, Eye } from 'lucide-react';
import { Media } from '@/types/media';
import { getImageUrl, getMediaTitle, getMediaYear, getMediaType } from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  media: Media;
  showType?: boolean;
  onAction?: () => void;
}

export function MediaCard({ media, showType = true }: MediaCardProps) {
  const { t } = useTranslation();
  const { isInWatchlist, isWatched, addToWatchlist, removeFromWatchlist, addToWatched, removeFromWatched } = useUserLists();
  
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

  return (
    <Link
      to={`/${mediaType}/${media.id}`}
      className="group relative glass-card-hover overflow-hidden block"
    >
      {/* Poster */}
      <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full skeleton-shimmer flex items-center justify-center">
            <span className="text-muted-foreground text-xs">{t('common.noResults')}</span>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          {showType && (
            <span className="px-2 py-1 text-[10px] font-medium rounded bg-background/80 backdrop-blur-sm">
              {mediaType === 'movie' ? t('common.movie') : t('common.tvShow')}
            </span>
          )}
          
          {watched && (
            <span className="px-2 py-1 text-[10px] font-medium rounded bg-green-500/90 text-white flex items-center gap-1">
              <Check className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Rating Badge */}
        {rating > 0 && (
          <div className={cn("absolute bottom-2 left-2 rating-badge", ratingClass)}>
            <Star className="w-3 h-3 mr-1 fill-current" />
            {rating.toFixed(1)}
          </div>
        )}

        {/* Hover Overlay with Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={inWatchlist ? "secondary" : "default"}
                size="icon"
                className="h-9 w-9"
                onClick={handleWatchlistClick}
              >
                {inWatchlist ? (
                  <Bookmark className="w-4 h-4 fill-current" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover text-popover-foreground">
              {inWatchlist ? t('actions.removeFromWatchlist') : t('actions.addToWatchlist')}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={watched ? "secondary" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={handleWatchedClick}
              >
                {watched ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover text-popover-foreground">
              {watched ? t('actions.removeFromWatched') : t('actions.markAsWatched')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {year && (
          <p className="text-xs text-muted-foreground mt-1">{year}</p>
        )}
      </div>
    </Link>
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
