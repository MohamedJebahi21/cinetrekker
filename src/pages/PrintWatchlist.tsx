import React from 'react';
import { useUserLists } from '@/contexts/user-lists-context';
import { useQuery } from '@tanstack/react-query';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

export default function PrintWatchlist() {
  const { watchlist } = useUserLists();
  const { i18n } = useTranslation();
  const language = i18n.language;

  const { data: mediaDetails } = useQuery({
    queryKey: ['print-watchlist', watchlist.map((i) => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const details =
              item.mediaType === 'movie'
                ? await getMovieDetails(item.mediaId, language)
                : await getTVDetails(item.mediaId, language);
            return { ...details, media_type: item.mediaType };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: watchlist.length > 0,
  });

  const moviesList = mediaDetails?.filter((m) => m.media_type === 'movie') || [];
  const tvList = mediaDetails?.filter((m) => m.media_type === 'tv') || [];

  return (
    <>
      <SEO
        title="Printable Watchlist - CineTrekker"
        description="Print-friendly movie and TV watchlist view from your CineTrekker account."
        canonical="https://cinetrekker.vercel.app/print-watchlist"
      />
      <div className="min-h-screen bg-white text-black p-8 print:p-4">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 print:mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 print:text-3xl">My Watchlist</h1>
            <p className="text-gray-600">
              Generated on {new Date().toLocaleDateString()} • {watchlist.length} items
            </p>
          </div>
          <Button onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Movies Section */}
        {moviesList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2 print:text-xl">
              Movies ({moviesList.length})
            </h2>
            <div className="space-y-3">
              {moviesList.map((movie, index) => (
                <div key={movie.id} className="flex gap-4 border-b border-gray-200 pb-2">
                  <span className="font-bold text-gray-400">{index + 1}.</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {movie.title} {movie.release_date && `(${movie.release_date.split('-')[0]})`}
                    </h3>
                    {movie.runtime && (
                      <span className="text-sm text-gray-600">{movie.runtime} min</span>
                    )}
                    {movie.vote_average && movie.vote_average > 0 && (
                      <span className="text-sm text-gray-600 ml-3">★ {movie.vote_average.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="w-12 h-4 border border-gray-300" title="Check when watched" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TV Shows Section */}
        {tvList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2 print:text-xl">
              TV Shows ({tvList.length})
            </h2>
            <div className="space-y-3">
              {tvList.map((show, index) => (
                <div key={show.id} className="flex gap-4 border-b border-gray-200 pb-2">
                  <span className="font-bold text-gray-400">{index + 1}.</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {show.name} {show.first_air_date && `(${show.first_air_date.split('-')[0]})`}
                    </h3>
                    {show.number_of_seasons && (
                      <span className="text-sm text-gray-600">
                        {show.number_of_seasons} season{show.number_of_seasons > 1 ? 's' : ''}
                      </span>
                    )}
                    {show.vote_average && show.vote_average > 0 && (
                      <span className="text-sm text-gray-600 ml-3">★ {show.vote_average.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="w-12 h-4 border border-gray-300" title="Check when watched" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>CineTrekker • Your Personal Movie & TV Tracker</p>
          <p className="mt-1">https://cinetrekker.vercel.app</p>
        </div>
        </div>
      </div>
    </>
  );
}
