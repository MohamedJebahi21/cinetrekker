import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, Printer, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUserLists } from '@/contexts/user-lists-context';
import { getMovieDetails, getTVDetails, getImageUrl, getMediaTitle, getMediaYear, getMediaType } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';
import { sortMedia, type SortOption } from '@/lib/sortFilter';
import { RandomPicker } from '@/components/RandomPicker';
import { ShareButton } from '@/components/ShareButton';
import { ExportImportButton } from '@/components/ExportImportButton';
import { MediaGrid } from '@/components/MediaGrid';
import { WatchlistFilters } from '@/components/WatchlistFilters';
import { WatchlistStats, WatchlistStatsLine } from '@/components/WatchlistStats';

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { watchlist, watched } = useUserLists();
  const [searchParams] = useSearchParams();
  const language = i18n.language;
  const [statusFilter, setStatusFilter] = useState<'all' | 'watching' | 'plan_to_watch' | 'completed' | 'dropped'>('all');
  const [sortBy, setSortBy] = useState('added-desc');
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sharedParam = searchParams.get('share') || '';
  const sharedItems = sharedParam
    ? sharedParam.split(',').map((entry) => {
        const [mediaType, mediaId] = entry.split(':');
        const parsedId = Number(mediaId);
        if ((mediaType === 'movie' || mediaType === 'tv') && Number.isFinite(parsedId)) {
          return { mediaType, mediaId: parsedId, addedAt: undefined };
        }
        return null;
      }).filter(Boolean) as Array<{ mediaType: 'movie' | 'tv'; mediaId: number; addedAt?: string }>
    : [];
  const isSharedView = sharedItems.length > 0;
  const listItems = isSharedView ? sharedItems : watchlist;

  // Fetch details for all watchlist items
  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: ['watchlist-details', listItems.map(i => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        listItems.map(async (item) => {
          try {
            const details = item.mediaType === 'movie'
              ? await getMovieDetails(item.mediaId, language)
              : await getTVDetails(item.mediaId, language);
            
            // Get current watch status
            const watchedItem = isSharedView ? undefined : watched.find(
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
    enabled: listItems.length > 0,
  });

  // Filter by status
  const effectiveStatusFilter = isSharedView ? 'all' : statusFilter;
  let filteredMedia = mediaDetails?.filter(media => {
    if (effectiveStatusFilter !== 'all' && media.watchStatus !== effectiveStatusFilter) return false;
    return true;
  });

  // Create added dates map for sorting
  const addedDates = new Map<string, Date>();
  listItems.forEach((item) => {
    const key = `${item.mediaType}-${item.mediaId}`;
    addedDates.set(key, new Date(item.addedAt || 0));
  });

  // Apply sorting
  if (filteredMedia) {
    filteredMedia = sortMedia(filteredMedia, sortBy as SortOption, addedDates);
  }

  const statusCounts = {
    all: mediaDetails?.length || 0,
    watching: isSharedView ? 0 : mediaDetails?.filter(m => m.watchStatus === 'watching').length || 0,
    plan_to_watch: isSharedView ? 0 : mediaDetails?.filter(m => m.watchStatus === 'plan_to_watch' || !m.watchStatus).length || 0,
    completed: isSharedView ? 0 : mediaDetails?.filter(m => m.watchStatus === 'completed').length || 0,
    dropped: isSharedView ? 0 : mediaDetails?.filter(m => m.watchStatus === 'dropped').length || 0,
  };

  return (
    <>
      <SEO 
        title={isSharedView ? 'Shared Watchlist - CineTrekker' : 'My Watchlist - CineTrekker'}
        description={isSharedView ? 'A shared CineTrekker watchlist' : 'Movies and TV shows you want to watch'}
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
            <h1 className="section-title mb-2">{isSharedView ? 'Shared Watchlist' : t('watchlist.title')}</h1>
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
              title={isSharedView ? 'Shared CineTrekker Watchlist' : 'My CineTrekker Watchlist'}
              url={isSharedView
                ? window.location.href
                : `${window.location.origin}/watchlist?share=${encodeURIComponent(
                    listItems.slice(0, 100).map((item) => `${item.mediaType}:${item.mediaId}`).join(',')
                  )}`}
              text={`Check out this watchlist of ${listItems.length} movies and shows!`}
              variant="ghost"
              size="sm"
            />
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="h-3.5 w-3.5 mr-1" />
                List
              </button>
            </div>
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
        {isSharedView && (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            You're viewing a shared watchlist. Sign in to manage your own list.
          </div>
        )}

        {/* Stats Card */}
        {!isSharedView && mediaDetails && mediaDetails.length > 0 && (
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
        {!isSharedView && mediaDetails && mediaDetails.length > 0 && (
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
          viewMode === 'grid' ? (
            <MediaGrid 
              items={filteredMedia} 
              columns="normal"
              gap="md"
            />
          ) : (
            <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-background/40">
              {filteredMedia.map((media) => {
                const title = getMediaTitle(media);
                const year = getMediaYear(media);
                const mediaType = getMediaType(media);
                const poster = getImageUrl(media.poster_path, 'w154');
                const rating = media.vote_average;
                return (
                  <Link
                    key={`${mediaType}-${media.id}`}
                    to={`/${mediaType}/${media.id}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {poster ? (
                        <img
                          src={poster}
                          alt={`${title} poster`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm md:text-base truncate">{title}</h3>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {mediaType}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        {year && <span>{year}</span>}
                        {rating > 0 && <span>Rating: {rating.toFixed(1)}</span>}
                        {media.watchStatus && (
                          <span className="capitalize">{media.watchStatus.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
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



