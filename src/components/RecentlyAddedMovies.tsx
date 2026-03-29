import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Calendar } from 'lucide-react';
import { getNowPlayingMovies, getAiringTodayTV, getImageUrl, getMediaTitle } from '@/services/tmdb';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image } from '@/components/ui/Image';
import { useContentPolicy } from '@/contexts/content-policy-context';
import { applySafetyFilter } from '@/lib/contentFilter';
import { MediaCarouselEnhanced } from './MediaCarouselEnhanced';

export function RecentlyAddedMovies() {
  const [tab, setTab] = useState<'movie' | 'tv'>('movie');
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;


  // Fetch both movies and TV series airing today
  const { data: moviesData, isLoading: loadingMovies } = useQuery({
    queryKey: ['nowPlaying', language, includeAdult],
    queryFn: () => getNowPlayingMovies(1, language, includeAdult),
  });
  const { data: tvData, isLoading: loadingTV } = useQuery({
    queryKey: ['airingTodayTV', language, includeAdult],
    queryFn: () => getAiringTodayTV(1, language, includeAdult),
  });

  // Filter by tab
  const movies = applySafetyFilter(moviesData?.results || [], strictFiltering, moderateFiltering).slice(0, 12);
  const tv = applySafetyFilter(tvData?.results || [], strictFiltering, moderateFiltering).slice(0, 12);
  const items = tab === 'movie' ? movies : tv;
  const isLoading = loadingMovies || loadingTV;
  if (!isLoading && items.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{t('home.recentMovies')}</h2>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            className={`px-6 py-2 font-semibold transition-colors ${tab === 'movie' ? 'bg-red-600 text-white' : 'bg-black text-white/80'}`}
            onClick={() => setTab('movie')}
          >
            Movies
          </button>
          <button
            className={`px-6 py-2 font-semibold transition-colors ${tab === 'tv' ? 'bg-red-600 text-white' : 'bg-black text-white/80'}`}
            onClick={() => setTab('tv')}
          >
            TV Shows
          </button>
        </div>
      </div>
      <MediaCarouselEnhanced
        title={tab === 'movie' ? t('home.recentMovies') : t('home.recentTV')}
        items={items}
        loading={isLoading}
      />
    </>
  );
}

