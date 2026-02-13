import React from 'react';

export default function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card overflow-hidden rounded-xl animate-pulse ${className}`}>
      <div className="w-full aspect-[2/3] bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}
