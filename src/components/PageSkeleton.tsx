import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic page skeleton loader for lazy-loaded pages
 * Shows a placeholder grid while content is loading
 */
export function PageSkeleton() {
  return (
    <div className="page-container pt-20 animate-fade-in">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-3" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      {/* Grid skeleton */}
      <div className="media-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[2/3] rounded-lg w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PageSkeleton;
