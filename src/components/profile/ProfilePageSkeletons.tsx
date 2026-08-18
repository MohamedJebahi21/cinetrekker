import { Skeleton } from "@/components/ui/skeleton";

function SkeletonTab() {
  return <Skeleton className="h-9 flex-1 rounded-lg" />;
}

function SkeletonPoster() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-2/5" />
    </div>
  );
}

/**
 * Mirrors the authenticated profile's identity card, tab strip, and overview
 * geometry so the initial route state remains useful and stable while profile
 * data resolves.
 */
export function PrivateProfileSkeleton() {
  return (
    <div
      className="relative z-10 mt-10 space-y-8 md:mt-20"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <section className="ct-panel overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:justify-start">
            <Skeleton className="h-24 w-24 rounded-full md:h-28 md:w-28" />
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-4 w-3/4 max-w-md" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border/60 bg-secondary/45 p-3">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="mt-2 h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-card/65 p-1 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonTab key={index} />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="ct-panel min-h-[220px] p-5 md:p-6">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, itemIndex) => (
                  <Skeleton key={itemIndex} className="h-20 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Mirrors the public profile's cover, identity block, social proof rail, tabs,
 * and favorite-poster shelf to prevent the former centered-spinner blank state.
 */
export function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading profile">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent md:h-56">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="page-container relative -mt-16 space-y-6 pb-24 md:-mt-20 md:pb-12">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full ring-4 ring-background md:h-28 md:w-28" />
          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/4 max-w-md" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-card/65 p-3 sm:gap-3 sm:p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 text-center">
              <Skeleton className="mx-auto h-5 w-10" />
              <Skeleton className="mx-auto h-3 w-16" />
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-card/65 p-1 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonTab key={index} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonPoster key={index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
