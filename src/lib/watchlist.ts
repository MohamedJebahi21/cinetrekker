export const WATCHLIST_ID = 'cine-watchlist';

/**
 * Get all watchlist IDs from localStorage
 */
export function getWatchlistIds(): number[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_ID);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    // Convert to numbers and filter out invalid values
    return parsed
      .map((v) => Number(v))
      .filter((id) => Number.isInteger(id) && id > 0);
  } catch (e) {
    console.error('Failed to read watchlist from localStorage:', e);
    return [];
  }
}

/**
 * Save watchlist IDs to localStorage (removes duplicates)
 */
export function saveWatchlistIds(ids: number[]): void {
  try {
    const uniqueIds = Array.from(new Set(ids.map((id) => Number(id))))
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b); // optional: keep sorted for consistency

    localStorage.setItem(WATCHLIST_ID, JSON.stringify(uniqueIds));
  } catch (e) {
    console.error('Failed to save watchlist to localStorage:', e);
  }
}

/**
 * Add a single ID to the watchlist
 */
export function addToLocalWatchlist(id: number): boolean {
  if (!id || !Number.isInteger(id) || id <= 0) return false;

  const ids = getWatchlistIds();

  if (ids.includes(id)) return false; // already exists

  ids.push(id);
  saveWatchlistIds(ids);
  return true;
}

/**
 * Remove a single ID from the watchlist
 */
export function removeFromLocalWatchlist(id: number): boolean {
  if (!id || !Number.isInteger(id) || id <= 0) return false;

  const ids = getWatchlistIds();
  const filtered = ids.filter((existingId) => existingId !== id);

  if (filtered.length === ids.length) return false; // nothing was removed

  saveWatchlistIds(filtered);
  return true;
}

/**
 * Toggle an ID in/out of the watchlist
 * Returns true if it was added, false if it was removed
 */
export function toggleLocalWatchlist(id: number): boolean {
  if (!id || !Number.isInteger(id) || id <= 0) return false;

  const ids = getWatchlistIds();

  if (ids.includes(id)) {
    removeFromLocalWatchlist(id);
    return false; // removed
  } else {
    addToLocalWatchlist(id);
    return true; // added
  }
}

/**
 * Check if an ID is in the watchlist
 */
export function isInLocalWatchlist(id: number): boolean {
  if (!id || !Number.isInteger(id) || id <= 0) return false;

  const ids = getWatchlistIds();
  return ids.includes(id);
}

/**
 * Clear the entire watchlist
 */
export function clearLocalWatchlist(): void {
  try {
    localStorage.removeItem(WATCHLIST_ID);
  } catch (e) {
    console.error('Failed to clear watchlist from localStorage:', e);
  }
}

/**
 * Get the total count of items in the watchlist
 */
export function getWatchlistCount(): number {
  return getWatchlistIds().length;
}