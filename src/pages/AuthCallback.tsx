import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GENERIC_SIGNIN_ERROR_MESSAGE } from '@/lib/authErrorHandler';

/**
 * OAuth Callback Handler
 * 
 * Handles the redirect from OAuth providers (Google, etc.)
 * Processes the authentication tokens and redirects to home
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          throw new Error(errorDescription || error);
        }

        // Supabase automatically handles the OAuth callback
        // We just need to wait for the session to be established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          toast({
            title: t('auth.signIn', 'Sign In'),
            description: 'Welcome back!',
          });
          
          // Redirect to home after successful authentication
          navigate('/', { replace: true });
        } else {
          // No session found, redirect to auth page
          throw new Error('No session established');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast({
          title: t('common.error', 'Error'),
          description: GENERIC_SIGNIN_ERROR_MESSAGE,
          variant: 'destructive',
        });
        
        // Redirect to login on error
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, t]);

  return (
    <div className="page-container pt-20 flex flex-col items-center justify-center min-h-[70vh] pb-24 md:pb-0">
      <Skeleton className="backdrop-skeleton w-48 mb-4" />
      <p className="text-muted-foreground">{t('auth.completing', 'Completing sign in...')}</p>
    </div>
  );
}
