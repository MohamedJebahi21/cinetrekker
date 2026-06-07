import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getTrending, getPopularMovies, getPopularTV, getTopRatedMovies, getTopRatedTV } from '@/services/tmdb';
import { MediaSection } from '@/components/MediaSection';
import { MediaCarousel } from '@/components/MediaCarousel';
import { MediaCard } from '@/components/MediaCard';
import { MediaGrid } from '@/components/MediaGrid';
import { WatchedShowsNewEpisodes } from '@/components/WatchedShowsNewEpisodes';
import { RecentlyAddedMovies } from '@/components/RecentlyAddedMovies';
import { BecauseYouLiked } from '@/components/BecauseYouLiked';
import { OnboardingTooltip } from '@/components/OnboardingTooltip';
import { HeroSection } from '@/components/HeroSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SEO from '@/components/SEO';

export default function Index() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  // State for tab selections
  const [topThisWeekType, setTopThisWeekType] = useState<'movie' | 'tv'>('movie');
  const [topRatedType, setTopRatedType] = useState<'movie' | 'tv'>('movie');
  const [popularType, setPopularType] = useState<'movie' | 'tv'>('movie');

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

  const { data: topRatedMovies, isLoading: loadingTopRatedMovies } = useQuery({
    queryKey: ['top-rated', 'movie', language],
    queryFn: () => getTopRatedMovies(1, language),
  });

  const { data: topRatedTV, isLoading: loadingTopRatedTV } = useQuery({
    queryKey: ['top-rated', 'tv', language],
    queryFn: () => getTopRatedTV(1, language),
  });

  return (
    <div className="min-h-screen">
      <SEO title="CineTrekker — Track Your Movies & TV Shows" description="Discover trending movies and TV shows, track your watchlist, and get personalized recommendations." canonical="https://cinetrekker.vercel.app" />
      {/* Onboarding for new users */}
      <OnboardingTooltip />
      {/* High-Conversion Hero Section */}
      <HeroSection />

      {/* AI Movie Scout removed per request */}

      <div className="page-container space-y-8 pb-24 md:pb-0">
        {/* Personalized Recommendations removed */}

        {/* Phase 3: "Because You Liked" personalized row */}
        <BecauseYouLiked />

        {/* Did You Watch? - New episodes for watched TV shows */}
        <WatchedShowsNewEpisodes />

        {/* Recently Added Movies */}
        <RecentlyAddedMovies />

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
              loading={loadingMoviesWeek}
              showMoreLink="/search?type=movie"
            />
          )}
          {topThisWeekType === 'tv' && (
            <MediaCarousel
              title={t('home.topSeriesWeek')}
              items={trendingTVWeek?.results || []}
              loading={loadingTVWeek}
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
              loading={loadingTopRatedMovies}
              showMoreLink="/search?sort=top_rated&type=movie"
            />
          )}
          {topRatedType === 'tv' && (
            <MediaSection
              title={t('home.topRatedSeries') || 'Top Rated Series'}
              items={topRatedTV?.results || []}
              loading={loadingTopRatedTV}
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
                    loading={loadingDay}
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
              loading={loadingPopularTV}
              showMoreLink="/search?type=tv"
            />
          )}
        </section>
      </div>
    </div>
  );
}