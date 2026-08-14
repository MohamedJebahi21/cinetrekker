import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const prefersReducedMotion = useReducedMotion();
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: 'easeOut' as const },
      };

  return (
    <motion.div 
      className={cn(
        'mx-auto flex max-w-xl flex-col items-center justify-center rounded-[2rem] border border-border/60 bg-card/45 px-5 py-12 text-center shadow-[0_20px_70px_hsl(var(--background)/0.22)] backdrop-blur-sm sm:px-8',
        className,
      )}
      {...motionProps}
    >
      <motion.div 
        className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80"
        {...(prefersReducedMotion ? {} : {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.25, delay: 0.08 },
        })}
      >
        {t("emptyState.nothingHereYet", "Nothing Here Yet")}
      </motion.div>
      <motion.div 
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-primary/15 bg-primary/10 shadow-[0_14px_36px_hsl(var(--primary)/0.12)]"
        {...(prefersReducedMotion ? {} : {
          initial: { opacity: 0, scale: 0.86 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3, delay: 0.12, ease: 'easeOut' },
          whileHover: { scale: 1.04 },
        })}
      >
        <Icon className="h-8 w-8 text-primary" />
      </motion.div>
      <motion.h3 
        className="mb-2 text-balance text-2xl font-semibold tracking-tight text-foreground"
        {...(prefersReducedMotion ? {} : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: 0.16 },
        })}
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p 
          className="mb-6 max-w-md text-pretty text-base leading-relaxed text-muted-foreground"
          {...(prefersReducedMotion ? {} : {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.3, delay: 0.2 },
          })}
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          {...(prefersReducedMotion ? {} : {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.3, delay: 0.24 },
            whileTap: { scale: 0.98 },
          })}
        >
          <Button onClick={action.onClick} className="btn-primary-glow gap-2">
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
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
      description={query ? `No matches for "${query}". Try a different title, actor, genre, or release year.` : 'Search across movies, TV shows, actors, and creators.'}
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
      description="Save movies and shows you want to watch later. Your future queue will live here."
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
      description="Rate, watch, or save a few titles and CineTrekker will start shaping a feed around your taste."
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
      description="Mark the movies and shows you love most to build a profile that feels personal."
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
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/55 p-4">
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
    <div className="flex items-center justify-center min-h-[100dvh] px-4">
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/45 px-4 py-6 text-center">
      <Icon className="w-6 h-6 text-primary mb-2" />
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
    </div>
  );
}
