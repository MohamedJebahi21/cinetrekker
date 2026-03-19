import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, type Variants } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
    { value: 'title-asc', label: t('sort.titleAZ') || 'Title A-Z' },
    { value: 'title-desc', label: t('sort.titleZA') || 'Title Z-A' },
  ];

  const containerVariants: Variants = {
    initial: { height: 0, opacity: 0 },
    animate: {
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.3 },
    },
    exit: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    <Card className="mb-6 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">{t('filters.title') || 'Filters & Sort'}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand?.(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>

        {/* Filters content */}
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate={isExpanded ? 'animate' : 'exit'}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('filters.status') || 'Status'}
              </Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9">
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

            {/* Sort */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('filters.sortBy') || 'Sort By'}
              </Label>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="h-9">
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
      </CardContent>
    </Card>
  );
}

interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
}

export function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm"
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-1 text-primary/60 hover:text-primary transition-colors"
      >
        ×
      </button>
    </motion.div>
  );
}
