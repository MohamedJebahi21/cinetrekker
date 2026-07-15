import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  Trophy,
  Search,
  Check,
  Share2,
  Zap,
  Star,
  Film,
  Tv,
  Clock,
  Layers,
  Sparkles,
  Award,
} from "lucide-react";
import { useUserLists } from "@/contexts/UserListsContext";
import { getMovieDetails, getTVDetails } from "@/services/tmdb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";

type AchievementCategory =
  | "all"
  | "watching"
  | "ratings"
  | "genres"
  | "time"
  | "special";

type AchievementItem = {
  id: string;
  category: "watching" | "ratings" | "genres" | "time" | "special";
  icon: string;
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "legendary";
  currentValue: number;
  targetValue: number;
  unlocked: boolean;
  points: number;
  progressLabel: string;
  unlockedLabel: string | null;
};

const ALL_AVAILABLE_GENRES_TARGET = 19;

const TIER_POINTS = {
  bronze: 10,
  silver: 25,
  gold: 50,
  legendary: 100,
};

function formatUnlockMonthYear(date: Date | null, locale: string): string | null {
  if (!date) return null;
  return date.toLocaleDateString(locale || undefined, {
    month: "short",
    year: "numeric",
  });
}

function getThresholdDate(
  values: Array<{ date: Date }>,
  threshold: number,
): Date | null {
  if (values.length < threshold) return null;
  return values[threshold - 1].date;
}

