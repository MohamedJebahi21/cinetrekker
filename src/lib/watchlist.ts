export const WATCHLIST_ID = 'cine-watchlist';

export function getWatchlistIds(): number[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_ID);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((v) => Number(v)).filter(Boolean);
    return [];
  } catch (e) {
    console.error('Failed to read watchlist from localStorage', e);
    return [];
  }
}

export function saveWatchlistIds(ids: number[]) {
  try {
    const unique = Array.from(new Set(ids.map((i) => Number(i))));
    localStorage.setItem(WATCHLIST_ID, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save watchlist to localStorage', e);
  }
}

export function addToLocalWatchlist(id: number) {
  const ids = getWatchlistIds();
  if (!ids.includes(id)) {
    ids.push(id);
    saveWatchlistIds(ids);
  }
}

export function removeFromLocalWatchlist(id: number) {
  const ids = getWatchlistIds().filter((i) => i !== id);
  saveWatchlistIds(ids);
}

export function toggleLocalWatchlist(id: number) {
  const ids = getWatchlistIds();
  if (ids.includes(id)) {
    removeFromLocalWatchlist(id);
    return false;
  } else {
    addToLocalWatchlist(id);
    return true;
  }
}

export function isInLocalWatchlist(id: number) {
  const ids = getWatchlistIds();
  return ids.includes(id);
}
