import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bookmark, Eye, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GlassStatCard } from '@/components/GlassStatCard';

interface WatchlistStatsProps {
  totalCount: number;
  watchingCount?: number;
  completedCount?: number;
  planToWatchCount?: number;
  totalHours?: number;
  compact?: boolean;
}

export function WatchlistStats({
  totalCount,
  watchingCount = 0,
  completedCount = 0,
  planToWatchCount = 0,
  totalHours = 0,
  compact = false,
}: WatchlistStatsProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1"
        >
          <Bookmark className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">{totalCount}</span>
        </motion.div>
        {totalHours > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{totalHours}h</span>
          </motion.div>
        )}
      </div>
    );
  }

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <GlassStatCard
        icon={Bookmark}
        label={t('stats.total') || 'Total'}
        value={totalCount}
        variant="primary"
        size="md"
        delay={0}
      />
      
      {watchingCount > 0 && (
        <GlassStatCard
          icon={Eye}
          label={t('stats.watching') || 'Watching'}
          value={watchingCount}
          variant="primary"
          size="md"
          delay={0.08}
        />
      )}
      
      {completedCount > 0 && (
        <GlassStatCard
          icon={Bookmark}
          label={t('stats.completed') || 'Completed'}
          value={completedCount}
          variant="success"
          size="md"
          delay={0.16}
        />
      )}
      
      {planToWatchCount > 0 && (
        <GlassStatCard
          icon={Clock}
          label={t('stats.planToWatch') || 'Plan to Watch'}
          value={planToWatchCount}
          variant="warning"
          size="md"
          delay={0.24}
        />
      )}
      
      {totalHours > 0 && (
        <GlassStatCard
          icon={Clock}
          label={t('stats.totalHours') || 'Hours'}
          value={totalHours}
          variant="danger"
          size="md"
          delay={0.32}
        />
      )}
    </motion.div>
  );
}

export function WatchlistStatsLine({
  totalCount,
  watchingCount = 0,
  completedCount = 0,
  planToWatchCount = 0,
}: Omit<WatchlistStatsProps, 'totalHours' | 'compact'>) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-foreground"
      >
        {totalCount} {totalCount === 1 ? 'item' : 'items'}
      </motion.span>

      {watchingCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <span className="text-blue-500">●</span> {watchingCount} watching
        </motion.span>
      )}

      {completedCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-green-500">●</span> {completedCount} completed
        </motion.span>
      )}

      {planToWatchCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <span className="text-yellow-500">●</span> {planToWatchCount} planned
        </motion.span>
      )}
    </div>
  );
}
