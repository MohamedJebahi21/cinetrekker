import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLastViewed } from '@/hooks/useLastViewed';
import { getRecommendations } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { Button } from '@/components/ui/button';

export function BecauseYouLiked() {
  const { t, i18n } = useTranslation();
  const { lastViewed } = useLastViewed();
  const language = i18n.language;

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['because-you-liked', lastViewed?.id, lastViewed?.mediaType, language],
    queryFn: () => getRecommendations(lastViewed!.mediaType, lastViewed!.id, language),
    enabled: !!lastViewed,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't render if no last viewed item or no recommendations
  if (!lastViewed || (!isLoading && (!recommendations?.results || recommendations.results.length === 0))) {
    return null;
  }

  // Filter to ensure content consistency: movies recommend movies, TV recommends TV
  const filteredResults = recommendations?.results
    ?.filter(item => {
      // TMDB recommendations endpoint returns same type, but double-check
      const itemType = item.media_type || lastViewed.mediaType;
      return itemType === lastViewed.mediaType;
    })
    .slice(0, 12) || [];

  if (!isLoading && filteredResults.length === 0) {
    return null;
  }

  return (
    <section className="animate-fade-in section-after-hero">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title-responsive font-bold title-display">
          {t('home.becauseYouLiked', { title: lastViewed.title })}
        </h2>
        <Link to={`/${lastViewed.mediaType}/${lastViewed.id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            {t('common.seeAll')}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="scroll-row">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[140px] md:w-[160px]">
              <MediaCardSkeleton />
            </div>
          ))
        ) : (
          filteredResults.map((item) => (
            <div 
              key={`${item.id}-${item.media_type}`} 
              className="w-[140px] md:w-[160px]"
            >
              <MediaCard 
                media={{ ...item, media_type: lastViewed.mediaType }} 
                showType={false}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}