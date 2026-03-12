import { QueryClient, QueryCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Configured QueryClient instance for the application
 * 
 * Configuration:
 * - staleTime: 5 minutes - Prevents redundant refetching of fresh data
 * - retry: Conditional - No retry for auth errors, 1 retry for others
 * - retryDelay: Exponential backoff starting at 1s, max 30s
 * - refetchOnWindowFocus: false - Reduces unnecessary network requests
 * - Circuit Breaker: Stops retries after 3 consecutive auth failures
 * - QueryCache onError: Shows user-friendly toast notifications for failed API calls
 */

// Circuit breaker for authentication errors
let authErrorCount = 0;
const MAX_AUTH_ERRORS = 3;
let circuitBreakerActive = false;

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Circuit breaker: Track consecutive auth failures
      if (errorMessage.includes('AUTHENTICATION_ERROR') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        authErrorCount++;
        
        if (authErrorCount >= MAX_AUTH_ERRORS && !circuitBreakerActive) {
          circuitBreakerActive = true;
          console.error('🚨 Circuit breaker activated: Too many authentication failures');
          toast({
            title: 'Configuration Error',
            description: 'API authentication failed. Please check your configuration or contact support.',
            variant: 'destructive',
          });
        }
        return; // Don't show toast for individual auth errors
      }
      
      // Reset counter on successful non-auth requests
      authErrorCount = 0;
      circuitBreakerActive = false;

      // Only show toast for errors that aren't silenced by the query
      if (query.meta?.errorToast !== false) {
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
      gcTime: 1000 * 60 * 15, // Keep cached data around for quick back/forward navigation
      retry: (failureCount, error) => {
        // Circuit breaker: Stop all retries if activated
        if (circuitBreakerActive) {
          return false;
        }
        
        // Don't retry authentication errors
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('AUTHENTICATION_ERROR') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          return false;
        }
        
        // Single retry for other errors
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, max 30s
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});
