import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Security: Protected Route Component
 *
 * This component guards routes that require authentication.
 * Unauthenticated users are redirected to /login with a return URL.
 */

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Skeleton className="w-20 h-28 rounded-lg" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

/**
 * Hook to check if user is authenticated
 * Useful for conditional rendering in components
 */
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
