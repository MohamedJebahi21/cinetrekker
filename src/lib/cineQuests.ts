import type { UserMediaItem } from "@/types/media";

export interface CineQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: string;
  accent: "rose" | "amber" | "violet" | "emerald";
  completed: boolean;
}

export function getQuestMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getQuestMonthLabel(date = new Date(), locale?: string) {
  return date.toLocaleDateString(locale || undefined, { month: "long", year: "numeric" });
}

function uniqueItems(items: UserMediaItem[]) {
  const unique = new Map<string, UserMediaItem>();
  items.forEach((item) => unique.set(`${item.mediaType}-${item.mediaId}`, item));
  return Array.from(unique.values());
}

function isInCurrentMonth(item: UserMediaItem, monthStart: Date) {
  const timestamp = item.watchedAt || item.addedAt;
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !Number.isNaN(date.getTime()) && date >= monthStart;
}

function countActiveDays(items: UserMediaItem[]) {
  const activeDays = new Set<string>();
  items.forEach((item) => {
    if (!item.watchedAt) return;
    const watchedDate = new Date(item.watchedAt);
    if (Number.isNaN(watchedDate.getTime())) return;
    activeDays.add(watchedDate.toISOString().slice(0, 10));
  });
  return activeDays.size;
}

export function buildMonthlyCineQuests(
  watched: UserMediaItem[],
  watchlist: UserMediaItem[],
  now = new Date(),
): CineQuest[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const watchedThisMonth = uniqueItems(
    watched.filter((item) => isInCurrentMonth(item, monthStart)),
  );
  const moviesThisMonth = watchedThisMonth.filter(
    (item) => item.mediaType === "movie",
  );
  const tvThisMonth = watchedThisMonth.filter((item) => item.mediaType === "tv");
  const ratedCount = watchedThisMonth.filter(
    (item) => typeof item.rating === "number" && item.rating > 0,
  ).length;
  const watchlistCount = uniqueItems(watchlist).length;
  const watchlistAddedThisMonth = uniqueItems(
    watchlist.filter((item) => isInCurrentMonth(item, monthStart)),
  ).length;
  const activeDayCount = countActiveDays(watchedThisMonth);

  const quest = (
    id: string,
    title: string,
    description: string,
    target: number,
    progress: number,
    reward: string,
    accent: CineQuest["accent"],
  ): CineQuest => ({
    id,
    title,
    description,
    target,
    progress: Math.min(target, Math.max(0, progress)),
    reward,
    accent,
    completed: progress >= target,
  });

  return [
    quest(
      "monthly-opening-credits",
      "Opening Credits",
      "Log three titles to start your month with momentum.",
      3,
      watchedThisMonth.length,
      "First Look badge",
      "rose",
    ),
    quest(
      "monthly-double-feature",
      "Double Feature",
      "Watch two movies this month — make it a night worth remembering.",
      2,
      moviesThisMonth.length,
      "Double Feature badge",
      "amber",
    ),
    quest(
      "monthly-series-starter",
      "Series Starter",
      "Log three TV shows and keep your series radar moving.",
      3,
      tvThisMonth.length,
      "Series Starter badge",
      "violet",
    ),
    quest(
      "monthly-rate-card",
      "Rate Your Night",
      "Rate three watched titles so your taste profile gets sharper.",
      3,
      ratedCount,
      "Critic badge",
      "emerald",
    ),
    quest(
      "monthly-curator",
      "The Curator",
      "Keep five titles in your watchlist for your next great decision.",
      5,
      watchlistCount,
      "Curator badge",
      "rose",
    ),
    quest(
      "monthly-marathon",
      "Movie Marathon",
      "Log five movies this month and build a memorable run.",
      5,
      moviesThisMonth.length,
      "Marathon badge",
      "amber",
    ),
    quest(
      "monthly-steady-viewer",
      "Steady Viewer",
      "Log activity on three different days this month to keep your rhythm alive.",
      3,
      activeDayCount,
      "Steady Viewer badge",
      "emerald",
    ),
    quest(
      "monthly-fresh-shelf",
      "Fresh Shelf",
      "Add three new titles to your watchlist and give future-you options.",
      3,
      watchlistAddedThisMonth,
      "Fresh Shelf badge",
      "violet",
    ),
  ];
}
