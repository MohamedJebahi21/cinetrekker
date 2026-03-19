import React from 'react';
import { Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUserLists } from '@/contexts/UserListsContext';
import { UserMediaItem } from '@/types/media';
import { useToast } from '@/hooks/use-toast';

interface RandomPickerProps {
  source: 'watchlist' | 'watched' | 'trending';
  mediaType?: 'all' | 'movie' | 'tv';
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function RandomPicker({
  source,
  mediaType = 'all',
  label = 'Random Pick',
  variant = 'outline',
  size = 'default',
  className,
}: RandomPickerProps) {
  const { watchlist, watched } = useUserLists();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRandomPick = () => {
    let items: UserMediaItem[] = [];

    if (source === 'watchlist') {
      items = mediaType === 'all' ? watchlist : watchlist.filter((i) => i.mediaType === mediaType);
    } else if (source === 'watched') {
      items = mediaType === 'all' ? watched : watched.filter((i) => i.mediaType === mediaType);
    }

    if (items.length === 0) {
      toast({
        title: 'Selection unavailable',
        description: `Your ${source} is empty!`,
        variant: 'destructive',
      });
      return;
    }

    const randomItem = items[Math.floor(Math.random() * items.length)];
    navigate(`/${randomItem.mediaType}/${randomItem.mediaId}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRandomPick}
      className={className}
    >
      <Shuffle className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
