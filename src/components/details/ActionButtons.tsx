import React from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, Check, Share2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';

type Props = {
  inWatchlist?: boolean;
  watched?: boolean;
  onAddToWatchlist?: () => void;
  onMarkAsWatched?: () => void;
  onShare?: () => void;
};

export default function ActionButtons({ inWatchlist, watched, onAddToWatchlist, onMarkAsWatched, onShare }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const watchlistClass = inWatchlist
    ? "bg-red-600 border border-red-500/70 text-white hover:bg-red-700"
    : "bg-background/10 border border-border text-foreground hover:bg-background/20";
  const watchedClass = watched
    ? "bg-emerald-600 border border-emerald-500/70 text-white hover:bg-emerald-700"
    : "bg-background/10 border border-border text-foreground hover:bg-background/20";

  // Mobile: fixed bottom sheet / FAB
  if (isMobile) {
    return (
      <div className="mobile-nav-safe fixed bottom-0 left-1/2 z-50 w-[min(96%,30rem)] -translate-x-1/2 px-1 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/96 p-3 shadow-[0_-10px_28px_rgba(0,0,0,0.18)]">
          <Button size="sm" onClick={onAddToWatchlist} className={`w-full min-h-11 ${watchlistClass}`}>
            <Bookmark className="w-4 h-4 mr-2" />{t('details.watchlist', 'Watchlist')}
          </Button>
          <Button size="sm" onClick={onMarkAsWatched} className={`w-full min-h-11 ${watchedClass}`}>
            <Check className="w-4 h-4 mr-2" />{t('details.watched', 'Watched')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onShare} className="w-full min-h-11 justify-center">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onAddToWatchlist} className={`${watchlistClass} gap-2`}>
        <Bookmark className="w-4 h-4" />{t('details.watchlist', 'Watchlist')}
      </Button>
      <Button onClick={onMarkAsWatched} className={`${watchedClass} gap-2`}>
        <Check className="w-4 h-4" />{t('details.watched', 'Watched')}
      </Button>
      <Button variant="ghost" onClick={onShare} className="gap-2">
        <Share2 className="w-4 h-4" />{t('actions.share')}
      </Button>
    </div>
  );
}
