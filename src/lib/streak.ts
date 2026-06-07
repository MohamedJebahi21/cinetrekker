/**
 * Utility to track and update consecutive daily visit streaks in CineTrekker.
 */

const STREAK_COUNT_KEY = "cinetrekker_visit_streak_count";
const LAST_VISIT_DATE_KEY = "cinetrekker_visit_last_date";

export type StreakInfo = {
  count: number;
  isNewToday: boolean;
};

export function updateAndGetStreak(): StreakInfo {
  if (typeof window === "undefined") {
    return { count: 0, isNewToday: false };
  }

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const lastVisitStr = window.localStorage.getItem(LAST_VISIT_DATE_KEY);
  const currentCountStr = window.localStorage.getItem(STREAK_COUNT_KEY);

  let count = currentCountStr ? parseInt(currentCountStr, 10) : 0;
  if (Number.isNaN(count) || count < 0) {
    count = 0;
  }

  // First time visiting or no record
  if (!lastVisitStr) {
    count = 1;
    window.localStorage.setItem(STREAK_COUNT_KEY, "1");
    window.localStorage.setItem(LAST_VISIT_DATE_KEY, todayStr);
    return { count: 1, isNewToday: true };
  }

  // Visited today already
  if (lastVisitStr === todayStr) {
    return { count, isNewToday: false };
  }

  const lastVisitDate = new Date(lastVisitStr);
  const todayDate = new Date(todayStr);
  
  // Calculate difference in days
  const diffTime = Math.abs(todayDate.getTime() - lastVisitDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day visit - increment streak!
    count += 1;
  } else {
    // Broken streak - reset to 1
    count = 1;
  }

  window.localStorage.setItem(STREAK_COUNT_KEY, String(count));
  window.localStorage.setItem(LAST_VISIT_DATE_KEY, todayStr);

  return { count, isNewToday: true };
}

export function getCurrentStreak(): number {
  if (typeof window === "undefined") return 0;
  const currentCountStr = window.localStorage.getItem(STREAK_COUNT_KEY);
  const count = currentCountStr ? parseInt(currentCountStr, 10) : 0;
  return Number.isNaN(count) ? 0 : count;
}
