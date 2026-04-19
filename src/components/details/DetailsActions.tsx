import React from 'react';
import { Bookmark, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';

type Props = {
  inWatchlist: boolean;
  watched: boolean;
  onToggleWatchlist: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleWatched: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onShare: (event?: React.MouseEvent<HTMLButtonElement>) => void;
};

export default function DetailsActions({ inWatchlist, watched, onToggleWatchlist, onToggleWatched, onShare }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const watchlistClass = inWatchlist
    ? 'bg-red-600 border border-red-500/70 text-white hover:bg-red-700'
    : 'bg-background/5 border border-border text-foreground hover:bg-background/10';
  const watchedClass = watched
    ? 'bg-emerald-600 border border-emerald-500/70 text-white hover:bg-emerald-700'
    : 'bg-background/5 border border-border text-foreground hover:bg-background/10';

  // Mobile sticky footer
  if (isMobile) {
    return (
      <div className="mobile-nav-safe fixed bottom-0 left-1/2 z-[100] w-[min(96%,30rem)] -translate-x-1/2 px-1 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/96 p-3 shadow-[0_-10px_28px_rgba(0,0,0,0.18)]">
          <Button
            type="button"
            className={`${watchlistClass} w-full min-h-11`}
            onClick={(event) => onToggleWatchlist(event)}
          >
            <Bookmark className="w-4 h-4 mr-2" />{t('details.watchlist', 'Watchlist')}
          </Button>
          <Button
            type="button"
            className={`${watchedClass} w-full min-h-11`}
            onClick={(event) => onToggleWatched(event)}
          >
            <Check className="w-4 h-4 mr-2" />{t('details.watched', 'Watched')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => onShare(event)}
            className="w-full min-h-11 justify-center"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        className={`${watchlistClass} gap-2`}
        onClick={(event) => onToggleWatchlist(event)}
      >
        <Bookmark className="w-4 h-4" /> {t('details.watchlist', 'Watchlist')}
      </Button>
      <Button
        type="button"
        className={`${watchedClass} gap-2`}
        onClick={(event) => onToggleWatched(event)}
      >
        <Check className="w-4 h-4" /> {t('details.watched', 'Watched')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={(event) => onShare(event)}
        className="gap-2"
      >
        <Share2 className="w-4 h-4" /> {t('actions.share')}
      </Button>
    </div>
  );
}
