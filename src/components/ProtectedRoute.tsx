import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Security: Protected Route Component
 * 
 * This component guards routes that require authentication.
 * It checks:
 * 1. User is authenticated
 * 2. Email is verified (if requireEmailVerification is true)
 * 
 * Unauthenticated users are redirected to /auth with a return URL.
 * Unverified users see a verification prompt.
 */

interface ProtectedRouteProps {
  children: ReactNode;
  /** 
   * Whether to require email verification before allowing access.
   * Default: true (recommended for security)
   */
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireEmailVerification = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Check email verification if required
  if (requireEmailVerification && !user.email_confirmed_at) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Email Verification Required</h2>
          <p className="text-muted-foreground">
            Please check your email and click the verification link to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Didn't receive an email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if user is authenticated
 * Useful for conditional rendering in components
 */
export function useIsAuthenticated(): { 
  isAuthenticated: boolean; 
  isVerified: boolean; 
  isLoading: boolean;
} {
  const { user, loading } = useAuth();
  
  return {
    isAuthenticated: !!user,
    isVerified: !!user?.email_confirmed_at,
    isLoading: loading,
  };
}
