import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UserMediaItem } from '@/types/media';

const GUEST_WATCHLIST_KEY = 'mywatch_watchlist';
const GUEST_WATCHED_KEY = 'mywatch_watched';
const GUEST_MEDIA_EVENT = 'cinetrekker:guest-media-updated';

type GuestStorageKey = typeof GUEST_WATCHLIST_KEY | typeof GUEST_WATCHED_KEY;
type MediaType = 'movie' | 'tv';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function dedupeItems(items: UserMediaItem[]) {
  const unique = new Map<string, UserMediaItem>();
  for (const item of items) {
    unique.set(`${item.mediaType}-${item.mediaId}`, item);
  }
  return Array.from(unique.values());
}

function readItems(storageKey: GuestStorageKey): UserMediaItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? dedupeItems(parsed as UserMediaItem[]) : [];
  } catch (error) {
    console.warn(`[GuestLists] Failed to read ${storageKey}`, error);
    return [];
  }
}

function writeItems(storageKey: GuestStorageKey, items: UserMediaItem[]) {
  const next = dedupeItems(items);

  if (!canUseStorage()) {
    return next;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent(GUEST_MEDIA_EVENT, { detail: { storageKey } }),
    );
  } catch (error) {
    console.warn(`[GuestLists] Failed to write ${storageKey}`, error);
  }

  return next;
}

function removeItem(storageKey: GuestStorageKey, mediaId: number, mediaType: MediaType) {
  const next = readItems(storageKey).filter(
    (item) => !(item.mediaId === mediaId && item.mediaType === mediaType),
  );
  return writeItems(storageKey, next);
}

function syncFromStorage(
  storageKey: GuestStorageKey,
  setItems: Dispatch<SetStateAction<UserMediaItem[]>>,
) {
  setItems(readItems(storageKey));
}

function useGuestItems(storageKey: GuestStorageKey) {
  const [items, setItems] = useState<UserMediaItem[]>(() => readItems(storageKey));

  const refresh = useCallback(() => {
    syncFromStorage(storageKey, setItems);
  }, [storageKey]);

  useEffect(() => {
    refresh();
    if (!canUseStorage()) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === storageKey) {
        refresh();
      }
    };

    const handleGuestUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey?: string }>).detail;
      if (!detail?.storageKey || detail.storageKey === storageKey) {
        refresh();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(GUEST_MEDIA_EVENT, handleGuestUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(GUEST_MEDIA_EVENT, handleGuestUpdate as EventListener);
    };
  }, [refresh, storageKey]);

  return { items, refresh };
}

export function readGuestWatchlist() {
  return readItems(GUEST_WATCHLIST_KEY);
}

export function readGuestWatched() {
  return readItems(GUEST_WATCHED_KEY);
}

export function clearGuestWatchlist() {
  return writeItems(GUEST_WATCHLIST_KEY, []);
}

export function clearGuestWatched() {
  return writeItems(GUEST_WATCHED_KEY, []);
}

export function useGuestWatchlist() {
  const { items, refresh } = useGuestItems(GUEST_WATCHLIST_KEY);

  const addToGuestWatchlist = useCallback((mediaId: number, mediaType: MediaType) => {
    const now = new Date().toISOString();
    const next = writeItems(GUEST_WATCHLIST_KEY, [
      ...readItems(GUEST_WATCHLIST_KEY).filter(
        (item) => !(item.mediaId === mediaId && item.mediaType === mediaType),
      ),
      {
        id: `${mediaType}-${mediaId}`,
        mediaId,
        mediaType,
        userId: 'guest',
        addedAt: now,
      },
    ]);
    refresh();
    return next;
  }, [refresh]);

  const removeFromGuestWatchlist = useCallback((mediaId: number, mediaType: MediaType) => {
    const next = removeItem(GUEST_WATCHLIST_KEY, mediaId, mediaType);
    refresh();
    return next;
  }, [refresh]);

  const isInGuestWatchlist = useCallback((mediaId: number, mediaType: MediaType) => {
    return items.some((item) => item.mediaId === mediaId && item.mediaType === mediaType);
  }, [items]);

  return {
    items,
    addToGuestWatchlist,
    removeFromGuestWatchlist,
    isInGuestWatchlist,
    clearGuestWatchlist,
    refresh,
  };
}

export function useGuestWatched() {
  const { items, refresh } = useGuestItems(GUEST_WATCHED_KEY);

  const addToGuestWatched = useCallback(
    (
      mediaId: number,
      mediaType: MediaType,
      extras: Pick<UserMediaItem, 'rating' | 'note' | 'status'> = {},
    ) => {
      const now = new Date().toISOString();
      const next = writeItems(GUEST_WATCHED_KEY, [
        ...readItems(GUEST_WATCHED_KEY).filter(
          (item) => !(item.mediaId === mediaId && item.mediaType === mediaType),
        ),
        {
          id: `${mediaType}-${mediaId}`,
          mediaId,
          mediaType,
          userId: 'guest',
          rating: extras.rating,
          note: extras.note,
          status: extras.status,
          addedAt: now,
          watchedAt: now,
        },
      ]);
      refresh();
      return next;
    },
    [refresh],
  );

  const removeFromGuestWatched = useCallback((mediaId: number, mediaType: MediaType) => {
    const next = removeItem(GUEST_WATCHED_KEY, mediaId, mediaType);
    refresh();
    return next;
  }, [refresh]);

  const isGuestWatched = useCallback((mediaId: number, mediaType: MediaType) => {
    return items.some((item) => item.mediaId === mediaId && item.mediaType === mediaType);
  }, [items]);

  return {
    items,
    addToGuestWatched,
    removeFromGuestWatched,
    isGuestWatched,
    clearGuestWatched,
    refresh,
  };
}