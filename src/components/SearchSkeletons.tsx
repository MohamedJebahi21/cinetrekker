import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for person/actor search results
 * Moved to top to prevent circular dependency issues
 */
export function PersonSearchSkeleton() {
  return (
    <div className="glass-card p-4 flex gap-3">
      <Skeleton className="w-16 h-24 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for media cards in search results
 */
export function MediaCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden rounded-lg">
      <Skeleton className="w-full aspect-[2/3] rounded-lg" />
      <div className="p-3">
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for a grid of search results
 */
export function SearchResultsSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="media-grid">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for media card (alias for consistency)
 */
export function MediaSearchSkeleton() {
  return <MediaCardSkeleton />;
}

/**
 * Combined skeleton for mixed search results (media + people)
 */
export function MixedSearchSkeletons() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="media-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      </div>
      
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <PersonSearchSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for hero section
 */
export function HeroSectionSkeleton() {
  return (
    <div className="w-full h-96 bg-gradient-to-b from-muted to-background rounded-xl overflow-hidden">
      <Skeleton className="w-full h-full" />
      <div className="absolute inset-0 p-8 flex flex-col justify-end">
        <Skeleton className="h-10 w-96 mb-4" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-5/6" />
      </div>
    </div>
  );
}

/**
 * Skeleton for carousel section
 */
export function CarouselSectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-40">
            <Skeleton className="w-40 aspect-[2/3] rounded-lg" />
            <Skeleton className="h-4 w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for list item
 */
export function ListItemSkeleton() {
  return (
    <div className="glass-card p-4 flex gap-4">
      <Skeleton className="w-20 h-28 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a list
 */
export function ListSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for page header
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-5 w-96" />
    </div>
  );
}

/**
 * Skeleton for grid with pagination
 */
export function GridWithPaginationSkeleton({ columns = 3, rows = 3 }: { columns?: number; rows?: number }) {
  const items = columns * rows;
  return (
    <div>
      <div className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : columns === 4 ? 'grid-cols-4' : ''}`}>
        {Array.from({ length: items }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-8">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-10 w-10 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for a list of actor search results
 */
export function PersonSearchResultsSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <PersonSearchSkeleton key={i} />
      ))}
    </div>
  );
}