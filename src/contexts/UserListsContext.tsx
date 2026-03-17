import React, { useState, useEffect, ReactNode, useCallback } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { UserMediaItem, HiddenRecommendation } from "@/types/media";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { validateNote, validateRating } from "@/lib/validation";
import {
  useWatchlistQuery,
  useAddToWatchlist as useAddToWatchlistMutation,
  useRemoveFromWatchlist as useRemoveFromWatchlistMutation,
} from "@/hooks/useWatchlistQueries";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  STORAGE_KEYS,
  UserListsContext,
  type UserListsContextType,
} from "@/contexts/user-lists-context";
import {
  useWatchedQuery,
  useAddToWatched as useAddToWatchedMutation,
  useRemoveFromWatched as useRemoveFromWatchedMutation,
  useUpdateWatched as useUpdateWatchedMutation,
} from "@/hooks/useWatchedQueries";
import {
  clearGuestWatchlist,
  clearGuestWatched,
  readGuestWatchlist,
  readGuestWatched,
  useGuestWatchlist,
  useGuestWatched,
} from '@/hooks/useGuestMediaLists';

export function UserListsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Use TanStack Query hooks for watchlist and watched
  const { data: watchlistData = [], isLoading: watchlistLoading } =
    useWatchlistQuery();
  const { data: watchedData = [], isLoading: watchedLoading } =
    useWatchedQuery();

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();
  const addToWatchedMutation = useAddToWatchedMutation();
  const removeFromWatchedMutation = useRemoveFromWatchedMutation();
  const updateWatchedMutation = useUpdateWatchedMutation();
  const guestWatchlist = useGuestWatchlist();
  const guestWatched = useGuestWatched();

  const [watchlist, setWatchlist] = useState<UserMediaItem[]>([]);
  const [watched, setWatched] = useState<UserMediaItem[]>([]);
  const [hiddenRecommendations, setHiddenRecommendations] = useState<
    HiddenRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Sync query data with local state for backward compatibility
  useEffect(() => {
    // shallow stable compare to avoid updating state when query returns new array references
    const areSame = (a: UserMediaItem[] = [], b: UserMediaItem[] = []) => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i].mediaId !== b[i].mediaId || a[i].mediaType !== b[i].mediaType)
          return false;
      }
      return true;
    };

    // If a user is signed in, prefer server-provided lists
    if (user) {
      if (!areSame(watchlist, watchlistData)) setWatchlist(watchlistData || []);
      if (!areSame(watched, watchedData)) setWatched(watchedData || []);
    } else {
      if (!areSame(watchlist, guestWatchlist.items)) {
        setWatchlist(guestWatchlist.items);
      }
      if (!areSame(watched, guestWatched.items)) {
        setWatched(guestWatched.items);
      }
    }

    // only update loading when it actually changes
    setLoading(Boolean(watchlistLoading || watchedLoading));
  }, [
    watchlistData,
    watchedData,
    watchlistLoading,
    watchedLoading,
    watchlist,
    watched,
    user,
    guestWatchlist.items,
    guestWatched.items,
  ]);

  // Load hidden recommendations from localStorage
  useEffect(() => {
    const loadHidden = () => {
      if (user) {
        const storedHidden = localStorage.getItem(
          `${STORAGE_KEYS.hidden}_${user.id}`,
        );
        if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
      } else {
        const storedHidden = localStorage.getItem(STORAGE_KEYS.hidden);
        if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
      }
    };
    loadHidden();
  }, [user]);

  // Save hidden recommendations to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(
        `${STORAGE_KEYS.hidden}_${user.id}`,
        JSON.stringify(hiddenRecommendations),
      );
    } else {
      localStorage.setItem(
        STORAGE_KEYS.hidden,
        JSON.stringify(hiddenRecommendations),
      );
    }
  }, [hiddenRecommendations, user]);

  // Persist watchlist/watched for guests (localStorage)
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(
          STORAGE_KEYS.watchlist,
          JSON.stringify(watchlist || []),
        );
        localStorage.setItem(
          STORAGE_KEYS.watched,
          JSON.stringify(watched || []),
        );
      } catch (e) {
        // ignore storage errors
      }
    }
  }, [watchlist, watched, user]);

  // Sync local guest lists to server on sign-in (batched upserts)
  useEffect(() => {
    if (!user) return;

    const syncLocalToServer = async () => {
      try {
        const guestWatchlistItems = readGuestWatchlist();
        const guestWatchedItems = readGuestWatched();

        if (guestWatchlistItems.length > 0) {
          const rows = guestWatchlistItems.map((item) => ({
              user_id: user.id,
              media_id: item.mediaId,
              media_type: item.mediaType,
              added_at: item.addedAt || new Date().toISOString(),
            }));

          try {
            const { error } = await supabase
              .from("user_watchlist")
              .upsert(rows, { onConflict: "user_id,media_id,media_type" });
            if (error)
              console.error("Error upserting watchlist during sync:", error);
          } catch (err) {
            console.error("Watchlist sync failed:", err);
          }
        }

        if (guestWatchedItems.length > 0) {
          const rows = guestWatchedItems.map((item) => ({
              user_id: user.id,
              media_id: item.mediaId,
              media_type: item.mediaType,
              rating: item.rating ?? null,
              note: item.note ?? null,
              status: item.status ?? "completed",
              watched_at:
                item.watchedAt || item.addedAt || new Date().toISOString(),
            }));

          try {
            const { error } = await supabase
              .from("user_watched")
              .upsert(rows, { onConflict: "user_id,media_id,media_type" });
            if (error)
              console.error("Error upserting watched during sync:", error);
          } catch (err) {
            console.error("Watched sync failed:", err);
          }
        }

        clearGuestWatchlist();
        clearGuestWatched();
        await queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      } catch (e) {
        console.error("Sync local to server failed", e);
      }
    };

    syncLocalToServer();
  }, [queryClient, user]);

  // Wrapper functions to maintain backward compatibility with existing code
  const addToWatchlist = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      if (user) {
        await addToWatchlistMutation.mutateAsync({ mediaId, mediaType });
      } else {
        const next = guestWatchlist.addToGuestWatchlist(mediaId, mediaType);
        setWatchlist(next);
        toast('Added to Watchlist (guest)');
      }
    },
    [addToWatchlistMutation, guestWatchlist, user],
  );

  const removeFromWatchlist = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      if (user) {
        await removeFromWatchlistMutation.mutateAsync({ mediaId, mediaType });
      } else {
        const next = guestWatchlist.removeFromGuestWatchlist(mediaId, mediaType);
        setWatchlist(next);
        toast(t("actions.watchlistRemoved", "Removed from watchlist"));
      }
    },
    [guestWatchlist, removeFromWatchlistMutation, t, user],
  );

  const addToWatched = useCallback(
    async (
      mediaId: number,
      mediaType: "movie" | "tv",
      rating?: number,
      note?: string,
      status?: string,
    ) => {
      if (user) {
        await addToWatchedMutation.mutateAsync({
          mediaId,
          mediaType,
          rating,
          note,
          status,
        });
      } else {
        const next = guestWatched.addToGuestWatched(mediaId, mediaType, {
          rating: validateRating(rating),
          note: validateNote(note),
          status: status as UserMediaItem['status'],
        });
        setWatched(next);
        toast(t("actions.watchedAdded", "Saved locally"), {
          description: t(
            "actions.watchedAddedGuest",
            "Marked as watched on this device. Sign in later to sync it to your account.",
          ),
        });
      }
    },
    [addToWatchedMutation, guestWatched, t, user],
  );

  const removeFromWatched = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      if (user) {
        await removeFromWatchedMutation.mutateAsync({ mediaId, mediaType });
      } else {
        const next = guestWatched.removeFromGuestWatched(mediaId, mediaType);
        setWatched(next);
        toast(t("actions.watchedRemoved", "Removed from watched"));
      }
    },
    [guestWatched, removeFromWatchedMutation, t, user],
  );

  const updateWatchedItem = useCallback(
    (
      mediaId: number,
      mediaType: "movie" | "tv",
      updates: Partial<UserMediaItem>,
    ) => {
      updateWatchedMutation.mutate({ mediaId, mediaType, updates });
    },
    [updateWatchedMutation],
  );

  const isInWatchlist = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") => {
      return watchlist.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      );
    },
    [watchlist],
  );

  const isWatched = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") => {
      return watched.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      );
    },
    [watched],
  );

  const getWatchedItem = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") => {
      return watched.find(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      );
    },
    [watched],
  );

  const hideFromRecommendations = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") => {
      const newItem: HiddenRecommendation = {
        id: `${mediaType}-${mediaId}`,
        mediaId,
        mediaType,
        userId: user?.id || "local",
        hiddenAt: new Date().toISOString(),
      };
      setHiddenRecommendations((prev) => {
        const next = [...prev, newItem];
        try {
          if (!user) {
            toast(t("recommendations.hidden", "Hidden from recommendations"), {
              description: t(
                "recommendations.hiddenGuest",
                "Hidden locally. Sign in to persist across devices.",
              ),
              action: {
                label: t("common.undo", "Undo"),
                onClick: () =>
                  setHiddenRecommendations((prev2) =>
                    prev2.filter((h) => h.id !== newItem.id),
                  ),
              },
            });
          } else {
            toast(t("recommendations.hidden", "Hidden from recommendations"));
          }
        } catch (e) {
          console.warn("Failed to show hidden recommendation toast:", e);
        }
        return next;
      });
    },
    [t, user],
  );

  const isHiddenFromRecommendations = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") => {
      return hiddenRecommendations.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      );
    },
    [hiddenRecommendations],
  );

  return (
    <UserListsContext.Provider
      value={{
        watchlist,
        watched,
        hiddenRecommendations,
        addToWatchlist,
        removeFromWatchlist,
        addToWatched,
        removeFromWatched,
        updateWatchedItem,
        isInWatchlist,
        isWatched,
        getWatchedItem,
        hideFromRecommendations,
        isHiddenFromRecommendations,
        loading,
      }}
    >
      {children}
    </UserListsContext.Provider>
  );
}
