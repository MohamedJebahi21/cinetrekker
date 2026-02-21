import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getTrending, getPopularMovies, getPopularTV, getTopRatedMovies, getTopRatedTV } from '@/services/tmdb';
import { MediaSection } from '@/components/MediaSection';
import { MediaCarousel } from '@/components/MediaCarousel';
import { MediaCard } from '@/components/MediaCard';
import { HeroSection } from '@/components/HeroSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SEO from '@/components/SEO';

const BecauseYouLiked = lazy(() => import('@/components/BecauseYouLiked').then((mod) => ({ default: mod.BecauseYouLiked })));
const WatchedShowsNewEpisodes = lazy(() => import('@/components/WatchedShowsNewEpisodes').then((mod) => ({ default: mod.WatchedShowsNewEpisodes })));
const RecentlyAddedMovies = lazy(() => import('@/components/RecentlyAddedMovies').then((mod) => ({ default: mod.RecentlyAddedMovies })));
const OnboardingTooltip = lazy(() => import('@/components/OnboardingTooltip').then((mod) => ({ default: mod.OnboardingTooltip })));

export default function Index() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  // State for tab selections
  const [topThisWeekType, setTopThisWeekType] = useState<'movie' | 'tv'>('movie');
  const [topRatedType, setTopRatedType] = useState<'movie' | 'tv'>('movie');
  const [popularType, setPopularType] = useState<'movie' | 'tv'>('movie');

  const [deferredEnabled, setDeferredEnabled] = useState(false);

  const {
    data: criticalData,
    isLoading: loadingCritical,
    error: criticalError,
  } = useQuery({
    queryKey: ['home-critical', language],
    queryFn: async () => {
      const [popularMoviesData, trendingWeekData] = await Promise.all([
        getPopularMovies(1, language),
        getTrending('all', 'week', language),
      ]);

      return {
        popularMovies: popularMoviesData,
        trendingWeek: trendingWeekData,
      };
    },
  });

  useEffect(() => {
    setDeferredEnabled(false);

    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const enableDeferred = () => setDeferredEnabled(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enableDeferred, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(enableDeferred, 0);
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [language]);

  const { data: trendingMoviesWeek, isLoading: loadingMoviesWeek, error: trendingMoviesWeekError } = useQuery({
    queryKey: ['trending', 'movie', 'week', language],
    queryFn: () => getTrending('movie', 'week', language),
    enabled: deferredEnabled,
  });

  const { data: trendingTVWeek, isLoading: loadingTVWeek, error: trendingTVWeekError } = useQuery({
    queryKey: ['trending', 'tv', 'week', language],
    queryFn: () => getTrending('tv', 'week', language),
    enabled: deferredEnabled,
  });

  const { data: popularTV, isLoading: loadingPopularTV, error: popularTVError } = useQuery({
    queryKey: ['popular', 'tv', language],
    queryFn: () => getPopularTV(1, language),
    enabled: deferredEnabled,
  });

  const { data: topRatedMovies, isLoading: loadingTopRatedMovies, error: topRatedMoviesError } = useQuery({
    queryKey: ['top-rated', 'movie', language],
    queryFn: () => getTopRatedMovies(1, language),
    enabled: deferredEnabled,
  });

  const { data: topRatedTV, isLoading: loadingTopRatedTV, error: topRatedTVError } = useQuery({
    queryKey: ['top-rated', 'tv', language],
    queryFn: () => getTopRatedTV(1, language),
    enabled: deferredEnabled,
  });

  const { data: trendingDay, isLoading: loadingDay, error: trendingDayError } = useQuery({
    queryKey: ['trending', 'day', language],
    queryFn: () => getTrending('all', 'day', language),
    enabled: deferredEnabled,
  });

  const popularMovies = criticalData?.popularMovies;
  const trendingWeek = criticalData?.trendingWeek;
  const loadingPopularMovies = loadingCritical;
  const loadingWeek = loadingCritical;

  const hasDeferredErrors = Boolean(
    trendingMoviesWeekError ||
    trendingTVWeekError ||
    popularTVError ||
    topRatedMoviesError ||
    topRatedTVError ||
    trendingDayError
  );

  return (
    <div className="min-h-screen">
      <SEO title="CineTrekker — Track Your Movies & TV Shows" description="Discover trending movies and TV shows, track your watchlist, and get personalized recommendations." canonical="https://cinetrekker.vercel.app" />
      {/* Onboarding for new users */}
      {deferredEnabled && (
        <Suspense fallback={null}>
          <OnboardingTooltip />
        </Suspense>
      )}
      {/* High-Conversion Hero Section */}
      <HeroSection />

      {/* AI Movie Scout removed per request */}

      <div className="page-container space-y-8 pb-24 md:pb-0">
        {criticalError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {t('common.error', 'Something went wrong loading featured content. Please try again.')}
          </div>
        )}

        {hasDeferredErrors && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            {t('common.error', 'Some sections failed to load. You can keep browsing and retry shortly.')}
          </div>
        )}

        {/* Personalized Recommendations removed */}

        {/* Phase 3: "Because You Liked" personalized row */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <BecauseYouLiked />
          </Suspense>
        )}

        {/* Did You Watch? - New episodes for watched TV shows */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <WatchedShowsNewEpisodes />
          </Suspense>
        )}

        {/* Recently Added Movies */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <RecentlyAddedMovies />
          </Suspense>
        )}

        {/* New Episodes Section removed per UI cleanup */}

        {/* Top This Week - Movies/Series Toggle */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">{t('home.topThisWeek') || 'Top This Week'}</h2>
            <div className="flex gap-2 bg-card/50 border border-white/5 rounded-lg p-1">
              <button
                onClick={() => setTopThisWeekType('movie')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  topThisWeekType === 'movie'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.movies')}
              </button>
              <button
                onClick={() => setTopThisWeekType('tv')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  topThisWeekType === 'tv'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.tvShows')}
              </button>
            </div>
          </div>
          {topThisWeekType === 'movie' && (
            <MediaCarousel
              title={t('home.topMoviesWeek')}
              items={trendingMoviesWeek?.results || []}
              loading={!deferredEnabled || loadingMoviesWeek}
              showMoreLink="/search?type=movie"
            />
          )}
          {topThisWeekType === 'tv' && (
            <MediaCarousel
              title={t('home.topSeriesWeek')}
              items={trendingTVWeek?.results || []}
              loading={!deferredEnabled || loadingTVWeek}
              showMoreLink="/search?type=tv"
            />
          )}
        </section>

        {/* Top Rated - Movies/Series Toggle */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">{t('home.topRated') || 'Top Rated'}</h2>
            <div className="flex gap-2 bg-card/50 border border-white/5 rounded-lg p-1">
              <button
                onClick={() => setTopRatedType('movie')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  topRatedType === 'movie'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.movies')}
              </button>
              <button
                onClick={() => setTopRatedType('tv')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  topRatedType === 'tv'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.tvShows')}
              </button>
            </div>
          </div>
          {topRatedType === 'movie' && (
            <MediaSection
              title={t('home.topRatedMovies') || 'Top Rated Movies'}
              items={topRatedMovies?.results || []}
              loading={!deferredEnabled || loadingTopRatedMovies}
              showMoreLink="/search?sort=top_rated&type=movie"
            />
          )}
          {topRatedType === 'tv' && (
            <MediaSection
              title={t('home.topRatedSeries') || 'Top Rated Series'}
              items={topRatedTV?.results || []}
              loading={!deferredEnabled || loadingTopRatedTV}
              showMoreLink="/search?sort=top_rated&type=tv"
            />
          )}
        </section>

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
                    title={t('home.trendingToday')}
                    items={trendingDay?.results || []}
                    loading={!deferredEnabled || loadingDay}
                    showMoreLink="/search?sort=popularity"
                  />
            </TabsContent>

            <TabsContent value="week" className="mt-0">
                  <MediaSection
                    title={t('home.trendingWeek')}
                    items={trendingWeek?.results || []}
                    loading={loadingWeek}
                    showMoreLink="/search?sort=popularity"
                  />
            </TabsContent>
          </Tabs>
        </section>

        {/* Popular - Movies/Series Toggle */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">{t('home.popular') || 'Popular'}</h2>
            <div className="flex gap-2 bg-card/50 border border-white/5 rounded-lg p-1">
              <button
                onClick={() => setPopularType('movie')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  popularType === 'movie'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.movies')}
              </button>
              <button
                onClick={() => setPopularType('tv')}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  popularType === 'tv'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.tvShows')}
              </button>
            </div>
          </div>
          {popularType === 'movie' && (
            <MediaCarousel
              title={t('home.popularMovies')}
              items={popularMovies?.results || []}
              loading={loadingPopularMovies}
              showMoreLink="/search?type=movie"
            />
          )}
          {popularType === 'tv' && (
            <MediaCarousel
              title={t('home.popularSeries')}
              items={popularTV?.results || []}
              loading={!deferredEnabled || loadingPopularTV}
              showMoreLink="/search?type=tv"
            />
          )}
        </section>
      </div>
    </div>
  );
}
