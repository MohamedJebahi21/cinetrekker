import { useAuth } from '@/contexts/AuthContext';

export function useIsAuthenticated(): {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !!user,
    isLoading: loading,
  };
}
