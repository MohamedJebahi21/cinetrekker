import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTopRatedMovies, getTopRatedTV } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { cn } from "../lib/utils";

interface RandomTrekButtonProps {
  className?: string;
  variant?: 'default' | 'hero';
}

export function RandomTrekButton({ className, variant = 'default' }: RandomTrekButtonProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: topMovies } = useQuery({
    queryKey: ['top-rated-movies', language],
    queryFn: () => getTopRatedMovies(1, language),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const { data: topTV } = useQuery({
    queryKey: ['top-rated-tv', language],
    queryFn: () => getTopRatedTV(1, language),
    staleTime: 1000 * 60 * 10,
  });

  const handleRandomTrek = () => {
    // Combine top rated movies and TV shows
    const allMedia: Media[] = [
      ...(topMovies?.results || []).map(m => ({ ...m, media_type: 'movie' as const })),
      ...(topTV?.results || []).map(s => ({ ...s, media_type: 'tv' as const })),
    ].filter(item => item.vote_average >= 7.5); // Only highly rated

    if (allMedia.length === 0) return;

    // Animate the button
    setIsAnimating(true);
    
    // Simulate "shuffling" effect
    let shuffleCount = 0;
    let lastSelected: Media | null = null;
    const shuffleInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * allMedia.length);
      lastSelected = allMedia[randomIndex];
      setSelectedMedia(lastSelected);
      shuffleCount++;

      if (shuffleCount >= 8) {
        clearInterval(shuffleInterval);
        setIsAnimating(false);
        // Navigate to selected media details page instead of opening preview modal
        if (lastSelected) {
          const mediaType = lastSelected.media_type === 'tv' ? 'tv' : 'movie';
          navigate(`/${mediaType}/${lastSelected.id}`);
        }
      }
    }, 100);
  };

  if (variant === 'hero') {
    return (
      <>
        <Button
          size="lg"
          onClick={handleRandomTrek}
          disabled={isAnimating}
          className={cn(
            "gap-3 text-base font-semibold px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "shadow-[0_0_30px_hsl(358_81%_47%/0.3)] hover:shadow-[0_0_40px_hsl(358_81%_47%/0.5)]",
            "transition-all duration-300",
            isAnimating && "animate-pulse",
            className
          )}
        >
          {isAnimating ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : (
            <Shuffle className="w-5 h-5" />
          )}
          {t('randomTrek.button') || 'Random Trek'}
        </Button>

        {/* Media preview removed; navigates to details */}
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleRandomTrek}
        disabled={isAnimating}
        className={cn(
          "gap-2 border-primary/30 hover:border-primary hover:bg-primary/10",
          isAnimating && "animate-pulse",
          className
        )}
      >
        {isAnimating ? (
          <Sparkles className="w-4 h-4 animate-spin" />
        ) : (
          <Shuffle className="w-4 h-4" />
        )}
        {t('randomTrek.button') || 'Random Trek'}
      </Button>

      {/* Media preview removed; navigates to details */}
    </>
  );
}