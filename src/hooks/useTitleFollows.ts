import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { createLogger } from "@/lib/logger";
import type { MediaDetails } from "@/types/media";

export type FollowMediaType = "movie" | "tv";

export interface FollowedTitle {
  id: string;
  mediaId: number;
  mediaType: FollowMediaType;
  title: string;
  posterPath: string | null;
  followedAt: string;
  userId: string;
}

export interface FollowedTitleState {
  movie_id: string;
  media_type: FollowMediaType;
  tmdb_id: number;
  release_date: string | null;
  status: string | null;
  number_of_seasons: number | null;
  last_episode_air_date: string | null;
  last_episode_season_number: number | null;
  last_episode_number: number | null;
  updated_at?: string;
}

interface FollowTitleInput {
  mediaId: number;
  mediaType: FollowMediaType;
  title: string;
  posterPath: string | null;
  initialState?: FollowedTitleState;
}

const GUEST_FOLLOWS_KEY = "cinetrekker_guest_follows";
const GUEST_FOLLOWS_EVENT = "cinetrekker:guest-follows-updated";
const GUEST_TITLE_STATE_KEY = "cinetrekker_guest_followed_title_state";
const FOLLOW_STATE_SCHEMA_MISSING_KEY = "cinetrekker_follow_state_schema_missing";
const logger = createLogger("title-follows");

let followStateSchemaMissing = readPersistentSchemaMissingFlag();

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function readPersistentSchemaMissingFlag(): boolean {
  if (!canUseStorage()) return false;

  try {
    return window.localStorage.getItem(FOLLOW_STATE_SCHEMA_MISSING_KEY) === "true";
  } catch {
    return false;
  }
}

