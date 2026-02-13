import { QueryClient, QueryCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Configured QueryClient instance for the application
 * 
 * Configuration:
 * - staleTime: 5 minutes - Prevents redundant refetching of fresh data
 * - retry: 1 - Single retry on failure for better reliability without excessive retries
 * - retryDelay: Exponential backoff starting at 1s, max 30s
 * - refetchOnWindowFocus: false - Reduces unnecessary network requests
 * - QueryCache onError: Shows user-friendly toast notifications for failed API calls
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast for errors that aren't silenced by the query
      if (query.meta?.errorToast !== false) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        
        // Don't show toast for authentication errors (handled by auth flow)
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          return;
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, max 30s
      refetchOnWindowFocus: false,
    },
  },
});
