import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Filter,
  Inbox,
  Archive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ar, de, es, fr, tr } from "date-fns/locale";
import { useNotifications } from "@/hooks/useNotifications";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyStates";
import { cn } from "@/lib/utils";
import { getNotificationTarget } from "@/lib/notificationLinks";
import { trackProductEvent } from "@/lib/analytics";
import { NotificationMediaThumb } from "@/components/NotificationMediaThumb";

type NotificationFilter = "all" | "unread" | "read";

type DisplayNotification = ReturnType<typeof useNotifications>["notifications"][number] & {
  groupedCount: number;
};

function groupNotifications(notifications: ReturnType<typeof useNotifications>["notifications"]): DisplayNotification[] {
  const grouped = new Map<string, DisplayNotification>();

  for (const notification of notifications) {
    const key = notification.group_key || notification.id;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...notification, groupedCount: 1 });
      continue;
    }

    existing.groupedCount += 1;
    if (new Date(notification.created_at).getTime() > new Date(existing.created_at).getTime()) {
      grouped.set(key, { ...notification, groupedCount: existing.groupedCount });
    }
  }

  return Array.from(grouped.values()).sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

const dateLocales = { ar, de, es, fr, tr } as const;

export default function Notifications() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    archiveNotification,
  } = useNotifications();

  const readCount = notifications.length - unreadCount;
  const dateLocale = dateLocales[i18n.language.split('-')[0] as keyof typeof dateLocales];
  const currentState = isLoading
    ? t("notifications.currentStateLoading", "Checking your inbox…")
    : unreadCount > 0
      ? t("notifications.currentStateUnread", "{{count}} update needs your attention.", { count: unreadCount })
      : t("notifications.currentStateClear", "You are all caught up.");
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

  const visibleNotifications = useMemo(
    () => groupNotifications(filteredNotifications),
    [filteredNotifications],
  );

  const handleNotificationClick = (
    id: string,
    movieId: string,
    isRead: boolean,
  ) => {
    trackProductEvent("notification_action", {
      action: isRead ? "opened" : "marked_read",
      source: "inbox",
    });

    if (!isRead) {
      void markRead(id);
    }

    const target = getNotificationTarget(movieId);
    if (target) {
      navigate(target);
    }
  };

  const handleArchive = (id: string) => {
    trackProductEvent("notification_action", { action: "archived", source: "inbox" });
    archiveNotification(id);
  };

  return (
    <>
      <SEO
        title="Notifications - CineTrekker"
        description="Your CineTrekker notifications"
        canonical="https://cinetrekker.vercel.app/notifications"
      />
      <div className="page-container mx-auto max-w-5xl pt-20 pb-28 md:pb-0">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-card via-card/95 to-primary/[0.03] p-5 shadow-[0_20px_70px_hsl(var(--background)/0.35)] backdrop-blur-xl ring-1 ring-white/5 md:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-sm">
                  <span className="relative flex h-2 w-2">
                    {unreadCount > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  {t("notifications.centerEyebrow", "Notification center")}
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-[2.75rem]">
                  {t("notifications.title", "Notifications")}
                </h1>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("notifications.centerDescription", "A focused inbox for releases, new episodes, and updates from titles you follow.")}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-background/60 px-3 py-1.5 border border-border/50 text-xs font-semibold text-foreground" role="status">
                  <span className={cn("h-2 w-2 rounded-full", unreadCount > 0 ? "bg-primary animate-pulse" : "bg-emerald-500")} />
                  {currentState}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row lg:shrink-0">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead()}
                    className="min-h-11 w-full gap-2 rounded-xl border-primary/30 bg-primary/10 font-bold text-primary hover:bg-primary/20 shadow-sm transition-all sm:w-auto px-4"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {t("notifications.markAllRead", "Mark all as read")}
                  </Button>
                )}
                {filter !== "all" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFilter("all")}
                    className="min-h-11 w-full gap-2 rounded-xl border border-border/60 bg-background/80 font-semibold sm:w-auto px-4"
                  >
                    <Filter className="h-4 w-4" />
                    {t("notifications.resetFilters", "Reset filters")}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5 shadow-sm transition-all">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("notifications.total", "Total")}
                </div>
                <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
                  {renderCount(notifications.length)}
                </div>
              </div>
              <div className={cn(
                "rounded-2xl border px-4 py-3.5 transition-all shadow-sm",
                unreadCount > 0
                  ? "border-primary/35 bg-primary/10 shadow-[0_10px_30px_hsl(var(--primary)/0.08)]"
                  : "border-border/60 bg-background/70"
              )}>
                <div className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", unreadCount > 0 ? "text-primary" : "text-muted-foreground")}>
                  {t("notifications.unread", "Unread")}
                </div>
                <div className={cn("mt-1.5 text-2xl font-bold tracking-tight", unreadCount > 0 ? "text-primary" : "text-foreground")}>
                  {renderCount(unreadCount)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5 shadow-sm transition-all">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("notifications.read", "Read")}
                </div>
                <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
                  {renderCount(readCount)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "unread", "read"] as const).map((option) => {
                const active = filter === option;
                const label =
                  option === "all"
                    ? t("notifications.all", "All")
                    : option === "unread"
                      ? t("notifications.unread", "Unread")
                      : t("notifications.read", "Read");
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
            title={t("notifications.noNotificationsYet", "No notifications yet")}
            description={t("notifications.noNotificationsDescription", "Follow movies and series to get notified about new episodes, season changes, releases, and more.")}
            action={{
              label: t("notifications.browseTitles", "Browse titles"),
              onClick: () => {
                navigate("/");
              },
            }}
          />
        ) : visibleNotifications.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={
              filter === "all"
                ? t("notifications.noNotificationsToShow", "No notifications to show")
                : t("notifications.noFilteredNotifications", "No {{filter}} notifications", {
                    filter: filter === "unread"
                      ? t("notifications.unread", "Unread").toLowerCase()
                      : t("notifications.read", "Read").toLowerCase(),
                  })
            }
            description={
              filter === "unread"
                ? t("notifications.caughtUpDescription", "Everything is caught up. Switch back to all notifications or wait for new updates.")
                : t("notifications.noReadDescription", "There are no read notifications to show yet.")
            }
            action={{
              label: t("notifications.showAll", "Show all notifications"),
              onClick: () => setFilter("all"),
            }}
          />
        ) : (
          <ul className="space-y-3">
            {visibleNotifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "relative overflow-hidden group flex items-start gap-3.5 rounded-2xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-4 sm:gap-4",
                  !n.is_read
                    ? "border-primary/30 bg-gradient-to-r from-primary/[0.08] via-card to-card shadow-[0_12px_32px_hsl(var(--primary)/0.08)]"
                    : "border-border/60 bg-card/80 hover:border-border/90 hover:bg-card",
                )}
              >
                {!n.is_read && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-4"
                  onClick={() => handleNotificationClick(n.id, n.movie_id, n.is_read)}
                  aria-label={t("notifications.openItem", "Open notification: {{message}}", { message: n.message })}
                >
                  <div className="relative shrink-0">
                    <NotificationMediaThumb
                      movieId={n.movie_id}
                      alt={n.message}
                      className="h-16 w-11 rounded-xl border border-border/70 object-cover shadow-sm ring-1 ring-white/5"
                    />
                    {!n.is_read && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-sm leading-snug text-foreground sm:text-[0.95rem]",
                          !n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/90",
                        )}
                      >
                        {n.message}
                      </p>
                      {!n.is_read && (
                        <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          {t("notifications.new", "New")}
                        </span>
                      )}
                      {n.groupedCount > 1 && (
                        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("notifications.groupedUpdates", "{{count}} updates", { count: n.groupedCount })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                      <span className="inline-flex h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <span className={cn(n.is_read ? "text-muted-foreground" : "text-primary font-medium")}>
                        {n.is_read ? t("notifications.read", "Read") : t("notifications.unread", "Unread")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-10 min-w-10 shrink-0 rounded-xl border border-primary/20 bg-primary/10 text-primary transition-all hover:bg-primary/20 hover:border-primary/40"
                      aria-label={t("notifications.markRead", "Mark as read")}
                      onClick={() => void markRead(n.id)}
                      title={t("notifications.markRead", "Mark as read")}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-10 min-w-10 shrink-0 rounded-xl border border-transparent text-muted-foreground opacity-70 transition-all hover:border-border hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t("notifications.archiveItem", "Archive notification: {{message}}", { message: n.message })}
                    onClick={() => handleArchive(n.id)}
                    title={t("notifications.archiveFromInbox", "Archive from inbox")}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
