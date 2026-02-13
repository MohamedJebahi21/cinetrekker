import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bookmark, Eye, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WatchlistStatsProps {
  totalCount: number;
  watchingCount?: number;
  completedCount?: number;
  planToWatchCount?: number;
  totalHours?: number;
  compact?: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
}

function StatItem({ icon, label, value, color = 'text-muted-foreground' }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-2"
    >
      <div className={`${color}`}>{icon}</div>
      <div className="text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
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
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-border/50">
      <CardContent className="pt-6">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          <StatItem
            icon={<Bookmark className="w-6 h-6" />}
            label={t('stats.total') || 'Total'}
            value={totalCount}
            color="text-primary"
          />
          <StatItem
            icon={<Eye className="w-6 h-6" />}
            label={t('stats.watching') || 'Watching'}
            value={watchingCount}
            color="text-blue-500"
          />
          <StatItem
            icon={<Bookmark className="w-6 h-6" />}
            label={t('stats.completed') || 'Completed'}
            value={completedCount}
            color="text-green-500"
          />
          <StatItem
            icon={<Clock className="w-6 h-6" />}
            label={t('stats.planToWatch') || 'Plan to Watch'}
            value={planToWatchCount}
            color="text-yellow-500"
          />
          {totalHours > 0 && (
            <StatItem
              icon={<Clock className="w-6 h-6" />}
              label={t('stats.totalHours') || 'Hours'}
              value={totalHours}
              color="text-orange-500"
            />
          )}
        </motion.div>
      </CardContent>
    </Card>
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
