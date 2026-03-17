import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMovieDetails, getTVDetails } from "@/services/tmdb";
import { appendGuestNotifications, readGuestNotifications } from "@/hooks/useNotifications";
import {
  buildFollowedTitleState,
  createFollowKey,
  type FollowedTitle,
  type FollowedTitleState,
  useTitleFollows,
} from "@/hooks/useTitleFollows";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";

const GUEST_TITLE_STATE_KEY = "cinetrekker_guest_followed_title_state";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readGuestTitleStates() {
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
    console.warn("[FollowMonitor] Failed to read guest title states", error);
    return {} as Record<string, FollowedTitleState>;
  }
}

function writeGuestTitleStates(states: Record<string, FollowedTitleState>) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(GUEST_TITLE_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.warn("[FollowMonitor] Failed to write guest title states", error);
  }
}

function padEpisodeNumber(value: number | null) {
  if (!value || value < 1) {
    return null;
  }

  return value.toString().padStart(2, "0");
}

function buildChangeNotifications(
  follow: FollowedTitle,
  title: string,
  previous: FollowedTitleState | undefined,
  current: FollowedTitleState,
) {
  if (!previous) {
    return [] as Array<{ eventKey: string; type: string; message: string }>;
  }

  const notifications: Array<{ eventKey: string; type: string; message: string }> = [];

  if (
    current.media_type === "movie" &&
    current.status === "Released" &&
    previous.status !== "Released"
  ) {
    notifications.push({
      eventKey: `${follow.id}:status:released`,
      type: "movie_release",
      message: `${title} is now released.`,
    });
  }

  if (
    current.media_type === "movie" &&
    current.release_date &&
    current.release_date !== previous.release_date
  ) {
    notifications.push({
      eventKey: `${follow.id}:release-date:${current.release_date}`,
      type: "release_date_change",
      message: `${title} has a new release date: ${current.release_date}.`,
    });
  }

  if (
    current.media_type === "tv" &&
    typeof current.number_of_seasons === "number" &&
    typeof previous.number_of_seasons === "number" &&
    current.number_of_seasons > previous.number_of_seasons
  ) {
    notifications.push({
      eventKey: `${follow.id}:season:${current.number_of_seasons}`,
      type: "new_season",
      message: `${title} now has ${current.number_of_seasons} seasons available to track.`,
    });
  }

  const hasNewEpisode =
    current.media_type === "tv" &&
    current.last_episode_air_date &&
    (current.last_episode_air_date !== previous.last_episode_air_date ||
      current.last_episode_number !== previous.last_episode_number ||
      current.last_episode_season_number !== previous.last_episode_season_number);

  if (hasNewEpisode) {
    const seasonNumber = padEpisodeNumber(current.last_episode_season_number);
    const episodeNumber = padEpisodeNumber(current.last_episode_number);
    const episodeLabel =
      seasonNumber && episodeNumber
        ? `S${seasonNumber}E${episodeNumber}`
        : "a new episode";

    notifications.push({
      eventKey: `${follow.id}:episode:${current.last_episode_season_number ?? 0}:${current.last_episode_number ?? 0}:${current.last_episode_air_date}`,
      type: "new_episode",
      message: `${title} has ${episodeLabel} available.`,
    });
  }

  if (current.status && current.status !== previous.status && current.media_type === "tv") {
    notifications.push({
      eventKey: `${follow.id}:status:${current.status.toLowerCase()}`,
      type: "status_change",
      message: `${title} status changed to ${current.status}.`,
    });
  }

  return notifications;
}

export function FollowNotificationMonitor() {
  const { user } = useAuth();
  const { followedTitles } = useTitleFollows();

  useQuery({
    queryKey: ["follow-notification-monitor", user?.id ?? "guest", followedTitles.map((item) => item.id).join("|")],
    enabled: followedTitles.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const currentStates = await Promise.all(
        followedTitles.map(async (follow) => {
          const details =
            follow.mediaType === "movie"
              ? await getMovieDetails(follow.mediaId)
              : await getTVDetails(follow.mediaId);

          const title = details.title || details.name || follow.title || follow.id;

          return {
            follow,
            title,
            state: buildFollowedTitleState(follow.mediaType, follow.mediaId, details),
          };
        }),
      );

      if (user) {
        const followIds = currentStates.map((item) => item.state.movie_id);
        const { data: previousStates, error: previousStatesError } = await supabase
          .from("followed_title_state")
          .select("*")
          .in("movie_id", followIds);

        if (previousStatesError) {
          throw previousStatesError;
        }

        const previousById = new Map(
          (previousStates || []).map((item) => [item.movie_id, item as FollowedTitleState]),
        );

        const pendingNotifications = currentStates.flatMap(({ follow, title, state }) =>
          buildChangeNotifications(follow, title, previousById.get(state.movie_id), state).map(
            (notification) => ({
              user_id: user.id,
              movie_id: createFollowKey(follow.mediaType, follow.mediaId),
              event_key: notification.eventKey,
              type: notification.type,
              message: notification.message,
              is_read: false,
            }),
          ),
        );

        if (pendingNotifications.length > 0) {
          const eventKeys = pendingNotifications
            .map((item) => item.event_key)
            .filter((item): item is string => Boolean(item));

          const { data: existingNotifications, error: existingError } = await supabase
            .from("notifications")
            .select("event_key")
            .eq("user_id", user.id)
            .in("event_key", eventKeys);

          if (existingError) {
            throw existingError;
          }

          const existingKeys = new Set(
            (existingNotifications || []).map((item) => item.event_key).filter(Boolean),
          );
          const newNotifications = pendingNotifications.filter(
            (item) => item.event_key && !existingKeys.has(item.event_key),
          );

          if (newNotifications.length > 0) {
            const { error: insertError } = await supabase
              .from("notifications")
              .insert(newNotifications);

            if (insertError) {
              throw insertError;
            }

            newNotifications.slice(0, 3).forEach((item) => {
              toast({ title: "New update", description: item.message });
            });
          }
        }

        const { error: upsertError } = await supabase
          .from("followed_title_state")
          .upsert(currentStates.map((item) => item.state), { onConflict: "movie_id" });

        if (upsertError) {
          throw upsertError;
        }

        return null;
      }

      const previousById = readGuestTitleStates();
      const currentById = Object.fromEntries(
        currentStates.map((item) => [item.state.movie_id, item.state]),
      );

      const guestNotifications = currentStates.flatMap(({ follow, title, state }) => {
        const previous = previousById[state.movie_id];
        return buildChangeNotifications(follow, title, previous, state).map((notification) => ({
          id: notification.eventKey,
          user_id: "guest",
          movie_id: state.movie_id,
          event_key: notification.eventKey,
          type: notification.type,
          message: notification.message,
          created_at: new Date().toISOString(),
          is_read: false,
        }));
      });

      if (guestNotifications.length > 0) {
        const existingKeys = new Set(
          readGuestNotifications()
            .map((item) => item.event_key)
            .filter((item): item is string => Boolean(item)),
        );
        const nextNotifications = guestNotifications.filter(
          (item) => item.event_key && !existingKeys.has(item.event_key),
        );

        if (nextNotifications.length > 0) {
          appendGuestNotifications(nextNotifications);
          nextNotifications.slice(0, 3).forEach((item) => {
            toast({ title: "New update", description: item.message });
          });
        }
      }

      writeGuestTitleStates(currentById);
      return null;
    },
  });

  return null;
}