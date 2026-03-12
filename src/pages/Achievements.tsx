import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Trophy } from "lucide-react";
import { useUserLists } from "@/contexts/user-lists-context";
import { getMovieDetails, getTVDetails } from "@/services/tmdb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";

type AchievementItem = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
  progressLabel: string;
  unlockedLabel: string | null;
};

type AchievementGroup = {
  id: string;
  title: string;
  items: AchievementItem[];
};

const ALL_AVAILABLE_GENRES_TARGET = 19;

function formatUnlockMonthYear(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString(undefined, {
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
  const { watched } = useUserLists();

  const uniqueWatchedEntries = useMemo(() => {
    const map = new Map<string, (typeof watched)[number]>();

    watched.forEach((item) => {
      const key = `${item.mediaType}-${item.mediaId}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, item);
        return;
      }

      const existingTime = new Date(
        existing.watchedAt || existing.addedAt || 0,
      ).getTime();
      const currentTime = new Date(
        item.watchedAt || item.addedAt || 0,
      ).getTime();

      if (currentTime >= existingTime) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [watched]);

  const { data: watchedInsights = [] } = useQuery({
    queryKey: [
      "achievements-watched-insights",
      uniqueWatchedEntries.map((item) => `${item.mediaType}-${item.mediaId}`),
    ],
    enabled: uniqueWatchedEntries.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const capped = uniqueWatchedEntries.slice(0, 200);
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
                  : details.episode_run_time?.[0] || 0,
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
        .filter((item) => typeof item.rating === "number")
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

    return {
      count: seen.size,
      dateAt5,
      dateAt10,
      dateAtAll,
    };
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

  const groups = useMemo<AchievementGroup[]>(() => {
    const watchingMilestones: AchievementItem[] = [
      {
        id: "watch-first",
        icon: "🎬",
        name: "First Movie Logged",
        description: "Watch your first movie",
        unlocked: movieCount >= 1,
        progressLabel: `${Math.min(movieCount, 1)} / 1 movies`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 1),
        ),
      },
      {
        id: "watch-10",
        icon: "🎬",
        name: "10 Movies Watched",
        description: "Watch 10 movies",
        unlocked: movieCount >= 10,
        progressLabel: `${Math.min(movieCount, 10)} / 10 movies`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 10),
        ),
      },
      {
        id: "watch-50",
        icon: "🎬",
        name: "50 Movies Watched",
        description: "Watch 50 movies",
        unlocked: movieCount >= 50,
        progressLabel: `${Math.min(movieCount, 50)} / 50 movies`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 50),
        ),
      },
      {
        id: "watch-100",
        icon: "🎬",
        name: "100 Movies Watched",
        description: "Watch 100 movies",
        unlocked: movieCount >= 100,
        progressLabel: `${Math.min(movieCount, 100)} / 100 movies`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 100),
        ),
      },
      {
        id: "watch-250",
        icon: "🎬",
        name: "250 Movies Watched",
        description: "Watch 250 movies",
        unlocked: movieCount >= 250,
        progressLabel: `${Math.min(movieCount, 250)} / 250 movies`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 250),
        ),
      },
      {
        id: "watch-500",
        icon: "🎬",
        name: "500 Movies Watched",
        description: "Watch 500 movies",
        unlocked: movieCount >= 500,
        progressLabel: `${Math.min(movieCount, 500)} / 500 movies`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(movieMilestoneDates, 500),
        ),
      },
    ];

    const ratingMilestones: AchievementItem[] = [
      {
        id: "rate-first",
        icon: "⭐",
        name: "First Rating Given",
        description: "Rate your first title",
        unlocked: ratingsCount >= 1,
        progressLabel: `${Math.min(ratingsCount, 1)} / 1 ratings`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 1),
        ),
      },
      {
        id: "rate-25",
        icon: "⭐",
        name: "25 Ratings",
        description: "Give 25 ratings",
        unlocked: ratingsCount >= 25,
        progressLabel: `${Math.min(ratingsCount, 25)} / 25 ratings`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 25),
        ),
      },
      {
        id: "rate-50",
        icon: "⭐",
        name: "50 Ratings",
        description: "Give 50 ratings",
        unlocked: ratingsCount >= 50,
        progressLabel: `${Math.min(ratingsCount, 50)} / 50 ratings`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 50),
        ),
      },
      {
        id: "rate-100",
        icon: "⭐",
        name: "100 Ratings",
        description: "Give 100 ratings",
        unlocked: ratingsCount >= 100,
        progressLabel: `${Math.min(ratingsCount, 100)} / 100 ratings`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 100),
        ),
      },
      {
        id: "rate-200",
        icon: "⭐",
        name: "200 Ratings",
        description: "Give 200 ratings",
        unlocked: ratingsCount >= 200,
        progressLabel: `${Math.min(ratingsCount, 200)} / 200 ratings`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 200),
        ),
      },
      {
        id: "rate-500",
        icon: "⭐",
        name: "500 Ratings",
        description: "Give 500 ratings",
        unlocked: ratingsCount >= 500,
        progressLabel: `${Math.min(ratingsCount, 500)} / 500 ratings`,
        unlockedLabel: formatUnlockMonthYear(
          getThresholdDate(ratingMilestoneDates, 500),
        ),
      },
    ];

    const genreExplorer: AchievementItem[] = [
      {
        id: "genre-5",
        icon: "🎭",
        name: "5 Genres Watched",
        description: "Watched a movie in 5 different genres",
        unlocked: genreProgress.count >= 5,
        progressLabel: `${Math.min(genreProgress.count, 5)} / 5 genres`,
        unlockedLabel: formatUnlockMonthYear(genreProgress.dateAt5),
      },
      {
        id: "genre-10",
        icon: "🎭",
        name: "10 Genres Watched",
        description: "Watched a movie in 10 different genres",
        unlocked: genreProgress.count >= 10,
        progressLabel: `${Math.min(genreProgress.count, 10)} / 10 genres`,
        unlockedLabel: formatUnlockMonthYear(genreProgress.dateAt10),
      },
      {
        id: "genre-all",
        icon: "🎭",
        name: "All Genres Watched",
        description: "Watched a movie in all available genres",
        unlocked: genreProgress.count >= ALL_AVAILABLE_GENRES_TARGET,
        progressLabel: `${Math.min(genreProgress.count, ALL_AVAILABLE_GENRES_TARGET)} / ${ALL_AVAILABLE_GENRES_TARGET} genres`,
        unlockedLabel: formatUnlockMonthYear(genreProgress.dateAtAll),
      },
    ];

    const watchTimeMilestones: AchievementItem[] = [
      {
        id: "time-10",
        icon: "🕐",
        name: "10 Hours Watched",
        description: "Watch 10 hours of content",
        unlocked: watchTimeProgress.totalHours >= 10,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 10)} / 10 hours`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[10],
        ),
      },
      {
        id: "time-50",
        icon: "🕐",
        name: "50 Hours Watched",
        description: "Watch 50 hours of content",
        unlocked: watchTimeProgress.totalHours >= 50,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 50)} / 50 hours`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[50],
        ),
      },
      {
        id: "time-100",
        icon: "🕐",
        name: "100 Hours Watched",
        description: "Watch 100 hours of content",
        unlocked: watchTimeProgress.totalHours >= 100,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 100)} / 100 hours`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[100],
        ),
      },
      {
        id: "time-500",
        icon: "🕐",
        name: "500 Hours Watched",
        description: "Watch 500 hours of content",
        unlocked: watchTimeProgress.totalHours >= 500,
        progressLabel: `${Math.min(watchTimeProgress.totalHours, 500)} / 500 hours`,
        unlockedLabel: formatUnlockMonthYear(
          watchTimeProgress.thresholdDates[500],
        ),
      },
    ];

    return [
      {
        id: "watching",
        title: "🎬 Watching Milestones",
        items: watchingMilestones,
      },
      { id: "ratings", title: "⭐ Rating Milestones", items: ratingMilestones },
      { id: "genres", title: "🎭 Genre Explorer", items: genreExplorer },
      { id: "time", title: "🕐 Watch Time", items: watchTimeMilestones },
    ];
  }, [
    genreProgress.count,
    genreProgress.dateAt10,
    genreProgress.dateAt5,
    genreProgress.dateAtAll,
    movieCount,
    movieMilestoneDates,
    ratingMilestoneDates,
    ratingsCount,
    watchTimeProgress.thresholdDates,
    watchTimeProgress.totalHours,
  ]);

  const totalAchievements = groups.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const unlockedAchievements = groups.reduce(
    (total, group) =>
      total + group.items.filter((item) => item.unlocked).length,
    0,
  );
  const completionPercent = totalAchievements
    ? Math.round((unlockedAchievements / totalAchievements) * 100)
    : 0;

  return (
    <>
      <SEO
        title="Achievements - CineTrekker"
        description="Track your cinematic milestones and achievement progress"
        canonical="https://cinetrekker.vercel.app/achievements"
      />

      <div className="page-container max-w-full overflow-x-hidden pt-20 pb-24 md:pb-0">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Achievements</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Your cinematic milestones
            </p>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <Card className="mb-8 border-neutral-800/60 bg-neutral-900/60">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-100">
                Progress Summary
              </p>
              <p className="text-sm text-neutral-300">
                {unlockedAchievements} Achievements Unlocked /{" "}
                {totalAchievements} Total
              </p>
            </div>
            <Progress
              value={completionPercent}
              className="h-3 bg-muted [&>div]:bg-primary"
            />
            <p className="text-xs text-neutral-400">
              {completionPercent}% complete
            </p>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id} className="space-y-3">
              <h2 className="text-xl font-bold">{group.title}</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {group.items.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "relative border transition-all duration-200",
                      item.unlocked
                        ? "border-primary/60 bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.25)]"
                        : "border-neutral-700 bg-neutral-900/70 opacity-70",
                    )}
                  >
                    {!item.unlocked ? (
                      <span className="absolute right-3 top-3 rounded-full border border-neutral-600 bg-black/70 p-1 text-neutral-300">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="absolute right-3 top-3 text-primary">
                        <Trophy className="h-4 w-4" />
                      </span>
                    )}

                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-start gap-3 text-base">
                        <span className="text-2xl leading-none">
                          {item.icon}
                        </span>
                        <span>{item.name}</span>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      <p className="text-sm text-neutral-300">
                        {item.description}
                      </p>
                      {item.unlocked ? (
                        <p className="text-xs text-primary">
                          Unlocked {item.unlockedLabel ?? "Recently"}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400">
                          {item.progressLabel}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
