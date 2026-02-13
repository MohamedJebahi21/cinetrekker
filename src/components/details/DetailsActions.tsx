import React from 'react';
import { Bookmark, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';

type Props = {
  inWatchlist: boolean;
  watched: boolean;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onShare: () => void;
};

export default function DetailsActions({ inWatchlist, watched, onToggleWatchlist, onToggleWatched, onShare }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const primary = 'bg-red-600 text-white hover:bg-red-700';
  const secondary = 'bg-background/5 border border-border text-foreground hover:bg-background/10';

  // Mobile sticky footer
  if (isMobile) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] w-[94%]">
        <div className="rounded-xl backdrop-blur-md bg-black/60 p-3 flex items-center gap-3">
          <Button className={`${primary} flex-1`} onClick={onToggleWatchlist}>
            <Bookmark className="w-4 h-4 mr-2" />{inWatchlist ? t('actions.inWatchlist') : t('actions.watchlist')}
          </Button>
          <Button className={`${secondary} flex-1`} onClick={onToggleWatched}>
            <Check className="w-4 h-4 mr-2" />{watched ? t('actions.watched') : t('actions.mark')}
          </Button>
          <Button variant="ghost" onClick={onShare} className="p-2">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button className={`${primary} gap-2`} onClick={onToggleWatchlist}>
        <Bookmark className="w-4 h-4" /> {inWatchlist ? t('actions.inWatchlist') : t('actions.addToWatchlist')}
      </Button>
      <Button className={`${secondary} gap-2`} onClick={onToggleWatched}>
        <Check className="w-4 h-4" /> {watched ? t('actions.watched') : t('actions.markAsWatched')}
      </Button>
      <Button variant="ghost" onClick={onShare} className="gap-2">
        <Share2 className="w-4 h-4" /> {t('actions.share')}
      </Button>
    </div>
  );
}
