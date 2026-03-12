import { useQuery } from '@tanstack/react-query';
import { getWatchProviders } from '@/services/tmdb';

export const useWatchProviders = (mediaType: 'movie' | 'tv', id: number, country?: string) => {
  const region = country || (typeof navigator !== 'undefined' ? (navigator.language && navigator.language.includes('-') ? navigator.language.split('-')[1] : 'US') : 'US');
  return useQuery({
    queryKey: ['watchProviders', mediaType, id, region],
    queryFn: async () => {
      const res = await getWatchProviders(mediaType, id);
      // TMDB returns an object with `results` keyed by country code
      return res.results ? res.results[region] || null : null;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1,
  });
};

export default useWatchProviders;
