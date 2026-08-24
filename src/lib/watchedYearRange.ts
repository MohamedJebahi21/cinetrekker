export type WatchedYearRange = [number, number];

export type WatchedYearBounds = {
  minYear: number;
  maxYear: number;
};

export function normalizeWatchedYearRange(
  range: WatchedYearRange,
  { minYear, maxYear }: WatchedYearBounds,
): WatchedYearRange {
  const safeMin = Number.isFinite(minYear) ? Math.trunc(minYear) : 1900;
  const safeMax = Number.isFinite(maxYear)
    ? Math.max(safeMin, Math.trunc(maxYear))
    : Math.max(safeMin, new Date().getFullYear());
  const start = Number.isFinite(range[0]) ? Math.trunc(range[0]) : safeMin;
  const end = Number.isFinite(range[1]) ? Math.trunc(range[1]) : safeMax;
  const clampedStart = Math.min(safeMax, Math.max(safeMin, start));
  const clampedEnd = Math.min(safeMax, Math.max(safeMin, end));

  return clampedStart <= clampedEnd
    ? [clampedStart, clampedEnd]
    : [clampedEnd, clampedStart];
}
