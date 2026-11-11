import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, UserCheck, Sparkles } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';

const GUEST_SYNC_GUIDANCE_KEY = 'cinetrekker_guest_sync_guidance_seen';
const GUEST_SYNC_DISMISSED_KEY = 'cinetrekker_guest_sync_banner_dismissed';

export default function GuestSyncBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched } = useUserLists();
  const [hasSeenGuidance, setHasSeenGuidance] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const hasLocal = !user && (watchlist.length > 0 || watched.length > 0);

  useEffect(() => {
    if (!hasLocal || typeof window === 'undefined') return;

    const dismissed = window.sessionStorage.getItem(GUEST_SYNC_DISMISSED_KEY) === 'true';
    setIsDismissed(dismissed);

    const seen = window.localStorage.getItem(GUEST_SYNC_GUIDANCE_KEY) === 'true';
    setHasSeenGuidance(seen);
    if (!seen) {
      window.localStorage.setItem(GUEST_SYNC_GUIDANCE_KEY, 'true');
    }
  }, [hasLocal]);

  if (!hasLocal || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(GUEST_SYNC_DISMISSED_KEY, 'true');
    }
  };

  if (hasSeenGuidance) {
    return (
      <aside
        className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-3.5 text-foreground shadow-sm backdrop-blur-sm transition-all sm:flex-row sm:items-center sm:justify-between"
        aria-label={t('guest.syncStatus', 'Guest watchlist status')}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t('guest.localSyncCompact', 'Your lists are saved on this device. Create an account whenever you want to sync them everywhere.')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" className="h-8 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/signup">{t('guest.createAccount', 'Create free account')}</Link>
          </Button>
          <button
            onClick={handleDismiss}
            aria-label={t('common.close', 'Dismiss')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="relative mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm sm:p-5"
      aria-label={t('guest.syncStatus', 'Guest watchlist status')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {t('guest.mode', 'Guest Mode')}
              </span>
            </div>
            <p className="mt-1 font-semibold text-foreground text-sm sm:text-base tracking-tight">
              {t('guest.localSyncMessage', 'Your watchlist and watched history are saved only on this device right now.')}
            </p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground sm:text-sm leading-relaxed">
              {t('guest.localSyncSubcopy', 'Create a free account before you leave this browser if you want your progress, notes, and lists to persist everywhere.')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent/60 hover:text-foreground">
            <Link to="/login">{t('nav.signIn', 'Sign in')}</Link>
          </Button>
          <Button asChild size="sm" className="h-9 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/signup">{t('guest.createAccount', 'Create free account')}</Link>
          </Button>
          <button
            onClick={handleDismiss}
            aria-label={t('common.close', 'Dismiss')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
