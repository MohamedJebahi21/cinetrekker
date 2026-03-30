import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTrending, getPopularMovies } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { cn } from "../lib/utils";
import { useContentPolicy } from '@/contexts/content-policy-context';
import { applySafetyFilter } from '@/lib/contentFilter';

interface RandomTrekButtonProps {
  className?: string;
  variant?: 'default' | 'hero';
}

export function RandomTrekButton({ className, variant = 'default' }: RandomTrekButtonProps) {
  const { i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;
  const navigate = useNavigate();
  const [isPicking, setIsPicking] = useState(false);

  const { data: trendingMovies } = useQuery({
    queryKey: ['surprise-trending-movies', language, includeAdult],
    queryFn: () => getTrending('movie', 'day', language, 1, includeAdult),
    staleTime: 1000 * 60 * 10,
  });

  const { data: popularMovies } = useQuery({
    queryKey: ['surprise-popular-movies', language, includeAdult],
    queryFn: () => getPopularMovies(1, language, includeAdult),
    staleTime: 1000 * 60 * 10,
  });

  const moviePool = useMemo(() => {
    const combined: Media[] = [
      ...((trendingMovies?.results || []) as Media[]),
      ...((popularMovies?.results || []) as Media[]),
    ].map((m) => ({ ...m, media_type: 'movie' as const }));

    const filtered = applySafetyFilter(combined, strictFiltering, moderateFiltering)
      .filter((item) => (item.vote_average || 0) > 0);

    return filtered.filter(
      (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index,
    );
  }, [trendingMovies, popularMovies, strictFiltering, moderateFiltering]);

  const getRandomIndex = (max: number) => {
    if (max <= 1) return 0;
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  const handleSurpriseMe = async () => {
    if (moviePool.length === 0 || isPicking) return;

    setIsPicking(true);
    const randomMovie = moviePool[getRandomIndex(moviePool.length)];

    // Tiny delay keeps the UI feeling responsive without heavy animation.
    await new Promise((resolve) => setTimeout(resolve, 120));
    navigate(`/movie/${randomMovie.id}`);
    setIsPicking(false);
  };

  if (variant === 'hero') {
    return (
      <>
        <Button
          size="lg"
          onClick={handleSurpriseMe}
          disabled={isPicking || moviePool.length === 0}
          className={cn(
            "gap-3 text-base font-semibold px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "shadow-[0_0_30px_hsl(358_81%_47%/0.3)] hover:shadow-[0_0_40px_hsl(358_81%_47%/0.5)]",
            "transition-all duration-300",
            isPicking && "animate-pulse",
            className
          )}
        >
          {isPicking ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          🎲 Surprise Me
        </Button>

        {/* Media preview removed; navigates to details */}
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleSurpriseMe}
        disabled={isPicking || moviePool.length === 0}
        className={cn(
          "gap-2 border-primary/30 hover:border-primary hover:bg-primary/10",
          isPicking && "animate-pulse",
          className
        )}
      >
        {isPicking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        🎲 Surprise Me
      </Button>

      {/* Media preview removed; navigates to details */}
    </>
  );
}

