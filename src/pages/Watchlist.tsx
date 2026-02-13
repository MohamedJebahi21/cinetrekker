import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, TrendingUp, Printer, Filter as FilterIcon } from 'lucide-react';
import { useState } from 'react';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';
import { SortFilterControls, SortOption } from '@/components/SortFilterControls';
import { sortMedia, filterMediaByRuntime, filterMediaByYear } from '@/lib/sortFilter';
import { RandomPicker } from '@/components/RandomPicker';
import { ShareButton } from '@/components/ShareButton';
import { ExportImportButton } from '@/components/ExportImportButton';

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { watchlist, watched } = useUserLists();
  const language = i18n.language;
  const [statusFilter, setStatusFilter] = useState<'all' | 'watching' | 'plan_to_watch' | 'completed' | 'dropped'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const [runtimeRange, setRuntimeRange] = useState<[number, number]>([0, 300]);
  const [yearRange, setYearRange] = useState<{ min: number; max: number }>({
    min: 1900,
    max: new Date().getFullYear(),
  });

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
  let filteredMedia = mediaDetails?.filter(media => {
    if (statusFilter !== 'all' && media.watchStatus !== statusFilter) return false;
    return true;
  });

  // Apply runtime and year filters
  if (filteredMedia) {
    filteredMedia = filterMediaByRuntime(filteredMedia, runtimeRange[0], runtimeRange[1]);
    filteredMedia = filterMediaByYear(filteredMedia, yearRange.min, yearRange.max);
  }

  // Create added dates map for sorting
  const addedDates = new Map<string, Date>();
  watchlist.forEach((item) => {
    const key = `${item.mediaType}-${item.mediaId}`;
    addedDates.set(key, new Date(item.addedAt || 0));
  });

  // Apply sorting
  if (filteredMedia) {
    filteredMedia = sortMedia(filteredMedia, sortBy, addedDates);
  }

  const activeFilters =
    (runtimeRange[0] !== 0 || runtimeRange[1] !== 300 ? 1 : 0) +
    (yearRange.min !== 1900 || yearRange.max !== new Date().getFullYear() ? 1 : 0);

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
        canonical="https://cinetrekker.vercel.app/watchlist"
      />
      <div className="page-container pt-20">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="section-title mb-0">{t('watchlist.title')}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {watchlist.length} {t('common.items', 'items')}
            </Badge>
            <RandomPicker source="watchlist" variant="outline" size="sm" label="Random" />
            <ShareButton
              title="My CineTrekker Watchlist"
              url={window.location.origin + '/watchlist'}
              text={`Check out my watchlist of ${watchlist.length} movies and shows!`}
              variant="ghost"
              size="sm"
            />
            <ExportImportButton />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/print-watchlist">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Link>
            </Button>
          </div>
        </div>

        {/* Sort and Filter Controls */}
        {mediaDetails && mediaDetails.length > 0 && (
          <div className="mb-6">
            <SortFilterControls
              sortBy={sortBy}
              onSortChange={setSortBy}
              runtimeRange={runtimeRange}
              onRuntimeChange={setRuntimeRange}
              minYear={yearRange.min}
              maxYear={yearRange.max}
              onYearRangeChange={(min, max) => setYearRange({ min, max })}
              showRuntimeFilter
              showYearFilter
              activeFilters={activeFilters}
            />
          </div>
        )}

        {/* Status Filter Tabs */}
        {mediaDetails && mediaDetails.length > 0 && (
          <div className="mb-6 space-y-3">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mb-3">
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
          </div>
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
          <FilterIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {t('watchlist.noItemsInFilter', 'No items match your filters')}
          </h2>
          <Button variant="outline" onClick={() => {
            setStatusFilter('all');
            setRuntimeRange([0, 300]);
            setYearRange({ min: 1900, max: new Date().getFullYear() });
          }} className="mt-4">
            {t('common.clearFilter', 'Clear Filters')}
          </Button>
        </div>
      ) : (
          <EmptyState
            icon={Bookmark}
            title={t('watchlist.empty', 'Your watchlist is empty')}
            description={t('watchlist.emptyDesc', 'Start adding movies and TV shows you want to watch!')}
            actionLabel={t('common.discoverTrending', 'Discover Trending')}
            actionLink="/search?sort=popularity.desc"
          />
      )}
    </div>
    </>
  );
}
