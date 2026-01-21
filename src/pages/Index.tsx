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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {heroMedia?.backdrop_path && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ 
              backgroundImage: `url(https://image.tmdb.org/t/p/w1280${heroMedia.backdrop_path})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">{t('common.appName')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight heading-cinematic tracking-wide">
              {t('home.hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {t('home.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="page-container space-y-10">
        {/* Did You Watch? - New episodes for watched TV shows */}
        <WatchedShowsNewEpisodes />

        {/* Recently Added Sections - Top of Page */}
        <RecentlyAddedEpisodes />
        <RecentlyAddedMovies />

        {/* New Episodes Section - Shows for logged-in users with followed shows */}
        <NewEpisodesSection />

        {/* Top Movies This Week Carousel */}
        <MediaCarousel
          title={t('home.topMoviesWeek')}
          items={trendingMoviesWeek?.results?.slice(0, 20) || []}
          loading={loadingMoviesWeek}
          showMoreLink="/search?type=movie"
        />

        {/* Top Series This Week Carousel */}
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

        {/* Popular Movies Section */}
        <MediaCarousel
          title={t('home.popularMovies')}
          items={popularMovies?.results?.slice(0, 20) || []}
          loading={loadingPopularMovies}
          showMoreLink="/search?type=movie"
        />

        {/* Popular Series Section */}
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
