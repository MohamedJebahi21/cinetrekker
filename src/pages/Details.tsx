import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, Clock, Calendar, Bookmark, Check, Plus, X, 
  MessageSquare, ChevronLeft 
} from 'lucide-react';
import { getMovieDetails, getTVDetails, getImageUrl, getBackdropUrl } from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { MediaSection } from '@/components/MediaSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function Details() {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const mediaId = parseInt(id || '0');
  const mediaType = type as 'movie' | 'tv';

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [tempRating, setTempRating] = useState(5);
  const [tempNote, setTempNote] = useState('');

  const {
    isInWatchlist,
    isWatched,
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
    getWatchedItem,
    updateWatchedItem,
  } = useUserLists();

  const { data: details, isLoading } = useQuery({
    queryKey: ['details', mediaType, mediaId, language],
    queryFn: () => mediaType === 'movie' 
      ? getMovieDetails(mediaId, language) 
      : getTVDetails(mediaId, language),
    enabled: !!mediaId && !!mediaType,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="page-container text-center py-16">
        <p className="text-lg text-muted-foreground">{t('common.error')}</p>
      </div>
    );
  }

  const title = details.title || details.name || '';
  const overview = details.overview || t('details.noOverview');
  const posterUrl = getImageUrl(details.poster_path, 'w500');
  const backdropUrl = getBackdropUrl(details.backdrop_path);
  const releaseDate = details.release_date || details.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const runtime = details.runtime || (details.episode_run_time?.[0]);
  const rating = details.vote_average;
  const ratingClass = rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low';

  const inWatchlist = isInWatchlist(mediaId, mediaType);
  const watched = isWatched(mediaId, mediaType);
  const watchedItem = getWatchedItem(mediaId, mediaType);

  const handleAddToWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(mediaId, mediaType);
    } else {
      addToWatchlist(mediaId, mediaType);
    }
  };

  const handleMarkAsWatched = () => {
    if (watched) {
      removeFromWatched(mediaId, mediaType);
    } else {
      setTempRating(watchedItem?.rating || 5);
      setTempNote(watchedItem?.note || '');
      setRatingDialogOpen(true);
    }
  };

  const handleSaveRating = () => {
    if (watched) {
      updateWatchedItem(mediaId, mediaType, { rating: tempRating, note: tempNote });
    } else {
      addToWatched(mediaId, mediaType, tempRating, tempNote);
    }
    setRatingDialogOpen(false);
  };

  const similarItems = details.similar?.results?.slice(0, 6).map(item => ({
    ...item,
    media_type: mediaType,
  })) || [];

  const recommendedItems = details.recommendations?.results?.slice(0, 6).map(item => ({
    ...item,
    media_type: mediaType,
  })) || [];

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        
        {/* Back Button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 z-10 flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('nav.home')}
        </Link>
      </div>

      {/* Content */}
      <div className="page-container -mt-32 md:-mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={title}
                className="w-48 md:w-64 rounded-xl shadow-2xl"
              />
            ) : (
              <div className="w-48 md:w-64 aspect-[2/3] bg-muted rounded-xl flex items-center justify-center">
                <span className="text-muted-foreground">{t('common.noResults')}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {mediaType === 'movie' ? t('common.movie') : t('common.tvShow')}
                </Badge>
                {year && <span className="text-muted-foreground">{year}</span>}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {rating > 0 && (
                  <div className={cn("rating-badge", ratingClass)}>
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    {rating.toFixed(1)}
                  </div>
                )}
                {runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {runtime} {t('details.minutes')}
                  </div>
                )}
                {releaseDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(releaseDate).toLocaleDateString(language)}
                  </div>
                )}
                {details.number_of_seasons && (
                  <span>{details.number_of_seasons} {t('details.seasons')}</span>
                )}
                {details.number_of_episodes && (
                  <span>{details.number_of_episodes} {t('details.episodes')}</span>
                )}
              </div>

              {/* Genres */}
              {details.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {details.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant={inWatchlist ? "secondary" : "default"}
                className="gap-2"
                onClick={handleAddToWatchlist}
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
                className="gap-2"
                onClick={handleMarkAsWatched}
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

              {watched && (
                <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {watchedItem?.rating ? `${watchedItem.rating}/10` : t('actions.rateTitle')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('rating.rateThis', { type: mediaType === 'movie' ? t('common.movie') : t('common.tvShow') })}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div>
                        <label className="text-sm font-medium mb-4 block">
                          {t('rating.yourRating')}: {tempRating}/10
                        </label>
                        <Slider
                          value={[tempRating]}
                          onValueChange={([value]) => setTempRating(value)}
                          min={1}
                          max={10}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t('rating.note')}</label>
                        <Textarea
                          value={tempNote}
                          onChange={(e) => setTempNote(e.target.value)}
                          placeholder={t('rating.notePlaceholder')}
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveRating}>
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Overview */}
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('details.overview')}</h2>
              <p className="text-muted-foreground leading-relaxed">{overview}</p>
            </div>

            {/* User Note */}
            {watchedItem?.note && (
              <div className="glass-card p-4">
                <h3 className="text-sm font-medium mb-2">{t('rating.note')}</h3>
                <p className="text-muted-foreground text-sm">{watchedItem.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {details.credits?.cast && details.credits.cast.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title">{t('details.cast')}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {details.credits.cast.slice(0, 10).map((person) => (
                <div key={person.id} className="flex-shrink-0 w-24 text-center">
                  {person.profile_path ? (
                    <img
                      src={getImageUrl(person.profile_path, 'w185') || ''}
                      alt={person.name}
                      className="w-24 h-24 rounded-full object-cover mx-auto mb-2"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl text-muted-foreground">
                        {person.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <p className="text-sm font-medium line-clamp-1">{person.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar */}
        {similarItems.length > 0 && (
          <section className="mt-12">
            <MediaSection
              title={t('details.similar')}
              items={similarItems}
            />
          </section>
        )}

        {/* Recommendations */}
        {recommendedItems.length > 0 && (
          <section className="mt-12">
            <MediaSection
              title={t('details.recommendations')}
              items={recommendedItems}
            />
          </section>
        )}
      </div>
    </div>
  );
}
