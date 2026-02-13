import React from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, Check, Share2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type Props = {
  inWatchlist?: boolean;
  watched?: boolean;
  onAddToWatchlist?: () => void;
  onMarkAsWatched?: () => void;
  onShare?: () => void;
};

export default function ActionButtons({ inWatchlist, watched, onAddToWatchlist, onMarkAsWatched, onShare }: Props) {
  const isMobile = useIsMobile();

  const mainClass = "bg-red-600 text-white hover:bg-red-700";
  const secondaryClass = "bg-background/10 border border-border text-foreground hover:bg-background/20";

  // Mobile: fixed bottom sheet / FAB
  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[92%]">
        <div className="rounded-xl backdrop-blur-md bg-black/60 p-3 flex items-center justify-between gap-3">
          <Button size="sm" onClick={onAddToWatchlist} className={`flex-1 ${mainClass}`}>
            <Bookmark className="w-4 h-4 mr-2" />{inWatchlist ? 'In Watchlist' : 'Watchlist'}
          </Button>
          <Button size="sm" onClick={onMarkAsWatched} className={`flex-1 ${secondaryClass}`}>
            <Check className="w-4 h-4 mr-2" />{watched ? 'Watched' : 'Mark'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onShare} className="px-3">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onAddToWatchlist} className={`${mainClass} gap-2`}>
        <Bookmark className="w-4 h-4" />{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
      </Button>
      <Button onClick={onMarkAsWatched} className={`${secondaryClass} gap-2`}>
        <Check className="w-4 h-4" />{watched ? 'Watched' : 'Mark as Watched'}
      </Button>
      <Button variant="ghost" onClick={onShare} className="gap-2">
        <Share2 className="w-4 h-4" />Share
      </Button>
    </div>
  );
}
