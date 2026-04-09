import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Search,
  Bookmark,
  Check,
  TrendingUp,
  Heart,
  Film,
  AlertCircle,
  Inbox,
  Users,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col items-center justify-center px-4 py-12 text-center ${className}`}>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
        {t("emptyState.nothingHereYet", "Nothing Here Yet")}
      </div>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-primary/15 bg-gradient-to-br from-primary/20 to-primary/5 shadow-[0_14px_36px_rgba(0,0,0,0.1)]">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-2 text-2xl font-semibold text-foreground">{title}</h3>
      {description && <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="btn-primary-glow gap-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export type { EmptyStateProps };

/**
 * Empty search results
 */
export function EmptySearchResults({ query, onNewSearch }: { query: string; onNewSearch: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No results available"
      description={query ? `No results available. Try different keywords or filters.` : 'Try searching for movies, TV shows, or actors.'}
      action={{ label: 'Browse Trending', onClick: onNewSearch }}
      className="min-h-96"
    />
  );
}

/**
 * Empty watchlist
 */
export function EmptyWatchlist({ onDiscover }: { onDiscover: () => void }) {
  return (
    <EmptyState
      icon={Bookmark}
      title="Your watchlist is empty"
      description="Your watchlist is empty. Start adding movies and TV shows."
      action={{ label: 'Browse Popular', onClick: onDiscover }}
      className="min-h-96"
    />
  );
}

/**
 * Empty watched list
 */
export function EmptyWatched({ onAddWatched }: { onAddWatched: () => void }) {
  return (
    <EmptyState
      icon={Check}
      title="No watched items yet"
      description="Mark movies and TV shows as watched to keep track of what you've seen."
      action={{ label: 'Start Marking', onClick: onAddWatched }}
      className="min-h-96"
    />
  );
}

/**
 * Empty recommendations
 */
export function EmptyRecommendations({ onExploreTrending }: { onExploreTrending: () => void }) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No recommendations yet"
      description="Explore trending content, add items to your watchlist, and we'll personalize recommendations for you."
      action={{ label: 'Explore Trending', onClick: onExploreTrending }}
      className="min-h-96"
    />
  );
}

/**
 * Empty favorites
 */
export function EmptyFavorites({ onExplore }: { onExplore: () => void }) {
  return (
    <EmptyState
      icon={Heart}
      title="No favorites yet"
      description="Like movies and TV shows to build your collection of favorites."
      action={{ label: 'Explore Now', onClick: onExplore }}
      className="min-h-96"
    />
  );
}

/**
 * Empty genres
 */
export function EmptyGenres() {
  return (
    <EmptyState
      icon={Film}
      title="No genres available"
      description="We couldn't load the genres. Please try refreshing the page."
      className="min-h-96"
    />
  );
}

/**
 * Error state
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading content. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
      className="min-h-96"
    />
  );
}

/**
 * Loading error with retry
 */
export function LoadingError({ message = 'Failed to load content', onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-6 text-center">
      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/**
 * No internet connection state
 */
export function NoConnectionState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="No internet connection"
      description="Please check your internet connection and try again."
      action={{ label: 'Retry', onClick: onRetry }}
      className="min-h-96"
    />
  );
}

/**
 * Empty grid with custom message
 */
export function EmptyGrid({ children }: { children: ReactNode }) {
  return (
    <div className="w-full py-12 px-4 text-center">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}

/**
 * Empty section header with icon and message
 */
export function EmptySectionMessage({
  icon: Icon = Inbox,
  title,
  message,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <div className="text-left">
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Empty page layout with centered content
 */
export function EmptyPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full text-center">{children}</div>
    </div>
  );
}

/**
 * Small empty state for inline displays
 */
export function SmallEmptyState({
  icon: Icon = Inbox,
  title,
  message,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="w-6 h-6 text-muted-foreground mb-2" />
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
    </div>
  );
}
