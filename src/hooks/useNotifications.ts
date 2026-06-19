import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AppNotification {
  id: string;
  user_id: string;
  movie_id: string;
  event_key?: string | null;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const GUEST_NOTIFICATIONS_KEY = "cinetrekker_guest_notifications";
const GUEST_NOTIFICATIONS_EVENT = "cinetrekker:guest-notifications-updated";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function dedupeNotifications(items: AppNotification[]) {
  const unique = new Map<string, AppNotification>();
  for (const item of items) {
    unique.set(item.event_key || item.id, item);
  }
  return Array.from(unique.values()).sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );
}

export function readGuestNotifications() {
  if (!canUseStorage()) return [] as AppNotification[];

  try {
    const raw = window.localStorage.getItem(GUEST_NOTIFICATIONS_KEY);
    if (!raw) return [] as AppNotification[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? dedupeNotifications(parsed as AppNotification[])
      : [];
  } catch (error) {
    console.warn("[Notifications] Failed to read guest notifications", error);
    return [] as AppNotification[];
  }
}

export function writeGuestNotifications(items: AppNotification[]) {
  const next = dedupeNotifications(items);

  if (!canUseStorage()) return next;

  try {
    window.localStorage.setItem(GUEST_NOTIFICATIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(GUEST_NOTIFICATIONS_EVENT));
  } catch (error) {
    console.warn("[Notifications] Failed to write guest notifications", error);
  }

  return next;
}

export function appendGuestNotifications(items: AppNotification[]) {
  return writeGuestNotifications([...items, ...readGuestNotifications()]);
}

function clearGuestNotifications() {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(GUEST_NOTIFICATIONS_KEY);
    window.dispatchEvent(new CustomEvent(GUEST_NOTIFICATIONS_EVENT));
  } catch (error) {
    console.warn("[Notifications] Failed to clear guest notifications", error);
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [guestNotifications, setGuestNotifications] = useState<
    AppNotification[]
  >(() => readGuestNotifications());
  const userNotificationsKey = ["notifications", user?.id] as const;

  useEffect(() => {
    if (!canUseStorage()) {
      return;
    }

    const sync = () => setGuestNotifications(readGuestNotifications());

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === GUEST_NOTIFICATIONS_KEY) {
        sync();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(GUEST_NOTIFICATIONS_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        GUEST_NOTIFICATIONS_EVENT,
        sync as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const guestItems = readGuestNotifications();
    if (guestItems.length === 0) {
      return;
    }

    let cancelled = false;

    const syncGuestNotifications = async () => {
      const normalized = guestItems.map((item) => ({
        user_id: user.id,
        movie_id: item.movie_id,
        event_key: item.event_key || `guest:${item.id}`,
        type: item.type,
        message: item.message,
        is_read: item.is_read,
      }));

      const eventKeys = normalized
        .map((item) => item.event_key)
        .filter((item): item is string => Boolean(item));

      const { data: existing, error: existingError } = await supabase
        .from("notifications")
        .select("event_key")
        .eq("user_id", user.id)
        .in("event_key", eventKeys);

      if (existingError) {
        throw existingError;
      }

      const existingKeys = new Set(
        (existing || []).map((item) => item.event_key).filter(Boolean),
      );
      const pending = normalized.filter(
        (item) => item.event_key && !existingKeys.has(item.event_key),
      );

      if (pending.length > 0) {
        const { error } = await supabase.from("notifications").insert(pending);
        if (error) {
          throw error;
        }
      }

      if (cancelled) {
        return;
      }

      clearGuestNotifications();
      setGuestNotifications([]);
      queryClient.invalidateQueries({ queryKey: userNotificationsKey });
      toast({
        title: "Notifications synced",
        description: `${pending.length} guest notification${pending.length === 1 ? "" : "s"} moved to your account.`,
      });
    };

    syncGuestNotifications().catch((error: Error) => {
      if (cancelled) {
        return;
      }
      console.warn("[Notifications] Guest notification sync failed", error);
      toast({
        title: "Notification sync failed",
        description: error.message,
        variant: "destructive",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [queryClient, user]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: userNotificationsKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AppNotification[];
    },
    enabled: !!user,
    refetchInterval: 60_000, // poll every minute for new notifications
  });

  const allNotifications = user ? notifications : guestNotifications;

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        const next = writeGuestNotifications(
          readGuestNotifications().map((notification) =>
            notification.id === id
              ? { ...notification, is_read: true }
              : notification,
          ),
        );
        setGuestNotifications(next);
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      if (!user) return { previous: null as AppNotification[] | null };

      await queryClient.cancelQueries({ queryKey: userNotificationsKey });
      const previous =
        queryClient.getQueryData<AppNotification[]>(userNotificationsKey) ?? [];

      queryClient.setQueryData<AppNotification[]>(userNotificationsKey, (current) =>
        (current ?? previous).map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );

      return { previous };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userNotificationsKey, context.previous);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userNotificationsKey });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        const next = writeGuestNotifications(
          readGuestNotifications().map((notification) => ({
            ...notification,
            is_read: true,
          })),
        );
        setGuestNotifications(next);
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      if (!user) return { previous: null as AppNotification[] | null };

      await queryClient.cancelQueries({ queryKey: userNotificationsKey });
      const previous =
        queryClient.getQueryData<AppNotification[]>(userNotificationsKey) ?? [];

      queryClient.setQueryData<AppNotification[]>(userNotificationsKey, (current) =>
        (current ?? previous).map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userNotificationsKey, context.previous);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userNotificationsKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        const next = writeGuestNotifications(
          readGuestNotifications().filter(
            (notification) => notification.id !== id,
          ),
        );
        setGuestNotifications(next);
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      if (!user) return { previous: null as AppNotification[] | null };

      await queryClient.cancelQueries({ queryKey: userNotificationsKey });
      const previous =
        queryClient.getQueryData<AppNotification[]>(userNotificationsKey) ?? [];

      queryClient.setQueryData<AppNotification[]>(userNotificationsKey, (current) =>
        (current ?? previous).filter((notification) => notification.id !== id),
      );

      return { previous };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userNotificationsKey, context.previous);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userNotificationsKey });
    },
  });

  return {
    notifications: allNotifications,
    unreadCount,
    isLoading: user ? isLoading : false,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
  };
}
