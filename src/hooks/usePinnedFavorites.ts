import { useCallback, useEffect, useMemo, useState } from "react";
import { profileService } from "@/services/profile";
import { normalizePinnedFavoriteKeys } from "@/utils/pinnedFavorites";

type UsePinnedFavoritesOptions = {
  userId?: string;
  onSyncError?: (error: unknown) => void;
};

export function usePinnedFavorites({
  userId,
  onSyncError,
}: UsePinnedFavoritesOptions) {
  const [pinnedFavoriteKeys, setPinnedFavoriteKeys] = useState<string[]>([]);

  const pinnedFavoritesStorageKey = useMemo(
    () => `cinetrekker_profile_favorites_${userId || "guest"}`,
    [userId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    const loadPinnedFavorites = async () => {
      try {
        if (userId) {
          const profile = await profileService.getProfile(userId);
          const normalized = normalizePinnedFavoriteKeys(
            Array.isArray(profile?.favorite_titles)
              ? profile.favorite_titles
              : [],
          );
          if (!isMounted) return;
          setPinnedFavoriteKeys(normalized);
          localStorage.setItem(
            pinnedFavoritesStorageKey,
            JSON.stringify(normalized),
          );
          return;
        }

        const raw = localStorage.getItem(pinnedFavoritesStorageKey);
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        const normalized = Array.isArray(parsed)
          ? normalizePinnedFavoriteKeys(parsed)
          : [];
        if (!isMounted) return;
        setPinnedFavoriteKeys(normalized);
        localStorage.setItem(
          pinnedFavoritesStorageKey,
          JSON.stringify(normalized),
        );
      } catch {
        if (isMounted) {
          setPinnedFavoriteKeys([]);
        }
      }
    };

    void loadPinnedFavorites();

    return () => {
      isMounted = false;
    };
  }, [pinnedFavoritesStorageKey, userId]);

  const persistPinnedFavorites = useCallback(
    async (next: string[]) => {
      const normalized = normalizePinnedFavoriteKeys(next);

      setPinnedFavoriteKeys(normalized);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          pinnedFavoritesStorageKey,
          JSON.stringify(normalized),
        );
      }

      if (userId) {
        try {
          await profileService.updateProfile(userId, {
            favorite_titles: normalized,
          });
        } catch (error) {
          onSyncError?.(error);
        }
      }

      return normalized;
    },
    [onSyncError, pinnedFavoritesStorageKey, userId],
  );

  return {
    pinnedFavoriteKeys,
    pinnedFavoritesStorageKey,
    persistPinnedFavorites,
    setPinnedFavoriteKeys,
  };
}
