import { MediaCardSkeleton } from "@/components/MediaCard";

export function HomeWatchlistSkeleton() {
  return (
    <section className="ct-panel p-4 md:p-6">
      <div className="mb-4 space-y-2">
        <div className="h-7 w-40 rounded-md skeleton-shimmer" />
        <div className="h-4 w-72 rounded-md skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <MediaCardSkeleton key={index} delay={index * 70} />
        ))}
      </div>
    </section>
  );
}
