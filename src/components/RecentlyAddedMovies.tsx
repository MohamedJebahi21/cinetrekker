import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Calendar } from 'lucide-react';
import { getNowPlayingMovies, getImageUrl, getMediaTitle } from '@/services/tmdb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export function RecentlyAddedMovies() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const { data, isLoading } = useQuery({
    queryKey: ['nowPlaying', language],
    queryFn: () => getNowPlayingMovies(1, language),
  });

  const movies = data?.results?.slice(0, 12) || [];

  if (!isLoading && movies.length === 0) return null;

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{t('home.recentMovies')}</h2>
        <Link to="/search?type=movie&sort=release_date">
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
              <Skeleton className="h-32 rounded-lg" />
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
            {movies.map((movie) => {
              const title = getMediaTitle(movie);
              const posterUrl = getImageUrl(movie.poster_path, 'w185');
              const year = movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : '';
              const releaseDate = movie.release_date
                ? new Date(movie.release_date).toLocaleDateString(language, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '';

              return (
                <CarouselItem
                  key={movie.id}
                  className="pl-2 md:pl-3 basis-[85%] sm:basis-[45%] md:basis-[35%] lg:basis-[28%] xl:basis-[22%]"
                >
                  <Link
                    to={`/movie/${movie.id}`}
                    className="flex gap-3 p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className="w-16 h-24 rounded-md overflow-hidden flex-shrink-0">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{year}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{releaseDate}</span>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm border-border" />
          <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm border-border" />
        </Carousel>
      )}
    </section>
  );
}
