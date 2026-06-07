import { QueryClient } from '@tanstack/react-query';

/**
 * Configured QueryClient instance for the application
 * 
 * Configuration:
 * - staleTime: 5 minutes - Prevents redundant refetching of fresh data
 * - retry: 1 - Single retry on failure for better reliability without excessive retries
 * - refetchOnWindowFocus: false - Reduces unnecessary network requests
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
