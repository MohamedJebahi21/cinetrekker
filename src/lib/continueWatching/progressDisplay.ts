/**
 * Returns a user-facing percentage only when its denominator is known from
 * release-aware metadata. Never manufacture a percentage from episode count:
 * that value can look like lost progress once authoritative metadata arrives.
 */
export function getReleasedProgressPercent(
  watchedEpisodeCount: number,
  releasedEpisodeCount: number | null,
): number | null {
  if (!releasedEpisodeCount || releasedEpisodeCount <= 0) return null;

  return Math.min(100, Math.round((watchedEpisodeCount / releasedEpisodeCount) * 100));
}
