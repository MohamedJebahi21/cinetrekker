import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import User from 'lucide-react/dist/esm/icons/user';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';

export default function GuestSyncBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched } = useUserLists();
  const hasLocal = !user && (watchlist.length > 0 || watched.length > 0);

  if (!hasLocal) return null;

  return (
    <div className="mb-6 rounded-3xl border border-primary/20 bg-[linear-gradient(135deg,hsla(var(--primary)/0.14),hsla(var(--card)/0.9))] p-4 text-foreground shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary">
            <User className="h-5 w-5" />
          </span>
          <div className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
              Guest Mode
            </p>
            <p className="font-medium text-foreground">
              {t('guest.localSyncMessage', "Your watchlist and watched history are saved only on this device right now.")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t('guest.localSyncSubcopy', "Create a free account before you leave this browser if you want your progress, notes, and lists to persist everywhere.")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/login">
            <Button size="sm" variant="outline" className="gap-2">
              {t('nav.signIn', 'Sign in')}
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" variant="default" className="gap-2">
              {t('guest.createAccount', 'Create free account')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
