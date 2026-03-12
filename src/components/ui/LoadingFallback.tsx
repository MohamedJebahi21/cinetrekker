import React from 'react';
import MovieSkeleton from '@/components/ui/MovieSkeleton';
import { PageSkeleton } from '@/components/PageSkeleton';

interface LoadingFallbackProps {
  variant?: 'grid' | 'page';
  count?: number;
}

export default function LoadingFallback({ variant = 'grid', count = 8 }: LoadingFallbackProps) {
  if (variant === 'page') return <PageSkeleton />;

  return (
    <div className="page-container pt-20">
      <div className="media-grid">
        {Array.from({ length: count }).map((_, i) => (
          <MovieSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
