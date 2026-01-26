import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLastViewed } from '@/hooks/useLastViewed';
import { useUserLists } from '@/contexts/UserListsContext';
import { getRecommendations, getSimilar } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { Button } from '@/components/ui/button';
import { Media } from '@/types/media';

export function BecauseYouLiked() {
  const { t, i18n } = useTranslation();
  const { lastViewedList, lastViewed } = useLastViewed();
  const { watched } = useUserLists();
  const language = i18n.language;

  // Create a set of watched IDs for filtering
  const watchedIds = new Set(watched.map(w => `${w.mediaType}-${w.mediaId}`));

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['because-you-liked', lastViewed?.id, lastViewed?.mediaType, language],
    queryFn: async () => {
      if (!lastViewed) return null;
      
      // Fetch recommendations first (collaborative filtering - better quality)
      const recsResponse = await getRecommendations(lastViewed.mediaType, lastViewed.id, language);
      let results = recsResponse.results || [];
      
      // Fallback: If recommendations < 10, merge with similar
      if (results.length < 10) {
        try {
          const similarResponse = await getSimilar(lastViewed.mediaType, lastViewed.id, language);
          const similarResults = similarResponse.results || [];
          
          // Deduplicate and merge
          const existingIds = new Set(results.map(r => r.id));
          const uniqueSimilar = similarResults.filter(s => !existingIds.has(s.id));
          results = [...results, ...uniqueSimilar];
        } catch {
          // Ignore similar fetch errors
        }
      }
      
      return results;
    },
    enabled: !!lastViewed,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't render if no last viewed item or no recommendations
  if (!lastViewed || (!isLoading && (!recommendations || recommendations.length === 0))) {
    return null;
  }

  // Filter out watched items and ensure type consistency
  const filteredResults = recommendations
    ?.filter(item => {
      const itemType = item.media_type || lastViewed.mediaType;
      const key = `${itemType}-${item.id}`;
      // Filter out watched items and ensure same media type
      return !watchedIds.has(key) && itemType === lastViewed.mediaType;
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
                media={{ ...item, media_type: lastViewed.mediaType } as Media} 
                showType={false}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
