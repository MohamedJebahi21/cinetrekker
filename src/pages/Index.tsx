import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { getTrending } from '@/services/tmdb';
import { MediaSection } from '@/components/MediaSection';
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

  const heroMedia = trendingDay?.results?.[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {heroMedia?.backdrop_path && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ 
              backgroundImage: `url(https://image.tmdb.org/t/p/w1280${heroMedia.backdrop_path})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">{t('common.appName')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              {t('home.hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              {t('home.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="page-container space-y-12">
        {/* Trending Section with Tabs */}
        <section>
          <Tabs defaultValue="day" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title mb-0">{t('home.trending')}</h2>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="day" className="text-sm">
                  {t('home.trendingToday')}
                </TabsTrigger>
                <TabsTrigger value="week" className="text-sm">
                  {t('home.trendingWeek')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="day" className="mt-0">
              <MediaSection
                title=""
                items={trendingDay?.results?.slice(0, 12) || []}
                loading={loadingDay}
              />
            </TabsContent>

            <TabsContent value="week" className="mt-0">
              <MediaSection
                title=""
                items={trendingWeek?.results?.slice(0, 12) || []}
                loading={loadingWeek}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
