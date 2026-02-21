import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Security: Protected Route Component
 *
 * This component guards routes that require authentication.
 * Unauthenticated users are redirected to /.
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

  // Redirect home if not logged in
  if (!user) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  // Require verified email for protected routes
  if (!user.email_confirmed_at) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
