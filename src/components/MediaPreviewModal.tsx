import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Calendar, Bookmark, Check, Plus, X, Play, ExternalLink } from 'lucide-react';
import { Media } from '@/types/media';
import { 
  getMovieDetails, 
  getTVDetails, 
  getImageUrl, 
  getBackdropUrl, 
  getMediaTitle, 
  getMediaType,
  getMovieVideos,
  getTVVideos
} from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MediaPreviewModalProps {
  media: Media | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaPreviewModal({ media, open, onOpenChange }: MediaPreviewModalProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.language;
  
  const { isInWatchlist, isWatched, addToWatchlist, removeFromWatchlist, addToWatched, removeFromWatched } = useUserLists();

  const mediaType = media ? getMediaType(media) : 'movie';
  const mediaId = media?.id || 0;

  const { data: details, isLoading } = useQuery({
    queryKey: ['details', mediaType, mediaId, language],
    queryFn: () => mediaType === 'movie' 
      ? getMovieDetails(mediaId, language)
      : getTVDetails(mediaId, language),
    enabled: !!media && open,
  });

  const { data: videos } = useQuery({
    queryKey: ['videos', mediaType, mediaId, language],
    queryFn: () => mediaType === 'movie'
      ? getMovieVideos(mediaId, language)
      : getTVVideos(mediaId, language),
    enabled: !!media && open,
  });

  if (!media) return null;

  const title = getMediaTitle(media);
  const backdropUrl = getBackdropUrl(details?.backdrop_path || media.backdrop_path);
  const posterUrl = getImageUrl(details?.poster_path || media.poster_path, 'w342');
  const releaseDate = details?.release_date || details?.first_air_date || media.release_date || media.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const runtime = details?.runtime || (details?.episode_run_time?.[0]);
  const rating = details?.vote_average || media.vote_average || 0;
  const ratingClass = rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low';
  const overview = details?.overview || media.overview || t('details.noOverview');

  const inWatchlist = isInWatchlist(mediaId, mediaType);
  const watched = isWatched(mediaId, mediaType);

  // Find the best trailer
  const trailer = videos?.results?.find(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  ) || videos?.results?.find(v => v.site === 'YouTube');

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate(`/${mediaType}/${mediaId}`);
  };

  const handleWatchlistClick = () => {
    if (inWatchlist) {
      removeFromWatchlist(mediaId, mediaType);
    } else {
      addToWatchlist(mediaId, mediaType);
    }
  };

  const handleWatchedClick = () => {
    if (watched) {
      removeFromWatched(mediaId, mediaType);
    } else {
      addToWatched(mediaId, mediaType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-white/10">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        
        {/* Backdrop / Trailer Section */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {trailer ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=0&rel=0`}
              title={trailer.name}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : backdropUrl ? (
            <>
              <img
                src={backdropUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-10 h-10 text-white/50" />
                </div>
                <p className="absolute bottom-4 text-sm text-white/60">{t('modal.trailerNotAvailable') || 'Trailer not available'}</p>
              </div>
            </>
          ) : (
            <div className="w-full h-full skeleton-shimmer" />
          )}
          
          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex gap-4">
            {posterUrl && (
              <img
                src={posterUrl}
                alt={title}
                className="w-24 h-36 object-cover rounded-lg shadow-lg flex-shrink-0 hidden sm:block"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {mediaType === 'movie' ? t('common.movie') : t('common.tvShow')}
                </Badge>
                {year && <span className="text-sm text-muted-foreground">{year}</span>}
              </div>
              
              <h2 className="text-2xl font-bold heading-cinematic tracking-wide mb-3">{title}</h2>
              
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {rating > 0 && (
                  <div className={cn("rating-badge", ratingClass)}>
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {rating.toFixed(1)}
                  </div>
                )}
                {runtime && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {runtime} {t('details.minutes')}
                  </div>
                )}
                {releaseDate && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(releaseDate).toLocaleDateString(language)}
                  </div>
                )}
              </div>

              {/* Genres */}
              {details?.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {details.genres.slice(0, 4).map((genre) => (
                    <Badge key={genre.id} variant="secondary" className="text-xs">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overview */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{t('details.overview')}</h3>
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
              {overview}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant={inWatchlist ? "secondary" : "default"}
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleWatchlistClick}
            >
              {inWatchlist ? (
                <>
                  <Bookmark className="w-4 h-4 fill-current" />
                  {t('actions.inWatchlist')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('actions.addToWatchlist')}
                </>
              )}
            </Button>

            <Button
              variant={watched ? "secondary" : "outline"}
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleWatchedClick}
            >
              {watched ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('actions.watched')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('actions.markAsWatched')}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleViewDetails}
            >
              <ExternalLink className="w-4 h-4" />
              {t('modal.viewDetails') || 'View Details'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}