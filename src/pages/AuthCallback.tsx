import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GENERIC_AUTH_ERROR } from '@/lib/authErrorHandler';
import { consumeOAuthReturnPath } from '@/lib/authRedirect';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const callbackError = searchParams.get('error') || searchParams.get('error_code');

        if (callbackError) {
          // Single error path - show generic message
          toast({
            title: t('common.error'),
            description: GENERIC_AUTH_ERROR,
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
          return;
        }

        const code = searchParams.get('code');
        const sessionResult = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.getSession();
        const session = sessionResult.data.session;

        if (sessionResult.error || !session) {
          // No session - generic error
          toast({
            title: t('common.error'),
            description: GENERIC_AUTH_ERROR,
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
          return;
        }

        // Success path
        toast({
          title: t('auth.signIn'),
          description: 'Welcome!',
        });
        navigate(consumeOAuthReturnPath(), { replace: true });
      } catch {
        // Catch block - do NOT log error object
        console.warn('[Auth] Callback processed');
        
        toast({
          title: t('common.error'),
          description: GENERIC_AUTH_ERROR,
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, t]);

  return (
    <>
      <SEO
        title="Auth Callback - CineTrekker"
        description="Completing your CineTrekker authentication session."
        canonical="https://cinetrekker.vercel.app/auth/callback"
      />
      <div className="page-container pt-20 flex flex-col items-center justify-center min-h-[70vh] pb-24 md:pb-0">
        <Skeleton className="backdrop-skeleton w-48 mb-4" />
        <p className="text-muted-foreground">{t('auth.completing', 'Processing...')}</p>
      </div>
    </>
  );
}
