import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS } from '@/contexts/user-lists-context';
import User from 'lucide-react/dist/esm/icons/user';

export default function GuestSyncBanner() {
  const { t } = useTranslation();
  const [hasLocal, setHasLocal] = useState(false);

  useEffect(() => {
    try {
      const w = localStorage.getItem(STORAGE_KEYS.watchlist);
      const wa = localStorage.getItem(STORAGE_KEYS.watched);
      setHasLocal(Boolean((w && w !== '[]') || (wa && wa !== '[]')));
    } catch (e) {
      setHasLocal(false);
    }
  }, []);

  if (!hasLocal) return null;

  return (
    <div className="bg-yellow-50 border-t border-yellow-200 text-yellow-800 py-2">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5" />
          <div className="text-sm">
            {t('guest.localSyncMessage', 'You are using a local watchlist. Sign in to sync across devices.')}
          </div>
        </div>
        <div>
          <Link to="/login">
            <Button size="sm" variant="default" className="gap-2">
              {t('nav.signIn', 'Sign in')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
