import { useEffect, useState } from 'react';

interface LastViewedMedia {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  timestamp: number;
}

const STORAGE_KEY = 'cinetrekker_last_viewed';

export function useLastViewed() {
  const [lastViewed, setLastViewed] = useState<LastViewedMedia | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLastViewed(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveLastViewed = (id: number, title: string, mediaType: 'movie' | 'tv') => {
    const data: LastViewedMedia = {
      id,
      title,
      mediaType,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastViewed(data);
    } catch {
      // Ignore storage errors
    }
  };

  const clearLastViewed = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLastViewed(null);
    } catch {
      // Ignore storage errors
    }
  };

  return { lastViewed, saveLastViewed, clearLastViewed };
}