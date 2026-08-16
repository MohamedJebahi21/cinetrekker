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

export function buildMonthlyCineQuests(
  watched: UserMediaItem[],
  watchlist: UserMediaItem[],
  now = new Date(),
): CineQuest[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const watchedThisMonth = uniqueItems(watched.filter((item) => isInCurrentMonth(item, monthStart)));
  const movieCount = watchedThisMonth.filter((item) => item.mediaType === "movie").length;
  const tvCount = watchedThisMonth.filter((item) => item.mediaType === "tv").length;
  const ratedCount = watchedThisMonth.filter((item) => typeof item.rating === "number" && item.rating > 0).length;
  const watchlistCount = uniqueItems(watchlist).length;

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
      movieCount,
      "Double Feature badge",
      "amber",
    ),
    quest(
      "monthly-series-starter",
      "Series Starter",
      "Watch three TV shows and keep your series radar moving.",
      3,
      tvCount,
      "Series Starter badge",
      "violet",
    ),
    quest(
      "monthly-rate-card",
      "Rate Your Night",
      "Rate three titles after watching them so your taste gets smarter.",
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
  ];
}