function persistSchemaMissingFlag(value: boolean) {
  if (!canUseStorage()) return;

  try {
    if (value) {
      window.localStorage.setItem(FOLLOW_STATE_SCHEMA_MISSING_KEY, "true");
    } else {
      window.localStorage.removeItem(FOLLOW_STATE_SCHEMA_MISSING_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

function isMissingFollowStateSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const typedError = error as PostgrestError & { message?: string };
  if (typedError.code === "PGRST205") return true;

  const message = `${typedError.message || ""} ${typedError.details || ""}`.toLowerCase();
  return (
    message.includes("could not find the table") ||
    message.includes("followed_title_state_user")
  );
}

function markFollowStateSchemaMissing(error: unknown): boolean {
  if (!isMissingFollowStateSchemaError(error)) return false;

  if (!followStateSchemaMissing) {
    followStateSchemaMissing = true;
    persistSchemaMissingFlag(true);
    logger.warn(
      "followed_title_state_user is unavailable; using local follow-state fallback.",
    );
  }

  return true;
}

export function isFollowStateSchemaMissing() {
  return followStateSchemaMissing;
}

export function createFollowKey(mediaType: FollowMediaType, mediaId: number) {
  return `${mediaType}-${mediaId}`;
}

function dedupeTitles(items: FollowedTitle[]) {
  const unique = new Map<string, FollowedTitle>();

  for (const item of items) {
    unique.set(item.id, item);
  }

  return Array.from(unique.values()).sort(
    (left, right) =>
      new Date(right.followedAt).getTime() -
      new Date(left.followedAt).getTime(),
  );
}

export function readGuestTitleFollows() {
  if (!canUseStorage()) {
    return [] as FollowedTitle[];
  }

  try {
    const raw = window.localStorage.getItem(GUEST_FOLLOWS_KEY);
    if (!raw) {
      return [] as FollowedTitle[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? dedupeTitles(parsed as FollowedTitle[]) : [];
  } catch (error) {
    console.warn("[TitleFollows] Failed to read guest follows", error);
    return [] as FollowedTitle[];
  }
}

function writeGuestTitleFollows(items: FollowedTitle[]) {
  const next = dedupeTitles(items);

  if (!canUseStorage()) {
    return next;
  }

  try {
    window.localStorage.setItem(GUEST_FOLLOWS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(GUEST_FOLLOWS_EVENT));
  } catch (error) {
    console.warn("[TitleFollows] Failed to write guest follows", error);
  }

  return next;
}

export function buildFollowedTitleState(
  mediaType: FollowMediaType,
  mediaId: number,
  details: Pick<
    MediaDetails,
    "release_date" | "status" | "number_of_seasons" | "last_episode_to_air"
  >,
): FollowedTitleState {
  return {
    movie_id: createFollowKey(mediaType, mediaId),
    media_type: mediaType,
    tmdb_id: mediaId,
    release_date: details.release_date ?? null,
    status: details.status ?? null,
    number_of_seasons: details.number_of_seasons ?? null,
    last_episode_air_date: details.last_episode_to_air?.air_date ?? null,
    last_episode_season_number:
      details.last_episode_to_air?.season_number ?? null,
    last_episode_number: details.last_episode_to_air?.episode_number ?? null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeMovieFollow(row: {
  movie_id: string;
  created_at: string;
  user_id: string;
}): FollowedTitle | null {
  const [mediaType, mediaIdText] = row.movie_id.split("-");
  const mediaId = Number(mediaIdText);

  if (
    (mediaType !== "movie" && mediaType !== "tv") ||
    !Number.isFinite(mediaId)
  ) {
    return null;
  }

  return {
    id: row.movie_id,
    mediaId,
    mediaType,
    title: "",
    posterPath: null,
    followedAt: row.created_at,
    userId: row.user_id,
  } satisfies FollowedTitle;
}

export function useTitleFollows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const migrationUserRef = useRef<string | null>(null);
  const [guestFollows, setGuestFollows] = useState<FollowedTitle[]>(() =>
    readGuestTitleFollows(),
  );

  useEffect(() => {
    if (!canUseStorage()) {
      return;
    }

    const sync = () => setGuestFollows(readGuestTitleFollows());

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === GUEST_FOLLOWS_KEY) {
        sync();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(GUEST_FOLLOWS_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(GUEST_FOLLOWS_EVENT, sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user || migrationUserRef.current === user.id) {
      return;
    }

    if (!canUseStorage()) {
      migrationUserRef.current = user.id;
      return;
    }

    const guestItems = readGuestTitleFollows();
    if (guestItems.length === 0) {
      migrationUserRef.current = user.id;
      return;
    }

    let cancelled = false;

    const migrateGuestFollows = async () => {
      const tvFollows = guestItems.filter((item) => item.mediaType === "tv");
      const movieFollows = guestItems.filter(
        (item) => item.mediaType === "movie",
      );

      if (tvFollows.length > 0) {
        const { error } = await supabase.from("followed_shows").upsert(
          tvFollows.map((item) => ({
            user_id: user.id,
            show_id: item.mediaId,
            show_name: item.title || `TV ${item.mediaId}`,
            poster_path: item.posterPath,
          })),
          { onConflict: "user_id,show_id" },
        );

        if (error) {
          throw error;
        }
      }

      if (movieFollows.length > 0) {
        const { error } = await supabase.from("movie_followers").upsert(
          movieFollows.map((item) => ({
            user_id: user.id,
            movie_id: item.id,
          })),
          { onConflict: "user_id,movie_id" },
        );

        if (error) {
          throw error;
        }
      }

      const guestStates = readGuestFollowStates();
      const followIds = new Set(guestItems.map((item) => item.id));
      const statesToSync = Object.values(guestStates).filter((state) =>
        followIds.has(state.movie_id),
      );

      if (statesToSync.length > 0) {
        if (followStateSchemaMissing) {
          return;
        }

        const { error } = await supabase
          .from("followed_title_state_user")
          .upsert(
            statesToSync.map((state) => ({
              user_id: user.id,
              ...state,
            })),
            { onConflict: "user_id,movie_id" },
        );

        if (error) {
          if (markFollowStateSchemaMissing(error)) {
            return;
          }
          throw error;
        }
      }

      if (cancelled) {
        return;
      }

      clearGuestTitleFollows();
      clearGuestFollowStates();
      setGuestFollows([]);
      migrationUserRef.current = user.id;
      queryClient.invalidateQueries({ queryKey: ["title-follows"] });
      toast({
        title: "Followed Titles Synced",
        description: `${guestItems.length} guest follow${guestItems.length === 1 ? "" : "s"} moved to your account.`,
      });
    };

    migrateGuestFollows().catch((error: Error) => {
      if (cancelled) {
        return;
      }

      console.warn("[TitleFollows] Guest follow sync failed", error);
      toast({
        title: "Guest Follows Not Synced",
        description: error.message,
        variant: "destructive",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [queryClient, user]);

  const { data: remoteFollows = [], isLoading } = useQuery({
    queryKey: ["title-follows", user?.id],
    enabled: !!user && !followStateSchemaMissing,
    queryFn: async () => {
      if (!user) {
        return [] as FollowedTitle[];
      }

      try {
        const [showsResult, moviesResult] = await Promise.all([
          supabase
            .from("followed_shows")
            .select("show_id,show_name,poster_path,followed_at,user_id")
            .eq("user_id", user.id)
            .order("followed_at", { ascending: false }),
          supabase
            .from("movie_followers")
            .select("movie_id,created_at,user_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (showsResult.error) {
          throw showsResult.error;
        }

        if (moviesResult.error) {
          throw moviesResult.error;
        }

        return dedupeTitles([
          ...showsResult.data.map((show): FollowedTitle => ({
            id: createFollowKey("tv", show.show_id),
            mediaId: show.show_id,
            mediaType: "tv",
            title: show.show_name,
            posterPath: show.poster_path,
            followedAt: show.followed_at,
            userId: show.user_id,
          })),
          ...moviesResult.data
            .map(normalizeMovieFollow)
            .filter((item): item is FollowedTitle => item !== null),
        ]);
      } catch (error) {
        if (markFollowStateSchemaMissing(error)) {
          return [] as FollowedTitle[];
        }

        throw error;
      }
    },
  });

  const followedTitles = user ? remoteFollows : guestFollows;

  const followMutation = useMutation({
    mutationFn: async ({
      mediaId,
      mediaType,
      title,
      posterPath,
      initialState,
    }: FollowTitleInput) => {
      const followId = createFollowKey(mediaType, mediaId);

      if (!user) {
        const next = writeGuestTitleFollows([
          ...readGuestTitleFollows().filter((item) => item.id !== followId),
          {
            id: followId,
            mediaId,
            mediaType,
            title,
            posterPath,
            followedAt: new Date().toISOString(),
            userId: "guest",
          },
        ]);
        setGuestFollows(next);
        return { initialState, mediaType, followId, title, userId: "guest" };
      }

      if (mediaType === "tv") {
        const { error } = await supabase.from("followed_shows").upsert(
          {
            user_id: user.id,
            show_id: mediaId,
            show_name: title,
            poster_path: posterPath,
          },
          { onConflict: "user_id,show_id" },
        );

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from("movie_followers").insert({
          user_id: user.id,
          movie_id: followId,
        });

        if (error && error.code !== "23505") {
          throw error;
        }
      }

      if (initialState) {
        if (followStateSchemaMissing) {
          return { initialState, mediaType, followId, title, userId: user.id };
        }

        const { error } = await supabase
          .from("followed_title_state_user")
          .upsert(
            {
              user_id: user.id,
              ...initialState,
            },
            {
              onConflict: "user_id,movie_id",
            },
          );

        if (error) {
          if (markFollowStateSchemaMissing(error)) {
            return { initialState, mediaType, followId, title, userId: user.id };
          }
          throw error;
        }
      }

      return { initialState, mediaType, followId, title, userId: user.id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["title-follows"] });
      toast({
        title:
          variables.mediaType === "tv" ? "Series followed" : "Movie followed",
        description: `You will get updates for ${variables.title}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async ({
      mediaId,
      mediaType,
    }: Pick<FollowTitleInput, "mediaId" | "mediaType">) => {
      const followId = createFollowKey(mediaType, mediaId);

      if (!user) {
        const next = writeGuestTitleFollows(
          readGuestTitleFollows().filter((item) => item.id !== followId),
        );
        setGuestFollows(next);
        return { followId, mediaType };
      }

      if (mediaType === "tv") {
        const { error } = await supabase
          .from("followed_shows")
          .delete()
          .eq("user_id", user.id)
          .eq("show_id", mediaId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("movie_followers")
          .delete()
          .eq("user_id", user.id)
          .eq("movie_id", followId);

        if (error) {
          throw error;
        }
      }

      if (!followStateSchemaMissing) {
        const { error } = await supabase
          .from("followed_title_state_user")
          .delete()
          .eq("user_id", user.id)
          .eq("movie_id", followId);

        if (error && !markFollowStateSchemaMissing(error)) {
          throw error;
        }
      }

      return { followId, mediaType };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["title-follows"] });
      toast({
        title:
          variables.mediaType === "tv"
            ? "Series unfollowed"
            : "Movie unfollowed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isFollowing = useCallback(
    (mediaId: number, mediaType: FollowMediaType) =>
      followedTitles.some(
        (item) => item.mediaId === mediaId && item.mediaType === mediaType,
      ),
    [followedTitles],
  );

  return {
    followedTitles,
    isLoading: user ? isLoading : false,
    isFollowing,
    followTitle: followMutation.mutateAsync,
    unfollowTitle: unfollowMutation.mutateAsync,
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
}

function clearGuestTitleFollows() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_FOLLOWS_KEY);
    window.dispatchEvent(new CustomEvent(GUEST_FOLLOWS_EVENT));
  } catch (error) {
    console.warn("[TitleFollows] Failed to clear guest follows", error);
  }
}

function readGuestFollowStates() {
  if (!canUseStorage()) {
    return {} as Record<string, FollowedTitleState>;
  }

  try {
    const raw = window.localStorage.getItem(GUEST_TITLE_STATE_KEY);
    if (!raw) {
      return {} as Record<string, FollowedTitleState>;
    }

    const parsed = JSON.parse(raw) as Record<string, FollowedTitleState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[TitleFollows] Failed to read guest follow states", error);
    return {} as Record<string, FollowedTitleState>;
  }
}

function clearGuestFollowStates() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_TITLE_STATE_KEY);
  } catch (error) {
    console.warn("[TitleFollows] Failed to clear guest follow states", error);
  }
}
