import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchMulti, searchMovies, searchTV, searchPeople } from '@/services/tmdb';
import { RequestCanceller, RequestThrottler } from '@/lib/requestUtils';
import { Media, PersonSearchResult, TMDBResponse } from '@/types/media';
import { validateSearchQuery } from '@/lib/validation';
import { useDebounce } from '@/hooks/useDebounce';

const canceller = new RequestCanceller();
const searchThrottler = new RequestThrottler(1000); // 1 request per second

type SearchType = 'all' | 'movie' | 'tv' | 'person';

interface UseSearchOptions {
  debounceMs?: number; // Recommended: 500ms for production (bot protection)
  enabled?: boolean;
}

/**
 * Hook for searching with debounce and request cancellation
 * Default debounce: 500ms (increased from 300ms for better bot protection)
 */
export function useSearch(
  query: string,
  type: SearchType = 'all',
  page: number = 1,
  language: string = 'en',
  options: UseSearchOptions = {}
) {
  const { debounceMs = 300, enabled = true } = options;
  const debouncedQuery = useDebounce(query, debounceMs).trim();

  // Create search function based on type
  const searchFn = async (): Promise<TMDBResponse<Media | PersonSearchResult>> => {
    // Validate search query
    const validatedQuery = validateSearchQuery(debouncedQuery);
    
    // Rate limit check
    if (!searchThrottler.canMakeRequest('search')) {
      throw new Error('Too many requests. Please slow down.');
    }
    searchThrottler.recordRequest('search');
    
    const signal = canceller.getAbortController(`search-${type}-${debouncedQuery}-${page}`).signal;

    try {
      switch (type) {
        case 'movie':
          return await searchMovies(validatedQuery, page, language);
        case 'tv':
          return await searchTV(validatedQuery, page, language);
        case 'person':
          return await searchPeople(validatedQuery, page, language);
        case 'all':
        default:
          return await searchMulti(validatedQuery, page, language);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, don't throw
        return { results: [], total_pages: 0, total_results: 0, page: 1 };
      }
      throw error;
    }
  };

  const result = useQuery({
    queryKey: ['search', type, debouncedQuery, page, language],
    queryFn: searchFn,
    enabled: enabled && debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      canceller.cancelAll();
    };
  }, []);

  return result;
}

/**
 * Hook for multi-type search with all results
 */
export function useMultiSearch(
  query: string,
  page: number = 1,
  language: string = 'en',
  options: UseSearchOptions = {}
) {
  return useSearch(query, 'all', page, language, options);
}

/**
 * Hook for movie search
 */
export function useMovieSearch(
  query: string,
  page: number = 1,
  language: string = 'en',
  options: UseSearchOptions = {}
) {
  return useSearch(query, 'movie', page, language, options);
}

/**
 * Hook for TV search
 */
export function useTVSearch(
  query: string,
  page: number = 1,
  language: string = 'en',
  options: UseSearchOptions = {}
) {
  return useSearch(query, 'tv', page, language, options);
}

/**
 * Hook for people/actor search
 */
export function usePeopleSearch(
  query: string,
  page: number = 1,
  language: string = 'en',
  options: UseSearchOptions = {}
) {
  return useSearch(query, 'person', page, language, options);
}