export default function Achievements() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "unlocked" | "locked">("all");

  // Sharing Dialog State
  const [sharingAchievement, setSharingAchievement] = useState<AchievementItem | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Deduplicate watch logs to find unique movies/TV shows watched
  const uniqueWatchedEntries = useMemo(() => {
    const map = new Map<string, (typeof watched)[number]>();

    watched.forEach((item) => {
      const key = `${item.mediaType}-${item.mediaId}`;
      const existing = map.get(key);

      if (
        !existing ||
        new Date(item.watchedAt || item.addedAt || 0).getTime() >=
          new Date(existing.watchedAt || existing.addedAt || 0).getTime()
      ) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [watched]);

  // 2. Fetch runtimes and genres for unique logs from TMDB to calculate watch time & genre explore milestones
  const { data: watchedInsights = [] } = useQuery({
    queryKey: [
      "achievements-watched-insights-enhanced",
      uniqueWatchedEntries.map((item) => `${item.mediaType}-${item.mediaId}`),
    ],
    enabled: uniqueWatchedEntries.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const capped = uniqueWatchedEntries.slice(0, 250);
      return Promise.all(
        capped.map(async (item) => {
          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId)
                : await getTVDetails(item.mediaId);

            return {
              key: `${item.mediaType}-${item.mediaId}`,
              watchedAt: new Date(item.watchedAt || item.addedAt || 0),
              runtimeMinutes:
                item.mediaType === "movie"
                  ? details.runtime || 0
                  : details.episode_run_time?.[0] || details.runtime || 45,
              genreIds: (details.genres || []).map((genre) => genre.id),
            };
          } catch {
            return {
              key: `${item.mediaType}-${item.mediaId}`,
              watchedAt: new Date(item.watchedAt || item.addedAt || 0),
              runtimeMinutes: 0,
              genreIds: [] as number[],
            };
          }
        }),
      );
    },
  });

  const movieMilestoneDates = useMemo(
    () =>
      uniqueWatchedEntries
        .filter((item) => item.mediaType === "movie")
        .map((item) => ({
          date: new Date(item.watchedAt || item.addedAt || 0),
        }))
        .filter((entry) => !Number.isNaN(entry.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [uniqueWatchedEntries],
  );

  const ratingMilestoneDates = useMemo(
    () =>
      uniqueWatchedEntries
        .filter((item) => typeof item.rating === "number" && item.rating > 0)
        .map((item) => ({
          date: new Date(item.watchedAt || item.addedAt || 0),
        }))
        .filter((entry) => !Number.isNaN(entry.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [uniqueWatchedEntries],
  );

  const movieCount = movieMilestoneDates.length;
  const ratingsCount = ratingMilestoneDates.length;

  const sortedInsights = useMemo(
    () =>
      watchedInsights
        .filter((item) => !Number.isNaN(item.watchedAt.getTime()))
        .sort((a, b) => a.watchedAt.getTime() - b.watchedAt.getTime()),
    [watchedInsights],
  );

  const genreProgress = useMemo(() => {
    const seen = new Set<number>();
    let dateAt5: Date | null = null;
    let dateAt10: Date | null = null;
    let dateAtAll: Date | null = null;

    sortedInsights.forEach((item) => {
      item.genreIds.forEach((genreId) => seen.add(genreId));
      if (!dateAt5 && seen.size >= 5) dateAt5 = item.watchedAt;
      if (!dateAt10 && seen.size >= 10) dateAt10 = item.watchedAt;
      if (!dateAtAll && seen.size >= ALL_AVAILABLE_GENRES_TARGET) {
        dateAtAll = item.watchedAt;
      }
    });

    return { count: seen.size, dateAt5, dateAt10, dateAtAll };
  }, [sortedInsights]);

  const watchTimeProgress = useMemo(() => {
    const thresholds = [10, 50, 100, 500] as const;
    const thresholdDates: Record<(typeof thresholds)[number], Date | null> = {
      10: null,
      50: null,
      100: null,
      500: null,
    };

    let totalMinutes = 0;
    sortedInsights.forEach((item) => {
      totalMinutes += item.runtimeMinutes;
      const totalHours = totalMinutes / 60;

      thresholds.forEach((threshold) => {
        if (!thresholdDates[threshold] && totalHours >= threshold) {
          thresholdDates[threshold] = item.watchedAt;
        }
      });
    });

    return {
      totalHours: Math.round(totalMinutes / 60),
      thresholdDates,
    };
  }, [sortedInsights]);

  // Marathon Night check: 5+ movies watched on a single calendar day
  const marathonProgress = useMemo(() => {
    const dateCounts: Record<string, number> = {};
    watched.forEach((item) => {
      if (item.mediaType === "movie") {
        const dateStr = item.watchedAt || item.addedAt;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!Number.isNaN(date.getTime())) {
            const key = date.toISOString().split("T")[0];
            dateCounts[key] = (dateCounts[key] || 0) + 1;
          }
        }
      }
    });

    const counts = Object.values(dateCounts);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

    let unlockedDate: Date | null = null;
    const sortedDays = Object.entries(dateCounts).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [dayStr, count] of sortedDays) {
      if (count >= 5) {
        unlockedDate = new Date(dayStr);
        break;
      }
    }

    return {
      maxCount,
      unlocked: maxCount >= 5,
      unlockedDate,
    };
  }, [watched]);

  const isFounder = useMemo(() => {
    return watched.length > 0;
  }, [watched]);

  // 3. Assemble all achievements list dynamically
  const allAchievements = useMemo<AchievementItem[]>(() => {
    return [
      // WATCHING TIER
      {
        id: "watch-first",
        category: "watching",
        icon: "🎬",
        name: t("achievements.watchFirst", "First Movie Logged"),
        description: t("achievements.watchFirstDesc", "Watch your first movie"),
        tier: "bronze",
        currentValue: movieCount,
        targetValue: 1,
        unlocked: movieCount >= 1,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(movieCount, 1)} / 1`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 1),
          i18n.language,
        ),
      },
      {
        id: "watch-10",
        category: "watching",
        icon: "🍿",
        name: t("achievements.watch10", "10 Movies Watched"),
        description: t("achievements.watch10Desc", "Watch 10 movies"),
        tier: "bronze",
        currentValue: movieCount,
        targetValue: 10,
        unlocked: movieCount >= 10,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(movieCount, 10)} / 10`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 10),
          i18n.language,
        ),
      },
      {
        id: "watch-50",
        category: "watching",
        icon: "🎞️",
        name: t("achievements.watch50", "50 Movies Watched"),
        description: t("achievements.watch50Desc", "Watch 50 movies"),
        tier: "silver",
        currentValue: movieCount,
        targetValue: 50,
        unlocked: movieCount >= 50,
        points: TIER_POINTS.silver,
        progressLabel: `${Math.min(movieCount, 50)} / 50`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 50),
          i18n.language,
        ),
      },
      {
        id: "watch-100",
        category: "watching",
        icon: "🎥",
        name: t("achievements.watch100", "100 Movies Watched"),
        description: t("achievements.watch100Desc", "Watch 100 movies"),
        tier: "silver",
        currentValue: movieCount,
        targetValue: 100,
        unlocked: movieCount >= 100,
        points: TIER_POINTS.silver,
        progressLabel: `${Math.min(movieCount, 100)} / 100`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 100),
          i18n.language,
        ),
      },
      {
        id: "watch-250",
        category: "watching",
        icon: "🏆",
        name: t("achievements.watch250", "250 Movies Watched"),
        description: t("achievements.watch250Desc", "Watch 250 movies"),
        tier: "gold",
        currentValue: movieCount,
        targetValue: 250,
        unlocked: movieCount >= 250,
        points: TIER_POINTS.gold,
        progressLabel: `${Math.min(movieCount, 250)} / 250`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 250),
          i18n.language,
        ),
      },
      {
        id: "watch-500",
        category: "watching",
        icon: "👑",
        name: t("achievements.watch500", "500 Movies Watched"),
        description: t("achievements.watch500Desc", "Watch 500 movies"),
        tier: "legendary",
        currentValue: movieCount,
        targetValue: 500,
        unlocked: movieCount >= 500,
        points: TIER_POINTS.legendary,
        progressLabel: `${Math.min(movieCount, 500)} / 500`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 500),
          i18n.language,
        ),
      },

      // RATINGS TIER
      {
        id: "rate-first",
        category: "ratings",
        icon: "⭐",
        name: t("achievements.rateFirst", "First Rating Given"),
        description: t("achievements.rateFirstDesc", "Rate your first title"),
        tier: "bronze",
        currentValue: ratingsCount,
        targetValue: 1,
        unlocked: ratingsCount >= 1,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(ratingsCount, 1)} / 1`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 1),
          i18n.language,
        ),
      },
      {
        id: "rate-25",
        category: "ratings",
        icon: "🌟",
        name: t("achievements.rate25", "25 Ratings"),
        description: t("achievements.rate25Desc", "Give 25 ratings"),
        tier: "bronze",
        currentValue: ratingsCount,
        targetValue: 25,
        unlocked: ratingsCount >= 25,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(ratingsCount, 25)} / 25`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 25),
          i18n.language,
        ),
      },
      {
        id: "rate-50",
        category: "ratings",
        icon: "✨",
        name: t("achievements.rate50", "50 Ratings"),
        description: t("achievements.rate50Desc", "Give 50 ratings"),
        tier: "silver",
        currentValue: ratingsCount,
        targetValue: 50,
        unlocked: ratingsCount >= 50,
        points: TIER_POINTS.silver,
        progressLabel: `${Math.min(ratingsCount, 50)} / 55`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 50),
          i18n.language,
        ),
      },
      {
        id: "rate-100",
        category: "ratings",
        icon: "💫",
        name: t("achievements.rate100", "100 Ratings"),
        description: t("achievements.rate100Desc", "Give 100 ratings"),
        tier: "silver",
        currentValue: ratingsCount,
        targetValue: 100,
        unlocked: ratingsCount >= 100,
        points: TIER_POINTS.silver,
        progressLabel: `${Math.min(ratingsCount, 100)} / 100`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 100),
          i18n.language,
        ),
      },
      {
        id: "rate-200",
        category: "ratings",
        icon: "🔥",
        name: t("achievements.rate200", "200 Ratings"),
        description: t("achievements.rate200Desc", "Give 200 ratings"),
        tier: "gold",
        currentValue: ratingsCount,
        targetValue: 200,
        unlocked: ratingsCount >= 200,
        points: TIER_POINTS.gold,
        progressLabel: `${Math.min(ratingsCount, 200)} / 200`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 200),
          i18n.language,
        ),
      },
      {
        id: "rate-500",
        category: "ratings",
        icon: "💥",
        name: t("achievements.rate500", "500 Ratings"),
        description: t("achievements.rate500Desc", "Give 500 ratings"),
        tier: "legendary",
        currentValue: ratingsCount,
        targetValue: 500,
        unlocked: ratingsCount >= 500,
        points: TIER_POINTS.legendary,
        progressLabel: `${Math.min(ratingsCount, 500)} / 500`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 500),
          i18n.language,
        ),
      },

      // GENRE TIER
      {
        id: "genre-5",
        category: "genres",
        icon: "🎭",
        name: t("achievements.genre5", "5 Genres Watched"),
        description: t("achievements.genre5Desc", "Watched a movie in 5 different genres"),
        tier: "bronze",
        currentValue: genreProgress.count,
        targetValue: 5,
        unlocked: genreProgress.count >= 5,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(genreProgress.count, 5)} / 5`,
        unlockedLabel: formatUnlockMonthYear(genreProgress.dateAt5, i18n.language),
      },
      {
        id: "genre-10",
        category: "genres",
        icon: "🎭",
        name: t("achievements.genre10", "10 Genres Watched"),
        description: t("achievements.genre10Desc", "Watched a movie in 10 different genres"),
        tier: "silver",
        currentValue: genreProgress.count,
        targetValue: 10,
        unlocked: genreProgress.count >= 10,
        points: TIER_POINTS.silver,
        progressLabel: `${Math.min(genreProgress.count, 10)} / 10`,
        unlockedLabel: formatUnlockMonthYear(genreProgress.dateAt10, i18n.language),
      },
      {
        id: "genre-all",
        category: "genres",
        icon: "🎭",
        name: t("achievements.genreAll", "All Genres Watched"),
        description: t("achievements.genreAllDesc", "Watched a movie in all available genres"),
        tier: "gold",
        currentValue: genreProgress.count,
        targetValue: ALL_AVAILABLE_GENRES_TARGET,
        unlocked: genreProgress.count >= ALL_AVAILABLE_GENRES_TARGET,
        points: TIER_POINTS.gold,
        progressLabel: `${Math.min(genreProgress.count, ALL_AVAILABLE_GENRES_TARGET)} / ${ALL_AVAILABLE_GENRES_TARGET}`,
        unlockedLabel: formatUnlockMonthYear(genreProgress.dateAtAll, i18n.language),
      },

      // WATCH TIME TIER
      {
        id: "time-10",
        category: "time",
        icon: "🕐",
        name: t("achievements.time10", "10 Hours Watched"),
        description: t("achievements.time10Desc", "Watch 10 hours of content"),
        tier: "bronze",
        currentValue: watchTimeProgress.totalHours,
        targetValue: 10,
        unlocked: watchTimeProgress.totalHours >= 10,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 10)} / 10`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[10],
          i18n.language,
        ),
      },
      {
        id: "time-50",
        category: "time",
        icon: "🕐",
        name: t("achievements.time50", "50 Hours Watched"),
        description: t("achievements.time50Desc", "Watch 50 hours of content"),
        tier: "bronze",
        currentValue: watchTimeProgress.totalHours,
        targetValue: 50,
        unlocked: watchTimeProgress.totalHours >= 50,
        points: TIER_POINTS.bronze,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 50)} / 50`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[50],
          i18n.language,
        ),
      },
      {
        id: "time-100",
        category: "time",
        icon: "🕐",
        name: t("achievements.time100", "100 Hours Watched"),
        description: t("achievements.time100Desc", "Watch 100 hours of content"),
        tier: "silver",
        currentValue: watchTimeProgress.totalHours,
        targetValue: 100,
        unlocked: watchTimeProgress.totalHours >= 100,
        points: TIER_POINTS.silver,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 100)} / 100`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[100],
          i18n.language,
        ),
      },
      {
        id: "time-500",
        category: "time",
        icon: "🕐",
        name: t("achievements.time500", "500 Hours Watched"),
        description: t("achievements.time500Desc", "Watch 500 hours of content"),
        tier: "gold",
        currentValue: watchTimeProgress.totalHours,
        targetValue: 500,
        unlocked: watchTimeProgress.totalHours >= 500,
        points: TIER_POINTS.gold,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 500)} / 500`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[500],
          i18n.language,
        ),
      },

      // SPECIAL UNLOCKS
      {
        id: "founder-badge",
        category: "special",
        icon: "🏅",
        name: t("achievements.founderBadge", "Founder Badge"),
        description: t("achievements.founderBadgeDesc", "Early supporter of CineTrekker"),
        tier: "legendary",
        currentValue: isFounder ? 1 : 0,
        targetValue: 1,
        unlocked: isFounder,
        points: TIER_POINTS.legendary,
        progressLabel: isFounder ? "Unlocked" : "Invite-only",
        unlockedLabel: formatUnlockMonthYear(new Date("2026-06-01"), i18n.language),
      },
      {
        id: "marathon-night",
        category: "special",
        icon: "🌙",
        name: t("achievements.marathonNight", "Marathon Night"),
        description: t("achievements.marathonNightDesc", "Watched 5 movies in a single day"),
        tier: "legendary",
        currentValue: marathonProgress.maxCount,
        targetValue: 5,
        unlocked: marathonProgress.unlocked,
        points: TIER_POINTS.legendary,
        progressLabel: `${marathonProgress.maxCount} / 5 movies`,
        unlockedLabel: formatUnlockMonthYear(marathonProgress.unlockedDate, i18n.language),
      },
    ];
  }, [
    t,
    i18n.language,
    movieCount,
    ratingsCount,
    genreProgress,
    watchTimeProgress,
    marathonProgress,
    isFounder,
    movieMilestoneDates,
    ratingMilestoneDates,
  ]);

  // Overall calculations
  const totalAchievements = allAchievements.length;
  const unlockedAchievements = allAchievements.filter((a) => a.unlocked).length;
  const completionPercent = totalAchievements
    ? Math.round((unlockedAchievements / totalAchievements) * 100)
    : 0;

  const totalScore = allAchievements.reduce((sum, a) => sum + (a.unlocked ? a.points : 0), 0);
  const maxScore = allAchievements.reduce((sum, a) => sum + a.points, 0);

  // Apply searching and filtering
  const filteredAchievements = useMemo(() => {
    return allAchievements.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus === "unlocked" && !item.unlocked) return false;
      if (selectedStatus === "locked" && item.unlocked) return false;

      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [allAchievements, selectedCategory, selectedStatus, searchQuery]);

  // Handle clipboard copy sharing text
  const handleCopyShare = async () => {
    if (!sharingAchievement) return;

    const shareText = `🏆 I unlocked the "${sharingAchievement.name}" trophy on CineTrekker!
