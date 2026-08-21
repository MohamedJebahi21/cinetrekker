import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import User from 'lucide-react/dist/esm/icons/user';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';

const GUEST_SYNC_GUIDANCE_KEY = 'cinetrekker_guest_sync_guidance_seen';

export default function GuestSyncBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched } = useUserLists();
  const [hasSeenGuidance, setHasSeenGuidance] = useState(false);
  const hasLocal = !user && (watchlist.length > 0 || watched.length > 0);

  useEffect(() => {
    if (!hasLocal || typeof window === 'undefined') return;

    const seen = window.localStorage.getItem(GUEST_SYNC_GUIDANCE_KEY) === 'true';
    setHasSeenGuidance(seen);
    if (!seen) {
      window.localStorage.setItem(GUEST_SYNC_GUIDANCE_KEY, 'true');
    }
  }, [hasLocal]);

  if (!hasLocal) return null;

  if (hasSeenGuidance) {
    return (
      <aside className="mb-5 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/[0.07] p-3.5 text-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label={t('guest.syncStatus', 'Guest watchlist status')}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm leading-5 text-muted-foreground">
            {t('guest.localSyncCompact', 'Your lists are saved on this device. Create an account whenever you want to sync them everywhere.')}
          </p>
        </div>
        <Button asChild size="sm" className="h-10 shrink-0">
          <Link to="/signup">{t('guest.createAccount', 'Create free account')}</Link>
        </Button>
      </aside>
    );
  }

  return (
    <aside className="mb-6 rounded-3xl border border-primary/20 bg-[linear-gradient(135deg,hsla(var(--primary)/0.14),hsla(var(--card)/0.9))] p-4 text-foreground shadow-[0_18px_45px_rgba(0,0,0,0.12)]" aria-label={t('guest.syncStatus', 'Guest watchlist status')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t('guest.mode', 'Guest Mode')}
            </p>
            <p className="font-medium text-foreground">
              {t('guest.localSyncMessage', 'Your watchlist and watched history are saved only on this device right now.')}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t('guest.localSyncSubcopy', 'Create a free account before you leave this browser if you want your progress, notes, and lists to persist everywhere.')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/login">{t('nav.signIn', 'Sign in')}</Link>
          </Button>
          <Button asChild size="sm" variant="default" className="gap-2">
            <Link to="/signup">{t('guest.createAccount', 'Create free account')}</Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
