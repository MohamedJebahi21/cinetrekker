import { useQuery } from '@tanstack/react-query';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { getWatchProviders } from '@/services/justwatch';

export function useMovieDetails(mediaId?: number, mediaType: 'movie' | 'tv' = 'movie', language = 'en') {
  const enabled = !!mediaId;

  const detailsQuery = useQuery({
    queryKey: ['details', mediaType, mediaId, language],
    queryFn: async () => {
      if (!mediaId) return null;
      return mediaType === 'movie' ? await getMovieDetails(mediaId, language) : await getTVDetails(mediaId, language);
    },
    enabled,
    retry: 1,
  });

  const jwQuery = useQuery({
    queryKey: ['justwatch', detailsQuery.data?.title, detailsQuery.data?.release_date, 'US'],
    queryFn: () => getWatchProviders(detailsQuery.data?.title || '', detailsQuery.data?.release_date ? new Date(detailsQuery.data.release_date).getFullYear() : undefined, 'US'),
    enabled: !!detailsQuery.data?.title && !import.meta.env.DEV,
    staleTime: 1000 * 60 * 60,
    retry: 0,
  });

  return {
    details: detailsQuery.data,
    isLoading: detailsQuery.isLoading,
    isError: detailsQuery.isError,
    error: detailsQuery.error,
    jwProviders: jwQuery.data || [],
    jwLoading: jwQuery.isLoading,
  };
}
