import { useQuery } from '@tanstack/react-query';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';

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

  return {
    details: detailsQuery.data,
    isLoading: detailsQuery.isLoading,
    isError: detailsQuery.isError,
    error: detailsQuery.error,
    jwProviders: [],
    jwLoading: false,
  };
}
