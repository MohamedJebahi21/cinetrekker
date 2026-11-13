import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, type Variants } from 'framer-motion';
import { ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { safeT } from '@/lib/i18n';

interface WatchlistFiltersProps {
  statusFilter: string;
  sortBy: string;
  onStatusChange: (status: string) => void;
  onSortChange: (sort: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export function WatchlistFilters({
  statusFilter,
  sortBy,
  onStatusChange,
  onSortChange,
  isExpanded = true,
  onToggleExpand,
}: WatchlistFiltersProps) {
  const { t } = useTranslation();
  const contentId = 'watchlist-filters-content';

  const filterOptions = [
    { value: 'all', label: t('filters.all') || 'All' },
    { value: 'watching', label: t('filters.watching') || 'Watching' },
    { value: 'plan_to_watch', label: t('filters.planToWatch') || 'Plan to Watch' },
    { value: 'completed', label: t('filters.completed') || 'Completed' },
    { value: 'dropped', label: t('filters.dropped') || 'Dropped' },
  ];

  const sortOptions = [
    { value: 'added-desc', label: t('sort.recentlyAdded') || 'Recently Added' },
    { value: 'rating-desc', label: t('sort.highestRated') || 'Highest Rated' },
    { value: 'rating-asc', label: t('sort.lowestRated') || 'Lowest Rated' },
    { value: 'date-desc', label: t('sort.releaseYearNew', 'Release Year: Newest') },
    { value: 'date-asc', label: t('sort.releaseYearOld', 'Release Year: Oldest') },
    { value: 'runtime-desc', label: t('sort.runtimeLong', 'Runtime: Longest') },
    { value: 'runtime-asc', label: t('sort.runtimeShort', 'Runtime: Shortest') },
    { value: 'title-asc', label: t('sort.titleAZ') || 'Title A-Z' },
    { value: 'title-desc', label: t('sort.titleZA') || 'Title Z-A' },
  ];

  const hasActiveFilters = statusFilter !== 'all' || sortBy !== 'added-desc';

  const containerVariants: Variants = {
    initial: { height: 0, opacity: 0 },
    animate: {
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
    exit: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5 backdrop-blur-sm shadow-sm transition-all">
      {/* Header with active indicator and toggle */}
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground tracking-tight">
            {safeT(t, 'watchlistPage.filtersAndSort', 'Filters & Sort')}
          </h3>
          {hasActiveFilters && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
              {safeT(t, 'filters.active', 'Active')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onStatusChange('all');
                onSortChange('added-desc');
              }}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{safeT(t, 'common.reset', 'Reset')}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand?.(!isExpanded)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label={
              isExpanded
                ? safeT(t, 'watchlistPage.collapseFilters', 'Collapse filters')
                : safeT(t, 'watchlistPage.expandFilters', 'Expand filters')
            }
            aria-expanded={isExpanded}
            aria-controls={contentId}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Filters content */}
      <motion.div
        id={contentId}
        variants={containerVariants}
        initial="initial"
        animate={isExpanded ? 'animate' : 'exit'}
        aria-hidden={!isExpanded}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
          {/* Status Filter */}
          <div className="space-y-2 lg:col-span-8">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('filters.status') || 'Status'}
            </Label>
            {/* Desktop / tablet segmented pills */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              {filterOptions.map((option) => {
                const active = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onStatusChange(option.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/40'
                    }`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {/* Mobile select */}
            <div className="sm:hidden">
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9 bg-background/80 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-2 lg:col-span-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('filters.sortBy') || t('filters.sort') || 'Sort By'}
            </Label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-9 bg-background/80 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
}

export function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('watchlistPage.removeNamedFilter', 'Remove {{label}} filter', { label })}
        className="ml-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-primary/60 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        ×
      </button>
    </motion.div>
  );
}
