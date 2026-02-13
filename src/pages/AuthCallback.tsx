import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
            description: `Welcome ${session.user.email}!`,
          });
          
          // Redirect to home after successful authentication
          navigate('/', { replace: true });
        } else {
          // No session found, redirect to auth page
          throw new Error('No session established');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to complete sign in';
        console.error('OAuth callback error:', error);
        toast({
          title: t('common.error', 'Error'),
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Redirect to login on error
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, t]);

  return (
    <div className="page-container pt-20 flex flex-col items-center justify-center min-h-[70vh]">
      <Skeleton className="backdrop-skeleton w-48 mb-4" />
      <p className="text-muted-foreground">{t('auth.completing', 'Completing sign in...')}</p>
    </div>
  );
}
