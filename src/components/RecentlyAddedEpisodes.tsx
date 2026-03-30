import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Play } from 'lucide-react';
import { getAiringTodayTV, getImageUrl, getMediaTitle } from '@/services/tmdb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image } from '@/components/ui/Image';
import { useContentPolicy } from '@/contexts/content-policy-context';
import { applySafetyFilter } from '@/lib/contentFilter';
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export function RecentlyAddedEpisodes() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  const { data, isLoading } = useQuery({
    queryKey: ['airingToday', language, includeAdult],
    queryFn: () => getAiringTodayTV(1, language, includeAdult),
  });

  const shows = applySafetyFilter(data?.results || [], strictFiltering, moderateFiltering).slice(0, 12);

  if (!isLoading && shows.length === 0) return null;

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{t('home.recentEpisodes')}</h2>
        <Link to="/search?type=tv&sort=air_date">
          <Button variant="ghost" size="sm" className="gap-1">
            {t('common.seeAll')}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[280px]">
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-3">
            {shows.map((show) => {
              const title = getMediaTitle(show);
              const backdropUrl = getImageUrl(show.backdrop_path, 'w342') || getImageUrl(show.poster_path, 'w342');
              const airDate = show.first_air_date
                ? new Date(show.first_air_date).toLocaleDateString(language, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '';

              return (
                <CarouselItem
                  key={show.id}
                  className="pl-2 md:pl-3 basis-[80%] sm:basis-[45%] md:basis-[35%] lg:basis-[28%] xl:basis-[22%]"
                >
                  <Link
                    to={`/tv/${show.id}`}
                    className="block rounded-lg overflow-hidden bg-card hover:bg-accent/30 transition-colors group relative"
                  >
                    <div className="aspect-video relative">
                      {backdropUrl ? (
                        <Image
                          src={backdropUrl}
                          srcSet={`${getImageUrl(show.backdrop_path || show.poster_path, 'w185')} 185w, ${getImageUrl(show.backdrop_path || show.poster_path, 'w342')} 342w, ${getImageUrl(show.backdrop_path || show.poster_path, 'w780')} 780w`}
                          sizes="(max-width: 639px) 80vw, 320px"
                          alt={`${title} backdrop`}
                          width={342}
                          height={192}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          showSkeleton
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          N/A
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Play className="w-3 h-3 fill-current" />
                            {t('home.newEpisode')}
                          </span>
                          <span className="text-xs text-muted-foreground">{airDate}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm border-border" />
          <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm border-border" />
          <CarouselDots />
        </Carousel>
      )}
    </section>
  );
}

