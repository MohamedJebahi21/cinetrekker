import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, Printer } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUserLists } from '@/contexts/user-lists-context';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';
import { sortMedia } from '@/lib/sortFilter';
import { RandomPicker } from '@/components/RandomPicker';
import { ShareButton } from '@/components/ShareButton';
import { ExportImportButton } from '@/components/ExportImportButton';
import { MediaGrid } from '@/components/MediaGrid';
import { WatchlistFilters } from '@/components/WatchlistFilters';
import { WatchlistStats, WatchlistStatsLine } from '@/components/WatchlistStats';

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { watchlist, watched } = useUserLists();
  const language = i18n.language;
  const [statusFilter, setStatusFilter] = useState<'all' | 'watching' | 'plan_to_watch' | 'completed' | 'dropped'>('all');
  const [sortBy, setSortBy] = useState('added-desc');
  const [filterExpanded, setFilterExpanded] = useState(true);

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
            
            // Get current watch status
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

  // Create added dates map for sorting
  const addedDates = new Map<string, Date>();
  watchlist.forEach((item) => {
    const key = `${item.mediaType}-${item.mediaId}`;
    addedDates.set(key, new Date(item.addedAt || 0));
  });

  // Apply sorting
  if (filteredMedia) {
    filteredMedia = sortMedia(filteredMedia, sortBy as SortOption, addedDates);
  }

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
      <div className="page-container pt-20 pb-24 md:pb-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <h1 className="section-title mb-2">{t('watchlist.title')}</h1>
            <WatchlistStatsLine 
              totalCount={statusCounts.all}
              watchingCount={statusCounts.watching}
              completedCount={statusCounts.completed}
              planToWatchCount={statusCounts.plan_to_watch}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
        </motion.div>

        {/* Stats Card */}
        {mediaDetails && mediaDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-8"
          >
            <WatchlistStats
              totalCount={statusCounts.all}
              watchingCount={statusCounts.watching}
              completedCount={statusCounts.completed}
              planToWatchCount={statusCounts.plan_to_watch}
            />
          </motion.div>
        )}

        {/* Filters */}
        {mediaDetails && mediaDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-8"
          >
            <WatchlistFilters
              statusFilter={statusFilter}
              sortBy={sortBy}
              onStatusChange={setStatusFilter}
              onSortChange={setSortBy}
              isExpanded={filterExpanded}
              onToggleExpand={setFilterExpanded}
            />
          </motion.div>
        )}

        {/* Content */}
        {isLoading ? (
          <MediaGrid items={[]} isLoading columns="normal" gap="md" />
        ) : filteredMedia && filteredMedia.length > 0 ? (
          <MediaGrid 
            items={filteredMedia} 
            columns="normal"
            gap="md"
          />
        ) : mediaDetails && mediaDetails.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t('watchlist.noItemsInFilter', 'No items match your filters')}
            </h2>
            <Button variant="outline" onClick={() => {
              setStatusFilter('all');
              setSortBy('added-desc');
            }} className="mt-4">
              {t('common.clearFilter', 'Clear Filters')}
            </Button>
          </motion.div>
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
