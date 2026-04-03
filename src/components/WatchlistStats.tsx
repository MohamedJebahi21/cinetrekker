import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Bookmark, Clock, Eye } from "lucide-react";
import { GlassStatCard } from "@/components/GlassStatCard";

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
}: WatchlistStatsProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className={`grid gap-4 ${
        totalHours > 0
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
    >
      <GlassStatCard
        icon={Bookmark}
        label={t("stats.total") || "Total"}
        value={totalCount}
        variant="primary"
        size="md"
        delay={0}
      />

      {watchingCount > 0 && (
        <GlassStatCard
          icon={Eye}
          label={t("stats.watching") || "Watching"}
          value={watchingCount}
          variant="warning"
          size="md"
          delay={0.08}
        />
      )}

      {completedCount > 0 && (
        <GlassStatCard
          icon={Bookmark}
          label={t("stats.completed") || "Completed"}
          value={completedCount}
          variant="success"
          size="md"
          delay={0.16}
        />
      )}

      {planToWatchCount > 0 && (
        <GlassStatCard
          icon={Clock}
          label={t("stats.planToWatch") || "Plan to Watch"}
          value={planToWatchCount}
          variant="warning"
          size="md"
          delay={0.24}
        />
      )}

      {totalHours > 0 && (
        <GlassStatCard
          icon={Clock}
          label={t("stats.totalHours") || "Hours"}
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
}: Omit<WatchlistStatsProps, "totalHours" | "compact">) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-foreground"
      >
        {t("watchlistPage.itemsCount", "{{count}} items", {
          count: totalCount,
        })}
      </motion.span>

      {watchingCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <span className="text-primary">•</span>{" "}
          {t("watchlistPage.watchingCount", "{{count}} watching", {
            count: watchingCount,
          })}
        </motion.span>
      )}

      {completedCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-green-500">•</span>{" "}
          {t("watchlistPage.completedCount", "{{count}} completed", {
            count: completedCount,
          })}
        </motion.span>
      )}

      {planToWatchCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <span className="text-amber-400">•</span>{" "}
          {t("watchlistPage.plannedCount", "{{count}} planned", {
            count: planToWatchCount,
          })}
        </motion.span>
      )}
    </div>
  );
}
