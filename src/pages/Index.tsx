import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Play, Bookmark, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTrending, getPopularMovies, getPopularTV, getBackdropUrl, getMediaTitle } from '@/services/tmdb';
import { MediaSection } from '@/components/MediaSection';
import { MediaCarousel } from '@/components/MediaCarousel';
import { NewEpisodesSection } from '@/components/NewEpisodesSection';
import { WatchedShowsNewEpisodes } from '@/components/WatchedShowsNewEpisodes';
import { RecentlyAddedMovies } from '@/components/RecentlyAddedMovies';
import { RecentlyAddedEpisodes } from '@/components/RecentlyAddedEpisodes';
import { RandomTrekButton } from '@/components/RandomTrekButton';
import { BecauseYouLiked } from '@/components/BecauseYouLiked';
import { OnboardingTooltip } from '@/components/OnboardingTooltip';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const language = i18n.language;

  const { data: trendingDay, isLoading: loadingDay } = useQuery({
    queryKey: ['trending', 'day', language],
    queryFn: () => getTrending('all', 'day', language),
  });

  const { data: trendingWeek, isLoading: loadingWeek } = useQuery({
    queryKey: ['trending', 'week', language],
    queryFn: () => getTrending('all', 'week', language),
  });

  const { data: trendingMoviesWeek, isLoading: loadingMoviesWeek } = useQuery({
    queryKey: ['trending', 'movie', 'week', language],
    queryFn: () => getTrending('movie', 'week', language),
  });

  const { data: trendingTVWeek, isLoading: loadingTVWeek } = useQuery({
    queryKey: ['trending', 'tv', 'week', language],
    queryFn: () => getTrending('tv', 'week', language),
  });

  const { data: popularMovies, isLoading: loadingPopularMovies } = useQuery({
    queryKey: ['popular', 'movie', language],
    queryFn: () => getPopularMovies(1, language),
  });

  const { data: popularTV, isLoading: loadingPopularTV } = useQuery({
    queryKey: ['popular', 'tv', language],
    queryFn: () => getPopularTV(1, language),
  });

  const heroMedia = trendingDay?.results?.[0];
  const heroBackdropUrl = heroMedia?.backdrop_path 
    ? getBackdropUrl(heroMedia.backdrop_path, 'w1280') // Optimized: use w1280 instead of original
    : null;

  return (
    <div className="min-h-screen pt-16">
      {/* Onboarding for new users */}
      <OnboardingTooltip />

      {/* Hero Section - Apple TV+ Style */}
      <section className="relative overflow-hidden -mt-16 min-h-[70vh] md:min-h-[80vh] flex items-center">
        {/* Optimized Backdrop Image */}
        {heroBackdropUrl && (
          <img
            src={heroBackdropUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 backdrop-fade" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        
        <div className="relative container mx-auto px-4 py-32 md:py-40 pt-24 md:pt-32">
          <div className="max-w-2xl">
            {/* Featured Badge */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {t('home.featured', 'Featured')}
              </span>
            </div>

            {/* Hero Title - Featured Media */}
            {heroMedia && (
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight heading-cinematic">
                {getMediaTitle(heroMedia)}
              </h1>
            )}

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-8">
              {t('home.hero.subtitle')}
            </p>
            
            {/* Dynamic CTA based on auth state */}
            <div className="flex flex-wrap items-center gap-4">
              {heroMedia && (
                <Link to={`/${heroMedia.media_type || 'movie'}/${heroMedia.id}`}>
                  <Button size="lg" className="btn-primary-glow gap-2 min-h-[48px]" aria-label={t('home.viewDetails', 'View Details')}>
                    <Play className="w-5 h-5" />
                    {t('home.viewDetails', 'View Details')}
                  </Button>
                </Link>
              )}

              {user ? (
                <RandomTrekButton variant="hero" />
              ) : (
                <Link to="/auth">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2 border-white/20 hover:bg-white/10 min-h-[48px]"
                    aria-label={t('home.startTracking', 'Start Tracking')}
                  >
                    <Bookmark className="w-5 h-5" />
                    {t('home.startTracking', 'Start Tracking')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="page-container space-y-10">
        {/* Phase 3: "Because You Liked" personalized row */}
        <BecauseYouLiked />

        {/* Did You Watch? - New episodes for watched TV shows */}
        <WatchedShowsNewEpisodes />

        {/* Recently Added Sections */}
        <RecentlyAddedEpisodes />
        <RecentlyAddedMovies />

        {/* New Episodes Section */}
        <NewEpisodesSection />

        {/* Top Movies This Week - Horizontal scroll */}
        <MediaCarousel
          title={t('home.topMoviesWeek')}
          items={trendingMoviesWeek?.results?.slice(0, 20) || []}
          loading={loadingMoviesWeek}
          showMoreLink="/search?type=movie"
        />

        {/* Top Series This Week - Horizontal scroll */}
        <MediaCarousel
          title={t('home.topSeriesWeek')}
          items={trendingTVWeek?.results?.slice(0, 20) || []}
          loading={loadingTVWeek}
          showMoreLink="/search?type=tv"
        />

        {/* Trending Section with Tabs */}
        <section>
          <Tabs defaultValue="day" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title mb-0">{t('home.trending')}</h2>
              <TabsList className="bg-card/50 border border-white/5">
                <TabsTrigger value="day" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('home.trendingToday')}
                </TabsTrigger>
                <TabsTrigger value="week" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('home.trendingWeek')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="day" className="mt-0">
              <MediaSection
                title=""
                items={trendingDay?.results?.slice(0, 18) || []}
                loading={loadingDay}
                showMoreLink="/search?sort=popularity"
              />
            </TabsContent>

            <TabsContent value="week" className="mt-0">
              <MediaSection
                title=""
                items={trendingWeek?.results?.slice(0, 18) || []}
                loading={loadingWeek}
                showMoreLink="/search?sort=popularity"
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Popular Movies - Horizontal scroll */}
        <MediaCarousel
          title={t('home.popularMovies')}
          items={popularMovies?.results?.slice(0, 20) || []}
          loading={loadingPopularMovies}
          showMoreLink="/search?type=movie"
        />

        {/* Popular Series - Horizontal scroll */}
        <MediaCarousel
          title={t('home.popularSeries')}
          items={popularTV?.results?.slice(0, 20) || []}
          loading={loadingPopularTV}
          showMoreLink="/search?type=tv"
        />
      </div>
    </div>
  );
}