🎬 Milestone: ${sharingAchievement.description}
⭐ Tier: ${sharingAchievement.tier.toUpperCase()} (+${sharingAchievement.points} pts)
🍿 My Overall Score: ${totalScore} pts

Track your cinematic journey on CineTrekker!`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Achievement copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy achievement details.");
    }
  };

  return (
    <>
      <SEO
        title={t("achievements.seoTitle", "Achievements - CineTrekker")}
        description={t(
          "achievements.seoDescription",
          "Track your cinematic milestones and achievement progress",
        )}
        canonical="https://cinetrekker.vercel.app/achievements"
      />

      <div className="ct-page-shell min-h-screen px-4 pb-24 pt-20 sm:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Circular progress cinematic header */}
          <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 backdrop-blur-md">
            {/* Glowing radial background overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(229,9,20,0.12),transparent_70%)] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="space-y-3 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Trophy className="h-3.5 w-3.5 fill-current animate-bounce" />
                  Milestones & Badges
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {t("achievements.pageTitle", "Achievements")}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-lg">
                  Level up your profile and earn premium badges by logging your film and series
                  journeys.
                </p>
                <div className="pt-2">
                  <Link
                    to="/profile"
                    className="inline-flex min-h-[38px] items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors bg-background/40 hover:bg-background/60 border border-border/40 px-4 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("achievements.backToProfile", "Back to Profile")}
                  </Link>
                </div>
              </div>

              {/* Graphical Circular Progress Panel */}
              <div className="flex flex-col sm:flex-row gap-6 items-center shrink-0 w-full md:w-auto border border-border/40 bg-background/40 p-6 rounded-2xl backdrop-blur-sm">
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="url(#trophyGradient)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - completionPercent / 100)}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--rating-medium))" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-2xl font-black text-foreground">{completionPercent}%</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-black">
                      Done
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-center sm:text-left w-full">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    CinePoints
                  </div>
                  <div className="text-3xl font-black text-foreground tracking-tight">
                    {totalScore}
                    <span className="text-sm font-bold text-muted-foreground">
                      {" "}
                      / {maxScore} pts
                    </span>
                  </div>
                  <div className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-2 py-0.5 rounded-md inline-block">
                    {unlockedAchievements} / {totalAchievements} Unlocked
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtering and Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Category selection horizontal list */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "watching", label: "Watching" },
                  { value: "ratings", label: "Ratings" },
                  { value: "genres", label: "Genres" },
                  { value: "time", label: "Time" },
                  { value: "special", label: "Special" },
                ] as const
              ).map((cat) => {
                const count =
                  cat.value === "all"
                    ? allAchievements.length
                    : allAchievements.filter((a) => a.category === cat.value).length;

                return (
                  <Button
                    key={cat.value}
                    variant="ghost"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-bold transition-all border border-transparent min-h-[36px]",
                      selectedCategory === cat.value
                        ? "bg-primary text-foreground shadow-md shadow-primary/20 border-primary/40"
                        : "bg-card/40 hover:bg-card/65 text-muted-foreground hover:text-foreground border-border/40",
                    )}
                  >
                    {cat.label}
                    <span
                      className={cn(
                        "ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md leading-none",
                        selectedCategory === cat.value
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Right side controls (Search & Status) */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              {/* Search Field */}
              <div className="relative w-full md:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search achievements..."
                  className="pl-9 pr-4 rounded-xl border-border/40 bg-card/40 focus:bg-card/60 backdrop-blur-sm text-xs min-h-[38px] placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>

              {/* Status Selector */}
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as "all" | "unlocked" | "locked")}>
                <SelectTrigger className="w-28 rounded-xl border-border/40 bg-card/40 text-xs min-h-[38px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-sm">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unlocked">Unlocked</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid Layout Cards */}
          {filteredAchievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements.map((item, idx) => {
                const isUnlocked = item.unlocked;

                // Tier Styling configurations
                const tierStyles = {
                  bronze: {
                    border: "border-amber-700/35 hover:border-amber-700/60",
                    glow: "bg-amber-500/10 text-amber-500",
                    label: "Bronze",
                    text: "text-amber-500",
                    gradient: "from-amber-600/20 to-transparent",
                  },
                  silver: {
                    border: "border-slate-400/35 hover:border-slate-400/60",
                    glow: "bg-slate-400/10 text-slate-400",
                    label: "Silver",
                    text: "text-slate-400",
                    gradient: "from-slate-400/20 to-transparent",
                  },
                  gold: {
                    border: "border-yellow-500/35 hover:border-yellow-500/60",
                    glow: "bg-yellow-500/10 text-yellow-500",
                    label: "Gold",
                    text: "text-yellow-500",
                    gradient: "from-yellow-500/20 to-transparent",
                  },
                  legendary: {
                    border: "border-purple-500/35 hover:border-purple-500/60",
                    glow: "bg-purple-500/10 text-purple-400",
                    label: "Legendary",
                    text: "text-purple-400",
                    gradient: "from-purple-600/20 to-transparent",
                  },
                }[item.tier];

                const pct =
                  item.targetValue > 0
                    ? Math.min(Math.round((item.currentValue / item.targetValue) * 100), 100)
                    : 0;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.3 }}
                    whileHover={{ y: -6 }}
                    className="h-full"
                  >
                    <div
                      className={cn(
                        "ct-panel relative h-full flex flex-col justify-between overflow-hidden border p-5 rounded-2xl transition-all duration-300 group backdrop-blur-md",
                        isUnlocked
                          ? cn("bg-card/45 shadow-lg shadow-primary/5", tierStyles.border)
                          : "bg-card/15 border-border/20 opacity-70",
                      )}
                    >
                      {/* Top Right Status Badge */}
                      <div className="absolute top-4 right-4">
                        {isUnlocked ? (
                          <Trophy className={cn("h-4.5 w-4.5 animate-pulse", tierStyles.text)} />
                        ) : (
                          <Lock className="h-4.5 w-4.5 text-muted-foreground/60" />
                        )}
                      </div>

                      {/* Info layout */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          {/* Colored Gradient icon */}
                          <div
                            className={cn(
                              "w-12 h-12 flex items-center justify-center text-2xl rounded-2xl shrink-0 border border-border/40 bg-gradient-to-b shadow-sm",
                              isUnlocked ? tierStyles.gradient : "from-muted/20 to-transparent",
                            )}
                          >
                            {item.icon}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <Badge
                              className={cn(
                                "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider leading-none border-0",
                                isUnlocked ? tierStyles.glow : "bg-muted/40 text-muted-foreground",
                              )}
                            >
                              {tierStyles.label} — {item.points} pts
                            </Badge>

                            <h3 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                              {item.name}
                            </h3>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Card Progress Footer */}
                      <div className="mt-5 pt-4 border-t border-border/30">
                        {isUnlocked ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Unlocked {item.unlockedLabel || "Recently"}
                            </span>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSharingAchievement(item)}
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/45"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground/75 font-semibold">
                              <span>Progress</span>
                              <span>
                                {item.currentValue} / {item.targetValue}
                              </span>
                            </div>
                            <Progress value={pct} className="h-1.5 bg-muted/20" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="ct-panel py-16 text-center border-dashed border-border/80">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-bold">No Achievements Found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                No trophies match your active filter settings. Try modifying search query.
              </p>
            </div>
          )}

          {/* Share Modal popup card */}
          <Dialog
            open={!!sharingAchievement}
            onOpenChange={(open) => !open && setSharingAchievement(null)}
          >
            <DialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-md max-w-sm overflow-hidden p-0">
              <div className="relative p-6 pt-8 text-center space-y-6">
                {/* Glowing ring overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    CineTrekker Trophy Card
                  </span>
                  <DialogTitle className="text-lg font-black text-foreground">
                    Share Achievement
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Copy a stylized text summary of your unlocked milestone to share with friends.
                  </DialogDescription>
                </div>

                {/* Achievement graphic preview */}
                {sharingAchievement && (
                  <div className="relative border border-border/40 bg-background/50 rounded-2xl p-6 shadow-xl space-y-4 max-w-[280px] mx-auto overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                    {/* Emoji Badge icon */}
                    <div className="w-16 h-16 mx-auto flex items-center justify-center text-4xl rounded-2xl bg-card border border-border/40 shadow-md">
                      {sharingAchievement.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-wider text-primary">
                        🏆 {sharingAchievement.tier} trophy
                      </div>
                      <h3 className="font-black text-sm text-foreground">
                        {sharingAchievement.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {sharingAchievement.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/30 flex justify-between items-center text-[8px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                      <span>CineTrekker</span>
                      <span>+{sharingAchievement.points} pts</span>
                    </div>
                  </div>
                )}

                {/* Copier Actions */}
                <div className="flex gap-3 justify-center w-full">
                  <Button
                    variant="ghost"
                    onClick={() => setSharingAchievement(null)}
                    className="rounded-xl text-xs font-bold min-h-[38px] px-5"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleCopyShare}
                    className="rounded-xl text-xs font-bold min-h-[38px] px-6 bg-primary hover:bg-primary/95 text-foreground flex items-center gap-1.5 shadow-md shadow-primary/25"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Copy Summary
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
