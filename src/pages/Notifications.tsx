import { Bell, Trash2, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  return (
    <>
      <SEO
        title="Notifications – CineTrekker"
        description="Your CineTrekker notifications"
        canonical="https://cinetrekker.vercel.app/notifications"
      />
      <div className="page-container pt-20 pb-24 md:pb-0 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="section-title flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              className="gap-2"
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
            actionLabel="Browse titles"
            actionLink="/"
          />
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors",
                  !n.is_read && "border-primary/30 bg-primary/5",
                  n.is_read && "border-border bg-card",
                )}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full shrink-0",
                        !n.is_read
                          ? "bg-primary"
                          : "bg-transparent border border-muted-foreground/30",
                      )}
                      aria-hidden="true"
                    />
                    <p className={cn("text-sm", !n.is_read && "font-medium")}>
                      {n.message}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
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
