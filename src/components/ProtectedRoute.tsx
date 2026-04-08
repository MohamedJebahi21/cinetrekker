import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Security: Protected Route Component
 *
 * This component guards routes that require authentication.
 * Unauthenticated users are redirected to /login.
 */

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setHasTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasTimedOut(true);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  // Show loading state while checking auth
  if (loading && !hasTimedOut) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Skeleton className="w-20 h-28 rounded-lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          authMessage: hasTimedOut
            ? 'Your session check took too long. Please sign in to continue.'
            : 'Please sign in to access this page.',
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}
