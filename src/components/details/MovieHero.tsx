import React from 'react';
import { Star, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  year?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number;
  isLoading?: boolean;
  inWatchlist?: boolean;
  onAddToWatchlist?: () => void;
  onMarkAsWatched?: () => void;
};

export default function MovieHero({ title, year, posterUrl, backdropUrl, rating, isLoading, inWatchlist, onAddToWatchlist, onMarkAsWatched }: Props) {
  if (isLoading) {
    return (
      <div className="relative h-[55vh] md:h-[72vh] overflow-hidden -mt-16">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-black/60 to-transparent" />
        <div className="page-container absolute bottom-0 w-full p-6">
          <div className="rounded-xl backdrop-blur-md bg-black/60 animate-pulse h-40 md:h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[55vh] md:h-[72vh] overflow-hidden -mt-16">
      {backdropUrl && <img src={backdropUrl} alt={title} className="w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 backdrop-blur-sm pointer-events-none" />

      <Link to="/" className="absolute top-20 left-4 z-20 flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors" aria-label="Back">
        <ChevronLeft className="w-4 h-4" />
        Home
      </Link>

      <div className="absolute left-4 right-4 md:left-16 md:right-auto md:max-w-[1100px] bottom-[-40px] md:bottom-8 z-30">
        <div className="rounded-xl backdrop-blur-md bg-black/60 p-4 md:p-6 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="w-36 md:w-56 rounded-xl shadow-xl" />
            ) : (
              <div className="w-36 md:w-56 aspect-[2/3] bg-muted rounded-xl" />
            )}
          </div>

            <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl md:text-3xl font-bold leading-tight">{title}{year ? ` • ${year}` : ''}</h1>
              {rating !== undefined && (
                <div className={cn('rating-badge', rating >= 7 ? 'rating-high' : rating >= 5 ? 'rating-medium' : 'rating-low')}>
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  {rating?.toFixed(1)}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant={inWatchlist ? 'secondary' : 'default'} onClick={onAddToWatchlist} className="gap-2">
                {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
              </Button>
              <Button variant="outline" onClick={onMarkAsWatched} className="gap-2">Mark as Watched</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
