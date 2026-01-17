import { useParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, Clock, Calendar, Bookmark, Check, Plus, 
  MessageSquare, ChevronLeft, Heart, HeartOff, PlayCircle
} from 'lucide-react';
import { getMovieDetails, getTVDetails, getImageUrl, getBackdropUrl, getTVSeasonDetails } from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { useFollowedShows, useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const mediaId = parseInt(id || '0');
  // Infer media type from the URL path (e.g., /movie/123 or /tv/456)
  const mediaType: 'movie' | 'tv' = location.pathname.startsWith('/tv') ? 'tv' : 'movie';

  const { user } = useAuth();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [tempRating, setTempRating] = useState(5);
  const [tempNote, setTempNote] = useState('');
  const [episodesDialogOpen, setEpisodesDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

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

  const { isFollowing, followShow, unfollowShow } = useFollowedShows();
  const { isEpisodeWatched, markEpisodeWatched, removeEpisodeWatched } = useWatchedEpisodes(mediaId);

  const { data: details, isLoading, error, isError } = useQuery({
    queryKey: ['details', mediaType, mediaId, language],
    queryFn: async () => {
      console.log(`Fetching ${mediaType} details for ID: ${mediaId}`);
      const result = mediaType === 'movie' 
        ? await getMovieDetails(mediaId, language) 
        : await getTVDetails(mediaId, language);
      console.log(`Received ${mediaType} details:`, result);
      return result;
    },
    enabled: !!mediaId && !!mediaType,
    retry: 1,
  });

  const { data: seasonDetails } = useQuery({
    queryKey: ['season-details', mediaId, selectedSeason, language],
    queryFn: () => getTVSeasonDetails(mediaId, selectedSeason!, language),
    enabled: !!selectedSeason && mediaType === 'tv',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (isError || !details) {
    console.error('Details page error:', error);
    return (
      <div className="page-container text-center py-16">
        <p className="text-lg text-muted-foreground">{t('common.error')}</p>
        {error && <p className="text-sm text-destructive mt-2">{(error as Error).message}</p>}
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
  const following = user ? isFollowing(mediaId) : false;

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

  const handleFollowShow = () => {
    if (!user) return;
    if (following) {
      unfollowShow(mediaId);
    } else {
      followShow({ showId: mediaId, showName: title, posterPath: details.poster_path });
    }
  };

  const handleEpisodeToggle = (seasonNumber: number, episodeNumber: number, episodeName: string, airDate: string | null) => {
    if (isEpisodeWatched(mediaId, seasonNumber, episodeNumber)) {
      removeEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber });
    } else {
      markEpisodeWatched({ 
        showId: mediaId, 
        seasonNumber, 
        episodeNumber, 
        episodeName,
        airDate: airDate || undefined,
      });
    }
  };

  const similarItems = details.similar?.results?.slice(0, 6).map(item => ({
    ...item,
    media_type: mediaType,
  })) || [];

  const recommendedItems = details.recommendations?.results?.slice(0, 6).map(item => ({
    ...item,
    media_type: mediaType,
  })) || [];

  const seasons = details.number_of_seasons ? Array.from({ length: details.number_of_seasons }, (_, i) => i + 1) : [];

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

              {/* Follow Show Button - TV only */}
              {mediaType === 'tv' && user && (
                <Button
                  variant={following ? "secondary" : "outline"}
                  className="gap-2"
                  onClick={handleFollowShow}
                >
                  {following ? (
                    <>
                      <HeartOff className="w-4 h-4" />
                      {t('details.unfollowShow')}
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      {t('details.followShow')}
                    </>
                  )}
                </Button>
              )}

              {/* Episodes Button - TV only */}
              {mediaType === 'tv' && seasons.length > 0 && user && (
                <Dialog open={episodesDialogOpen} onOpenChange={setEpisodesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <PlayCircle className="w-4 h-4" />
                      {t('episodes.allEpisodes')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t('episodes.allEpisodes')} - {title}</DialogTitle>
                    </DialogHeader>
                    <Accordion type="single" collapsible className="w-full" onValueChange={(val) => setSelectedSeason(val ? parseInt(val) : null)}>
                      {seasons.map((seasonNum) => (
                        <AccordionItem key={seasonNum} value={seasonNum.toString()}>
                          <AccordionTrigger className="hover:no-underline">
                            <span className="flex items-center gap-2">
                              {t('episodes.season')} {seasonNum}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {selectedSeason === seasonNum && seasonDetails?.episodes ? (
                              <div className="space-y-2">
                                {seasonDetails.episodes.map((episode) => {
                                  const episodeWatched = isEpisodeWatched(mediaId, seasonNum, episode.episode_number);
                                  return (
                                    <div 
                                      key={episode.id}
                                      className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg transition-colors",
                                        episodeWatched ? "bg-muted/50" : "hover:bg-muted/30"
                                      )}
                                    >
                                      <Checkbox
                                        checked={episodeWatched}
                                        onCheckedChange={() => handleEpisodeToggle(
                                          seasonNum,
                                          episode.episode_number,
                                          episode.name,
                                          episode.air_date
                                        )}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">
                                            E{episode.episode_number}
                                          </span>
                                          <span className={cn("text-sm", episodeWatched && "line-through opacity-60")}>
                                            {episode.name}
                                          </span>
                                        </div>
                                        {episode.air_date && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(episode.air_date).toLocaleDateString(language)}
                                          </span>
                                        )}
                                      </div>
                                      {episode.runtime && (
                                        <span className="text-xs text-muted-foreground">
                                          {episode.runtime} {t('details.minutes')}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                {t('common.loading')}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </DialogContent>
                </Dialog>
              )}

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

            {/* Sign in prompt for TV shows */}
            {mediaType === 'tv' && !user && (
              <div className="glass-card p-4 text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">
                  {t('auth.signInRequired')}
                </Link>
                {' '}{t('home.hero.subtitle')}
              </div>
            )}

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
