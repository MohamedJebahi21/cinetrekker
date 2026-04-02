import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getNotificationTarget } from "@/lib/notificationLinks";
import { NotificationMediaThumb } from "@/components/NotificationMediaThumb";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const recent = notifications.slice(0, 5);

  const handleNotificationClick = (id: string, movieId: string, isRead: boolean) => {
    if (!isRead) {
      void markRead(id);
    }

    const target = getNotificationTarget(movieId);
    if (target) {
      navigate(target);
    }
  };

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={(event) => {
        event.currentTarget.blur();
      }}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationList = (
    <section aria-label="Recent notifications" role="status" aria-live="polite">
      {recent.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {recent.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-label={`${n.is_read ? "Read" : "Unread"} notification: ${n.message}`}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border border-border/50 bg-card/60 px-3 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                !n.is_read && "border-primary/20 bg-primary/5",
              )}
              onClick={() => handleNotificationClick(n.id, n.movie_id, n.is_read)}
            >
              <NotificationMediaThumb movieId={n.movie_id} alt={n.message} className="h-14 w-10 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm leading-6", !n.is_read && "font-medium text-foreground")}>
                  {n.message}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="border-t border-border/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/notifications"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View all notifications
            </Link>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border/60 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{bellButton}</SheetTrigger>
        <SheetContent
          side="top"
          showCloseButton={false}
          className="safe-area-insets h-[88vh] max-h-[88vh] rounded-b-[24px] rounded-t-none border-b border-border/60 bg-background px-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
        >
          <SheetHeader className="border-b border-border/60 px-4 pb-4 pt-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-lg">Notifications</SheetTitle>
                <SheetDescription className="mt-1 text-sm text-muted-foreground">
                  Recent activity and updates
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notificationList}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="rounded-sm px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Mark all read
            </button>
          )}
        </div>
        <Separator />
        {notificationList}
      </PopoverContent>
    </Popover>
  );
}
