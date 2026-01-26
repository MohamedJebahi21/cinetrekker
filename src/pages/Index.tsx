import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { getTrending, getPopularMovies, getPopularTV } from '@/services/tmdb';
import { MediaSection } from '@/components/MediaSection';
import { MediaCarousel } from '@/components/MediaCarousel';
import { NewEpisodesSection } from '@/components/NewEpisodesSection';
import { WatchedShowsNewEpisodes } from '@/components/WatchedShowsNewEpisodes';
import { RecentlyAddedMovies } from '@/components/RecentlyAddedMovies';
import { RecentlyAddedEpisodes } from '@/components/RecentlyAddedEpisodes';
import { RandomTrekButton } from '@/components/RandomTrekButton';
import { BecauseYouLiked } from '@/components/BecauseYouLiked';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Index() {
  const { t, i18n } = useTranslation();
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

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section with full-width backdrop */}
      <section className="relative overflow-hidden -mt-16">
        {heroMedia?.backdrop_path && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(https://image.tmdb.org/t/p/original${heroMedia.backdrop_path})`,
            }}
          />
        )}
        {/* Smooth fade-to-black transition */}
        <div className="absolute inset-0 backdrop-fade" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        
        <div className="relative container mx-auto px-4 py-32 md:py-40 pt-24 md:pt-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">{t('common.appName')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight heading-cinematic">
              {t('home.hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-8">
              {t('home.hero.subtitle')}
            </p>
            
            {/* Random Trek Hero Button */}
            <RandomTrekButton variant="hero" />
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