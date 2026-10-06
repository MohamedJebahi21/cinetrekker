import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HiddenRecommendation, UserMediaItem } from "@/types/media";
import { useAuth } from "@/contexts/AuthContext";
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
  clearGuestWatchlist,
  clearGuestWatched,
  readGuestWatchlist,
  readGuestWatched,
  useGuestWatchlist,
  useGuestWatched,
} from "@/hooks/useGuestMediaLists";
import {
  useWatchedQuery,
  useAddToWatched as useAddToWatchedMutation,
  useRemoveFromWatched as useRemoveFromWatchedMutation,
  useUpdateWatched as useUpdateWatchedMutation,
} from "@/hooks/useWatchedQueries";
import {
  UserListsContext,
  type UserListsContextType,
} from "@/contexts/UserListsContext";
import { createLogger } from "@/lib/logger";
import { STORAGE_KEYS } from "@/contexts/userListsStorageKeys";
import { trackEngagementEvent } from "@/lib/engagement";

const logger = createLogger("user-lists");

export function AuthenticatedUserListsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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

  const [hiddenRecommendations, setHiddenRecommendations] = useState<
    HiddenRecommendation[]
  >([]);

  const watchlist = useMemo(
    () => (user ? watchlistData || [] : guestWatchlist.items),
    [guestWatchlist.items, user, watchlistData],
  );
  const watched = useMemo(
    () => (user ? watchedData || [] : guestWatched.items),
    [guestWatched.items, user, watchedData],
  );
  const loading = user ? Boolean(watchlistLoading || watchedLoading) : false;

  const watchlistSet = useMemo(() => {
    return new Set(watchlist.map((item) => `${item.mediaType}-${item.mediaId}`));
  }, [watchlist]);

  const watchedSet = useMemo(() => {
    return new Set(watched.map((item) => `${item.mediaType}-${item.mediaId}`));
  }, [watched]);

  const hiddenSet = useMemo(() => {
    return new Set(hiddenRecommendations.map((item) => `${item.mediaType}-${item.mediaId}`));
  }, [hiddenRecommendations]);

  useEffect(() => {
    const storageKey = user
      ? `${STORAGE_KEYS.hidden}_${user.id}`
      : STORAGE_KEYS.hidden;
    const storedHidden = localStorage.getItem(storageKey);
    if (storedHidden) {
      setHiddenRecommendations(JSON.parse(storedHidden));
      return;
    }

    setHiddenRecommendations([]);
  }, [user]);

  useEffect(() => {
    const storageKey = user
      ? `${STORAGE_KEYS.hidden}_${user.id}`
      : STORAGE_KEYS.hidden;
    localStorage.setItem(storageKey, JSON.stringify(hiddenRecommendations));
  }, [hiddenRecommendations, user]);

  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      syncedUserIdRef.current = null;
      return;
    }
    if (syncedUserIdRef.current === user.id) return;

    const syncLocalToServer = async () => {
      syncedUserIdRef.current = user.id;
      try {
        const guestWatchlistItems = readGuestWatchlist();
        const guestWatchedItems = readGuestWatched();

        let watchlistSyncOk = true;
        let watchedSyncOk = true;

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
            if (error) {
              watchlistSyncOk = false;
              logger.error("Error upserting watchlist during sync.", error);
            }
          } catch (error) {
            watchlistSyncOk = false;
            logger.error("Watchlist sync failed.", error);
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
            if (error) {
              watchedSyncOk = false;
              logger.error("Error upserting watched during sync.", error);
            }
          } catch (error) {
            watchedSyncOk = false;
            logger.error("Watched sync failed.", error);
          }
        }

        if (watchlistSyncOk) {
          clearGuestWatchlist();
        }
        if (watchedSyncOk) {
          clearGuestWatched();
        }
        await queryClient.invalidateQueries({
          queryKey: ["watchlist", user.id],
        });
        await queryClient.invalidateQueries({ queryKey: ["watched", user.id] });
      } catch (error) {
        logger.error("Sync local to server failed.", error);
      }
    };

    void syncLocalToServer();
  }, [queryClient, user]);

  const addToWatchlist = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      if (user) {
        await addToWatchlistMutation.mutateAsync({ mediaId, mediaType });
        trackEngagementEvent("watchlist_add", { mediaId, mediaType, auth: true });
        return;
      }

      guestWatchlist.addToGuestWatchlist(mediaId, mediaType);
      toast("Added to Watchlist (guest)");
      trackEngagementEvent("watchlist_add", { mediaId, mediaType, auth: false });
    },
    [addToWatchlistMutation, guestWatchlist, user],
  );

  const removeFromWatchlist = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      if (user) {
        await removeFromWatchlistMutation.mutateAsync({ mediaId, mediaType });
        trackEngagementEvent("watchlist_remove", { mediaId, mediaType, auth: true });
        return;
      }

      guestWatchlist.removeFromGuestWatchlist(mediaId, mediaType);
      toast(t("actions.watchlistRemoved", "Removed from watchlist"));
      trackEngagementEvent("watchlist_remove", { mediaId, mediaType, auth: false });
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
        trackEngagementEvent("watched_add", { mediaId, mediaType, auth: true });
        return;
      }

      guestWatched.addToGuestWatched(mediaId, mediaType, {
        rating: validateRating(rating),
        note: validateNote(note),
        status: status as UserMediaItem["status"],
      });
      toast(t("actions.watchedAdded", "Saved locally"), {
        description: t(
          "actions.watchedAddedGuest",
          "Marked as watched on this device. Sign in later to sync it to your account.",
        ),
      });
      trackEngagementEvent("watched_add", { mediaId, mediaType, auth: false });
    },
    [addToWatchedMutation, guestWatched, t, user],
  );

  const removeFromWatched = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      if (user) {
        await removeFromWatchedMutation.mutateAsync({ mediaId, mediaType });
        trackEngagementEvent("watched_remove", { mediaId, mediaType, auth: true });
        return;
      }

      guestWatched.removeFromGuestWatched(mediaId, mediaType);
      toast(t("actions.watchedRemoved", "Removed from watched"));
      trackEngagementEvent("watched_remove", { mediaId, mediaType, auth: false });
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
    (mediaId: number, mediaType: "movie" | "tv") =>
      watchlistSet.has(`${mediaType}-${mediaId}`),
    [watchlistSet],
  );

  const isWatched = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      watchedSet.has(`${mediaType}-${mediaId}`),
    [watchedSet],
  );

  const getWatchedItem = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      watched.find(
        (item: UserMediaItem) =>
          item.mediaId === mediaId && item.mediaType === mediaType,
      ),
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
          toast(t("recommendations.hidden", "Hidden from recommendations"));
        } catch (error) {
          logger.warn("Failed to show hidden recommendation toast.", error);
        }
        return next;
      });
    },
    [t, user],
  );

  const isHiddenFromRecommendations = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      hiddenSet.has(`${mediaType}-${mediaId}`),
    [hiddenSet],
  );

  const unhideFromRecommendations = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") => {
      setHiddenRecommendations((prev) =>
        prev.filter((item) => !(item.mediaId === mediaId && item.mediaType === mediaType))
      );
    },
    [setHiddenRecommendations],
  );

  const value = useMemo<UserListsContextType>(
    () => ({
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
      unhideFromRecommendations,
      loading,
    }),
    [
      addToWatchlist,
      addToWatched,
      getWatchedItem,
      hiddenRecommendations,
      hideFromRecommendations,
      isHiddenFromRecommendations,
      unhideFromRecommendations,
      isInWatchlist,
      isWatched,
      loading,
      removeFromWatchlist,
      removeFromWatched,
      updateWatchedItem,
      watchlist,
      watched,
    ],
  );

  return (
    <UserListsContext.Provider value={value}>
      {children}
    </UserListsContext.Provider>
  );
}
