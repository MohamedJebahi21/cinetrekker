import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

  const recent = notifications.slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="rounded-sm px-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Mark all read
            </button>
          )}
        </div>
        <Separator />

        {recent.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          recent.map((n) => (
            <button
              key={n.id}
              type="button"
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                !n.is_read && "bg-primary/5",
              )}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <span
                className={cn(
                  "mt-1 h-2 w-2 rounded-full shrink-0",
                  !n.is_read
                    ? "bg-primary"
                    : "bg-transparent border border-muted-foreground/30",
                )}
                aria-hidden="true"
              />
              <span className="flex-1">
                <span className="block text-sm leading-snug">{n.message}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </span>
            </button>
          ))
        )}

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-1">
              <Link
                to="/notifications"
                className="flex w-full justify-center rounded-sm py-2 text-xs text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                View all notifications
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
