import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getTrending, getPopularMovies, getPopularTV } from '@/services/tmdb';
import { MediaSection } from '@/components/MediaSection';
import { MediaCarousel } from '@/components/MediaCarousel';
import { MediaCard } from '@/components/MediaCard';
import { NewEpisodesSection } from '@/components/NewEpisodesSection';
import { WatchedShowsNewEpisodes } from '@/components/WatchedShowsNewEpisodes';
import { RecentlyAddedMovies } from '@/components/RecentlyAddedMovies';
import { RecentlyAddedEpisodes } from '@/components/RecentlyAddedEpisodes';
import { BecauseYouLiked } from '@/components/BecauseYouLiked';
import { OnboardingTooltip } from '@/components/OnboardingTooltip';
import { HeroSection } from '@/components/HeroSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SEO from '@/components/SEO';
import { OnboardingModal } from '@/components/OnboardingModal';
import { usePersonalizedRecommendations } from '@/hooks/usePersonalizedRecommendations';

export default function Index() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: personalized, isLoading: loadingPersonalized } = usePersonalizedRecommendations(language);

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

  return (
    <div className="min-h-screen pt-16">
      <SEO title="CineTrekker — Track Your Movies & TV Shows" description="Discover trending movies and TV shows, track your watchlist, and get personalized recommendations." canonical="https://cinetrekker.lovable.app" />
      {/* Onboarding for new users */}
      <OnboardingTooltip />
      {/* High-Conversion Hero Section */}
      <HeroSection />
      <div className="page-container space-y-10">
        {/* Personalized Recommendations */}
        {personalized && personalized.length > 0 && (
          <section>
            <h2 className="section-title">For You</h2>
            <div className="media-grid">
              {personalized.slice(0, 12).map(media => (
                <MediaCard key={media.id + (media.media_type || '')} media={media} />
              ))}
            </div>
          </section>
        )}
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
        <section aria-labelledby="top-movies-heading">
          <MediaCarousel
            title={t('home.topMoviesWeek')}
            items={trendingMoviesWeek?.results?.slice(0, 20) || []}
            loading={loadingMoviesWeek}
            showMoreLink="/search?type=movie"
          />
        </section>

        {/* Top Series This Week - Horizontal scroll */}
        <section aria-labelledby="top-series-heading">
          <MediaCarousel
            title={t('home.topSeriesWeek')}
            items={trendingTVWeek?.results?.slice(0, 20) || []}
            loading={loadingTVWeek}
            showMoreLink="/search?type=tv"
          />
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
      {/* OnboardingModal should be last in the tree to avoid Router context issues */}
      <OnboardingModal />
    </div>
  );
}