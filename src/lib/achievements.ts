import { UserMediaItem } from '@/types/media';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export function calculateAchievements(watched: UserMediaItem[], watchlist: UserMediaItem[]): Achievement[] {
  const achievements: Achievement[] = [];

  // First Watch
  achievements.push({
    id: 'first-watch',
    title: 'First Steps',
    description: 'Watch your first movie or show',
    icon: '🎬',
    unlocked: watched.length >= 1,
    unlockedAt: watched.length >= 1 ? watched[0]?.addedAt : undefined,
    tier: 'bronze',
  });

  // Watch milestones
  const watchMilestones = [
    { count: 10, title: 'Getting Started', desc: 'Watch 10 titles', tier: 'bronze' as const },
    { count: 50, title: 'Enthusiast', desc: 'Watch 50 titles', tier: 'silver' as const },
    { count: 100, title: 'Cinephile', desc: 'Watch 100 titles', tier: 'gold' as const },
    { count: 250, title: 'Movie Buff', desc: 'Watch 250 titles', tier: 'platinum' as const },
    { count: 500, title: 'Legend', desc: 'Watch 500 titles', tier: 'platinum' as const },
  ];

  watchMilestones.forEach((milestone) => {
    achievements.push({
      id: `watch-${milestone.count}`,
      title: milestone.title,
      description: milestone.desc,
      icon: '⭐',
      unlocked: watched.length >= milestone.count,
      progress: Math.min(watched.length, milestone.count),
      target: milestone.count,
      tier: milestone.tier,
    });
  });

  // Genre Explorer - watch 10 from same genre
  const genreCount = new Map<number, number>();
  watched.forEach((item) => {
    const genreIds = (item as Record<string, unknown>).genreIds as number[] | undefined;
    genreIds?.forEach((id: number) => {
      genreCount.set(id, (genreCount.get(id) || 0) + 1);
    });
  });
  const maxGenreCount = Math.max(...Array.from(genreCount.values()), 0);

  achievements.push({
    id: 'genre-explorer',
    title: 'Genre Explorer',
    description: 'Watch 10 titles from the same genre',
    icon: '🎭',
    unlocked: maxGenreCount >= 10,
    progress: Math.min(maxGenreCount, 10),
    target: 10,
    tier: 'silver',
  });

  // Marathon - watch 5 in one day
  const watchesByDate = new Map<string, number>();
  watched.forEach((item) => {
    const date = item.addedAt?.split('T')[0];
    if (date) {
      watchesByDate.set(date, (watchesByDate.get(date) || 0) + 1);
    }
  });
  const maxInOneDay = Math.max(...Array.from(watchesByDate.values()), 0);

  achievements.push({
    id: 'marathon',
    title: 'Marathon Master',
    description: 'Watch 5 titles in one day',
    icon: '🏃',
    unlocked: maxInOneDay >= 5,
    progress: Math.min(maxInOneDay, 5),
    target: 5,
    tier: 'gold',
  });

  // Early Bird - watch before 10 AM
  achievements.push({
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Watch something before 10 AM',
    icon: '🌅',
    unlocked: false, // Would need timestamp data
    tier: 'bronze',
  });

  // Night Owl - watch after midnight
  achievements.push({
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Watch something after midnight',
    icon: '🦉',
    unlocked: false, // Would need timestamp data
    tier: 'bronze',
  });

  // Rated 100 - rate 100 titles
  const ratedCount = watched.filter((i) => i.rating).length;
  achievements.push({
    id: 'rated-100',
    title: 'Critic',
    description: 'Rate 100 titles',
    icon: '⭐',
    unlocked: ratedCount >= 100,
    progress: Math.min(ratedCount, 100),
    target: 100,
    tier: 'gold',
  });

  // Watchlist Builder - add 50 to watchlist
  achievements.push({
    id: 'watchlist-builder',
    title: 'Watchlist Builder',
    description: 'Add 50 titles to your watchlist',
    icon: '📋',
    unlocked: watchlist.length >= 50,
    progress: Math.min(watchlist.length, 50),
    target: 50,
    tier: 'silver',
  });

  // Perfect Score - give a 10/10 rating
  const hasPerfectScore = watched.some((i) => i.rating === 10);
  achievements.push({
    id: 'perfect-score',
    title: 'Perfect 10',
    description: 'Give a title a  10/10 rating',
    icon: '💯',
    unlocked: hasPerfectScore,
    tier: 'bronze',
  });

  // Streak achievements
  achievements.push({
    id: 'streak-7',
    title: 'Dedicated',
    description: 'Watch for 7 days in a row',
    icon: '🔥',
    unlocked: false, // Calculate from dates
    progress: 0,
    target: 7,
    tier: 'silver',
  });

  achievements.push({
    id: 'streak-30',
    title: 'Unstoppable',
    description: 'Watch for 30 days in a row',
    icon: '🔥',
    unlocked: false,
    progress: 0,
    target: 30,
    tier: 'platinum',
  });

  return achievements.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return 0;
  });
}

export function getAchievementProgress(achievements: Achievement[]): {
  total: number;
  unlocked: number;
  percentage: number;
} {
  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return {
    total,
    unlocked,
    percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
  };
}
