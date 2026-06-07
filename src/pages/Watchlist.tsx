import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, TrendingUp, Filter } from 'lucide-react';
import { useState } from 'react';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { watchlist, watched } = useUserLists();
  const language = i18n.language;
  const [statusFilter, setStatusFilter] = useState<'all' | 'watching' | 'plan_to_watch' | 'completed' | 'dropped'>('all');

  // Fetch details for all watchlist items
  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: ['watchlist-details', watchlist.map(i => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const details = item.mediaType === 'movie'
              ? await getMovieDetails(item.mediaId, language)
              : await getTVDetails(item.mediaId, language);
            
            // Get watch status if exists
            const watchedItem = watched.find(
              w => w.mediaId === item.mediaId && w.mediaType === item.mediaType
            );
            
            return { 
              ...details, 
              media_type: item.mediaType,
              watchStatus: watchedItem?.status,
              userRating: watchedItem?.rating,
            } as Media & { watchStatus?: string; userRating?: number };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean) as (Media & { watchStatus?: string })[];
    },
    enabled: watchlist.length > 0,
  });

  // Filter by status
  const filteredMedia = mediaDetails?.filter(media => {
    if (statusFilter === 'all') return true;
    return media.watchStatus === statusFilter;
  });

  const statusCounts = {
    all: mediaDetails?.length || 0,
    watching: mediaDetails?.filter(m => m.watchStatus === 'watching').length || 0,
    plan_to_watch: mediaDetails?.filter(m => m.watchStatus === 'plan_to_watch' || !m.watchStatus).length || 0,
    completed: mediaDetails?.filter(m => m.watchStatus === 'completed').length || 0,
    dropped: mediaDetails?.filter(m => m.watchStatus === 'dropped').length || 0,
  };

  return (
    <>
      <SEO 
        title="My Watchlist — CineTrekker" 
        description="Movies and TV shows you want to watch"
        canonical="https://cinetrekker.lovable.app/watchlist"
      />
      <div className="page-container pt-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="section-title mb-0">{t('watchlist.title')}</h1>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {watchlist.length} {t('common.items', 'items')}
          </Badge>
        </div>

        {/* Status Filter Tabs */}
        {mediaDetails && mediaDetails.length > 0 && (
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mb-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="all" className="gap-2">
                {t('status.all', 'All')}
                {statusCounts.all > 0 && (
                  <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="watching" className="gap-2">
                📺 {t('status.watching', 'Watching')}
                {statusCounts.watching > 0 && (
                  <Badge variant="secondary" className="ml-1">{statusCounts.watching}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="plan_to_watch" className="gap-2">
                📋 {t('status.plan_to_watch', 'Plan to Watch')}
                {statusCounts.plan_to_watch > 0 && (
                  <Badge variant="secondary" className="ml-1">{statusCounts.plan_to_watch}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                ✅ {t('status.completed', 'Completed')}
                {statusCounts.completed > 0 && (
                  <Badge variant="secondary" className="ml-1">{statusCounts.completed}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dropped" className="gap-2">
                ❌ {t('status.dropped', 'Dropped')}
                {statusCounts.dropped > 0 && (
                  <Badge variant="secondary" className="ml-1">{statusCounts.dropped}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

      {isLoading ? (
        <div className="media-grid">
          {Array.from({ length: watchlist.length || 4 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredMedia && filteredMedia.length > 0 ? (
        <div className="media-grid">
          {filteredMedia.map((media) => (
            <MediaCard 
              key={`${media.id}-${media.media_type}`} 
              media={media}
              showStatus={true}
            />
          ))}
        </div>
      ) : mediaDetails && mediaDetails.length > 0 ? (
        <div className="text-center py-16">
          <Filter className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {t('watchlist.noItemsInFilter', `No items with status "${statusFilter}"`)}
          </h2>
          <Button variant="outline" onClick={() => setStatusFilter('all')} className="mt-4">
            {t('common.clearFilter', 'Show All')}
          </Button>
        </div>
      ) : (
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Bookmark className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3 title-display">{t('watchlist.empty')}</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{t('watchlist.emptyDesc')}</p>
          <Link to="/search">
            <Button className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('common.discoverTrending')}
            </Button>
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
