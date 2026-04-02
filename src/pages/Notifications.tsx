import { Bell, Trash2, CheckCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyStates";
import { cn } from "@/lib/utils";
import { getNotificationTarget } from "@/lib/notificationLinks";
import { NotificationMediaThumb } from "@/components/NotificationMediaThumb";

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationClick = (id: string, movieId: string, isRead: boolean) => {
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
        title="Notifications – CineTrekker"
        description="Your CineTrekker notifications"
        canonical="https://cinetrekker.vercel.app/notifications"
      />
      <div className="page-container mx-auto max-w-2xl pt-20 pb-28 md:pb-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="section-title flex items-center gap-3 text-3xl sm:text-[2.5rem]">
            <Bell className="w-7 h-7 text-primary" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              className="min-h-11 w-full gap-2 sm:w-auto"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Follow movies and series to get notified about new episodes, season changes, releases, and more."
            action={{
              label: "Browse titles",
              onClick: () => {
                navigate("/");
              },
            }}
          />
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-2xl border p-4 transition-colors sm:p-4",
                  !n.is_read && "border-primary/30 bg-primary/5",
                  n.is_read && "border-border bg-card",
                )}
              >
                <button
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => handleNotificationClick(n.id, n.movie_id, n.is_read)}
                >
                  <NotificationMediaThumb
                    movieId={n.movie_id}
                    alt={n.message}
                    className="h-16 w-11 shrink-0 rounded-lg border border-border/60 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-6", !n.is_read && "font-medium")}>
                      {n.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Delete notification"
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
