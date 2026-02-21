import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GENERIC_AUTH_ERROR } from '@/lib/authErrorHandler';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');

        if (error) {
          // Single error path - show generic message
          toast({
            title: t('common.error'),
            description: GENERIC_AUTH_ERROR,
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
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
        navigate('/', { replace: true });
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
    <div className="page-container pt-20 flex flex-col items-center justify-center min-h-[70vh] pb-24 md:pb-0">
      <Skeleton className="backdrop-skeleton w-48 mb-4" />
      <p className="text-muted-foreground">{t('auth.completing', 'Processing...')}</p>
    </div>
  );
}
