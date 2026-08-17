import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Filter,
  Inbox,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyStates";
import { cn } from "@/lib/utils";
import { getNotificationTarget } from "@/lib/notificationLinks";
import { NotificationMediaThumb } from "@/components/NotificationMediaThumb";

type NotificationFilter = "all" | "unread" | "read";

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  const readCount = notifications.length - unreadCount;
  const renderCount = (value: number) =>
    isLoading ? (
      <span
        className="inline-block h-7 w-8 animate-pulse rounded-md bg-muted align-middle"
        aria-label="Loading count"
      />
    ) : (
      value
    );

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.is_read);
    }

    if (filter === "read") {
      return notifications.filter((notification) => notification.is_read);
    }

    return notifications;
  }, [filter, notifications]);

  const handleNotificationClick = (
    id: string,
    movieId: string,
    isRead: boolean,
  ) => {
    if (!isRead) {
      void markRead(id);
    }

    const target = getNotificationTarget(movieId);
    if (target) {
      navigate(target);
    }
  };

  return (
    <>
      <SEO
        title="Notifications - CineTrekker"
        description="Your CineTrekker notifications"
        canonical="https://cinetrekker.vercel.app/notifications"
      />
      <div className="page-container mx-auto max-w-5xl pt-20 pb-28 md:pb-0">
        <div className="mb-8 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-[0_18px_70px_hsl(var(--background)/0.24)] ring-1 ring-white/5 md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  Notification center
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-[2.75rem]">
                  Notifications
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  A focused inbox for releases, new episodes, and updates from titles you follow.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead()}
                    className="min-h-11 w-full gap-2 rounded-2xl border-primary/25 bg-primary/10 font-semibold text-primary hover:bg-primary/15 sm:w-auto"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilter("all")}
                  className="min-h-11 w-full gap-2 rounded-2xl border border-border/60 bg-background font-semibold sm:w-auto"
                >
                  <Filter className="h-4 w-4" />
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3.5 shadow-inner">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Total
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {renderCount(notifications.length)}
                </div>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3.5 shadow-[0_14px_36px_hsl(var(--primary)/0.07)]">
                <div className="text-xs uppercase tracking-[0.18em] text-primary/80">
                  Unread
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {renderCount(unreadCount)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3.5 shadow-inner">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Read
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {renderCount(readCount)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "unread", "read"] as const).map((option) => {
                const active = filter === option;
                const label =
                  option === "all"
                    ? "All"
                    : option === "unread"
                      ? "Unread"
                      : "Read";
                const count =
                  option === "all"
                    ? notifications.length
                    : option === "unread"
                      ? unreadCount
                      : readCount;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.2)]"
                        : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {label}
                    <span
                      className={cn(
                        "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        active ? "bg-primary-foreground/15" : "bg-muted text-foreground",
                      )}
                    >
                      {isLoading ? (
                        <span className="h-3 w-4 animate-pulse rounded-full bg-current/25" aria-label="Loading count" />
                      ) : (
                        count
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-3xl border border-border/60 bg-card px-4 py-4"
              >
                <div className="h-16 w-11 animate-pulse rounded-xl bg-muted" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted/80" />
                </div>
                <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No notifications yet"
            description="Follow movies and series to get notified about new episodes, season changes, releases, and more."
            action={{
              label: "Browse titles",
              onClick: () => {
                navigate("/");
              },
            }}
          />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={
              filter === "all"
                ? "No notifications to show"
                : `No ${filter} notifications`
            }
            description={
              filter === "unread"
                ? "Everything is caught up. Switch back to all notifications or wait for new updates."
                : "There are no read notifications to show yet."
            }
            action={{
              label: "Show all notifications",
              onClick: () => setFilter("all"),
            }}
          />
        ) : (
          <ul className="space-y-3">
            {filteredNotifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-border/80 hover:shadow-lg hover:shadow-black/5 sm:p-4",
                  !n.is_read
                    ? "border-primary/25 bg-primary/[0.07] shadow-[0_14px_36px_hsl(var(--primary)/0.06)]"
                    : "border-border/60 bg-card",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-4 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleNotificationClick(n.id, n.movie_id, n.is_read)}
                  aria-label={`Open notification: ${n.message}`}
                >
                  <NotificationMediaThumb
                    movieId={n.movie_id}
                    alt={n.message}
                    className="h-14 w-10 shrink-0 rounded-xl border border-border/60 object-cover shadow-sm"
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-sm leading-6 text-foreground sm:text-[0.95rem]",
                          !n.is_read && "font-semibold",
                        )}
                      >
                        {n.message}
                      </p>
                      {!n.is_read && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          New
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      <span className="inline-flex h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span>{n.is_read ? "Read" : "Unread"}</span>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 shrink-0 rounded-2xl border border-transparent text-muted-foreground opacity-70 transition-all hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Delete notification: ${n.message}`}
                  onClick={() => deleteNotification(n.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
