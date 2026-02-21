// Recently viewed tracking
const STORAGE_KEY = 'cinetrekker_recently_viewed';
const MAX_ITEMS = 20;

export interface RecentlyViewedItem {
  id: number;
  mediaType: 'movie' | 'tv';
  timestamp: number;
  title?: string;
  posterPath?: string;
}

export function addToRecentlyViewed(item: Omit<RecentlyViewedItem, 'timestamp'>) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];
    
    // Handle existing records
    const filtered = items.filter(
      (i) => !(i.id === item.id && i.mediaType === item.mediaType)
    );
    
    // Add to beginning
    filtered.unshift({
      ...item,
      timestamp: Date.now(),
    });
    
    // Keep only MAX_ITEMS
    const trimmed = filtered.slice(0, MAX_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save recently viewed:', error);
  }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load recently viewed:', error);
    return [];
  }
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
}
