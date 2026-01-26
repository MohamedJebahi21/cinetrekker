import { useEffect, useState, useCallback } from 'react';

interface LastViewedMedia {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  timestamp: number;
}

const STORAGE_KEY = 'cinetrekker_last_viewed';
const MAX_ITEMS = 3;

export function useLastViewed() {
  const [lastViewedList, setLastViewedList] = useState<LastViewedMedia[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle migration from single item to array
        if (Array.isArray(parsed)) {
          setLastViewedList(parsed);
        } else if (parsed && typeof parsed === 'object' && 'id' in parsed) {
          // Migrate old single-item format to array
          setLastViewedList([parsed]);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveLastViewed = useCallback((id: number, title: string, mediaType: 'movie' | 'tv') => {
    const newItem: LastViewedMedia = {
      id,
      title,
      mediaType,
      timestamp: Date.now(),
    };
    
    setLastViewedList(prev => {
      // Remove any existing entry for this item
      const filtered = prev.filter(item => !(item.id === id && item.mediaType === mediaType));
      // Add new item at the beginning
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      
      return updated;
    });
  }, []);

  const clearLastViewed = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLastViewedList([]);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // For backwards compatibility - return the most recent item
  const lastViewed = lastViewedList[0] || null;

  return { 
    lastViewed, 
    lastViewedList, 
    saveLastViewed, 
    clearLastViewed 
  };
}
