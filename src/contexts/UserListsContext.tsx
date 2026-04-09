import React, {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { HiddenRecommendation, UserMediaItem } from "@/types/media";
import { useAuth } from "@/contexts/AuthContext";
import { validateNote, validateRating } from "@/lib/validation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useGuestWatchlist,
  useGuestWatched,
} from "@/hooks/useGuestMediaLists";
import { STORAGE_KEYS } from "@/contexts/userListsStorageKeys";
import { trackEngagementEvent } from "@/lib/engagement";

export interface UserListsContextType {
  watchlist: UserMediaItem[];
  watched: UserMediaItem[];
  hiddenRecommendations: HiddenRecommendation[];
  addToWatchlist: (mediaId: number, mediaType: "movie" | "tv") => Promise<void>;
  removeFromWatchlist: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => Promise<void>;
  addToWatched: (
    mediaId: number,
    mediaType: "movie" | "tv",
    rating?: number,
    note?: string,
    status?: "watching" | "completed" | "dropped" | "plan_to_watch",
  ) => Promise<void>;
  removeFromWatched: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => Promise<void>;
  updateWatchedItem: (
    mediaId: number,
    mediaType: "movie" | "tv",
    updates: Partial<UserMediaItem>,
  ) => void;
  isInWatchlist: (mediaId: number, mediaType: "movie" | "tv") => boolean;
  isWatched: (mediaId: number, mediaType: "movie" | "tv") => boolean;
  getWatchedItem: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => UserMediaItem | undefined;
  hideFromRecommendations: (mediaId: number, mediaType: "movie" | "tv") => void;
  isHiddenFromRecommendations: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => boolean;
  loading: boolean;
}

export const UserListsContext = createContext<UserListsContextType | undefined>(
  undefined,
);

const AuthenticatedUserListsProvider = lazy(() =>
  import("./AuthenticatedUserListsProvider").then((mod) => ({
    default: mod.AuthenticatedUserListsProvider,
  })),
);

export function useUserLists(): UserListsContextType {
  const context = useContext(UserListsContext);
  if (context === undefined) {
    throw new Error("useUserLists must be used within a UserListsProvider");
  }
  return context;
}

function useHiddenRecommendations(userId?: string) {
  const storageKey = userId ? `${STORAGE_KEYS.hidden}_${userId}` : STORAGE_KEYS.hidden;
  const [hiddenRecommendations, setHiddenRecommendations] = useState<
    HiddenRecommendation[]
  >([]);

  useEffect(() => {
    const storedHidden = localStorage.getItem(storageKey);
    if (storedHidden) {
      setHiddenRecommendations(JSON.parse(storedHidden));
      return;
    }

    setHiddenRecommendations([]);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(hiddenRecommendations));
  }, [hiddenRecommendations, storageKey]);

  return {
    hiddenRecommendations,
    setHiddenRecommendations,
  };
}

function GuestUserListsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const guestWatchlist = useGuestWatchlist();
  const guestWatched = useGuestWatched();
  const { hiddenRecommendations, setHiddenRecommendations } =
    useHiddenRecommendations(user?.id);

  const addToWatchlist = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      guestWatchlist.addToGuestWatchlist(mediaId, mediaType);
      toast("Added to Watchlist (guest)");
      trackEngagementEvent("watchlist_add", { mediaId, mediaType, auth: false });
    },
    [guestWatchlist],
  );

  const removeFromWatchlist = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      guestWatchlist.removeFromGuestWatchlist(mediaId, mediaType);
      toast(t("actions.watchlistRemoved", "Removed from watchlist"));
      trackEngagementEvent("watchlist_remove", { mediaId, mediaType, auth: false });
    },
    [guestWatchlist, t],
  );

  const addToWatched = useCallback(
    async (
      mediaId: number,
      mediaType: "movie" | "tv",
      rating?: number,
      note?: string,
      status?: "watching" | "completed" | "dropped" | "plan_to_watch",
    ) => {
      guestWatched.addToGuestWatched(mediaId, mediaType, {
        rating: validateRating(rating),
        note: validateNote(note),
        status,
      });
      toast(t("actions.watchedAdded", "Saved locally"), {
        description: t(
          "actions.watchedAddedGuest",
          "Marked as watched on this device. Sign in later to sync it to your account.",
        ),
      });
      trackEngagementEvent("watched_add", { mediaId, mediaType, auth: false });
    },
    [guestWatched, t],
  );

  const removeFromWatched = useCallback(
    async (mediaId: number, mediaType: "movie" | "tv") => {
      guestWatched.removeFromGuestWatched(mediaId, mediaType);
      toast(t("actions.watchedRemoved", "Removed from watched"));
      trackEngagementEvent("watched_remove", { mediaId, mediaType, auth: false });
    },
    [guestWatched, t],
  );

  const updateWatchedItem = useCallback(() => {
    // Guest watched updates are not persisted beyond add/remove today.
  }, []);

  const isInWatchlist = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      guestWatchlist.items.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      ),
    [guestWatchlist.items],
  );

  const isWatched = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      guestWatched.items.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      ),
    [guestWatched.items],
  );

  const getWatchedItem = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      guestWatched.items.find(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      ),
    [guestWatched.items],
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
        toast(t("recommendations.hidden", "Hidden from recommendations"), {
          description: t(
            "recommendations.hiddenGuest",
            "Hidden locally. Sign in to persist across devices.",
          ),
          action: {
            label: t("common.undo", "Undo"),
            onClick: () =>
              setHiddenRecommendations((prev2) =>
                prev2.filter((hidden) => hidden.id !== newItem.id),
              ),
          },
        });
        return next;
      });
      trackEngagementEvent("recommendation_hide", { mediaId, mediaType, auth: false });
    },
    [setHiddenRecommendations, t, user?.id],
  );

  const isHiddenFromRecommendations = useCallback(
    (mediaId: number, mediaType: "movie" | "tv") =>
      hiddenRecommendations.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      ),
    [hiddenRecommendations],
  );

  const value = useMemo<UserListsContextType>(
    () => ({
      watchlist: guestWatchlist.items,
      watched: guestWatched.items,
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
      loading: false,
    }),
    [
      addToWatchlist,
      addToWatched,
      getWatchedItem,
      guestWatchlist.items,
      guestWatched.items,
      hiddenRecommendations,
      hideFromRecommendations,
      isHiddenFromRecommendations,
      isInWatchlist,
      isWatched,
      removeFromWatchlist,
      removeFromWatched,
      updateWatchedItem,
    ],
  );

  return (
    <UserListsContext.Provider value={value}>
      {children}
    </UserListsContext.Provider>
  );
}

function AuthenticatedUserListsFallback({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useMemo<UserListsContextType>(
    () => ({
      watchlist: [],
      watched: [],
      hiddenRecommendations: [],
      addToWatchlist: async () => undefined,
      removeFromWatchlist: async () => undefined,
      addToWatched: async () => undefined,
      removeFromWatched: async () => undefined,
      updateWatchedItem: () => undefined,
      isInWatchlist: () => false,
      isWatched: () => false,
      getWatchedItem: () => undefined,
      hideFromRecommendations: () => undefined,
      isHiddenFromRecommendations: () => false,
      loading: true,
    }),
    [],
  );

  return (
    <UserListsContext.Provider value={value}>
      {children}
    </UserListsContext.Provider>
  );
}

export function UserListsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <GuestUserListsProvider>{children}</GuestUserListsProvider>;
  }

  return (
    <Suspense fallback={<AuthenticatedUserListsFallback>{children}</AuthenticatedUserListsFallback>}>
      <AuthenticatedUserListsProvider>{children}</AuthenticatedUserListsProvider>
    </Suspense>
  );
}
