import { Bell, CheckCheck, ChevronRight, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getNotificationTarget } from "@/lib/notificationLinks";
import { NotificationMediaThumb } from "@/components/NotificationMediaThumb";
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

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.is_read),
    [notifications],
  );

  const handleNotificationClick = (id: string, movieId: string) => {
    void markRead(id);

    const target = getNotificationTarget(movieId);
    if (target) {
      navigate(target);
    }
  };

  const handleMarkRead = (id: string) => {
    void markRead(id);
  };

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative rounded-full border border-transparent bg-background/60 shadow-sm backdrop-blur transition-colors hover:border-border/60 hover:bg-background"
      type="button"
      onClick={(event) => {
        event.currentTarget.blur();
      }}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationList = (
    <section aria-label="Unread notifications">
      {unreadNotifications.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 text-muted-foreground">
            <Bell className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-foreground">
            You&apos;re all caught up
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            New updates will appear here as soon as they happen.
          </div>
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {unreadNotifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3"
            >
              <button
                type="button"
                className={cn(
                  "group flex min-w-0 flex-1 items-start gap-3 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
                aria-label={`Open notification: ${notification.message}`}
                onClick={() =>
                  handleNotificationClick(
                    notification.id,
                    notification.movie_id,
                  )
                }
              >
                <NotificationMediaThumb
                  movieId={notification.movie_id}
                  alt={notification.message}
                  className="h-14 w-10 rounded-lg"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-6 text-foreground">
                    {notification.message}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      New
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkRead(notification.id)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`Mark notification as read: ${notification.message}`}
              >
                <Check className="h-3.5 w-3.5" />
                Mark read
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border/60 bg-muted/20 p-3">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{notifications.length} total notifications</span>
          <span>{unreadCount} unread</span>
        </div>
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
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>
    </section>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{bellButton}</SheetTrigger>
        <SheetContent
          side="top"
          showCloseButton={false}
          className="safe-area-insets h-[88vh] max-h-[88vh] rounded-b-[24px] rounded-t-none border-b border-border/60 bg-card px-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
        >
          <SheetHeader className="border-b border-border/60 px-4 pb-4 pt-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-lg">Notifications</SheetTitle>
                <SheetDescription className="mt-1 text-sm text-muted-foreground">
                  Unread updates only
                </SheetDescription>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1">
                    {notifications.length} total
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                    {unreadCount} unread
                  </span>
                </div>
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
      <PopoverContent
        align="end"
        className="w-[22rem] overflow-hidden rounded-3xl border-border/60 p-0 shadow-2xl shadow-black/20"
      >
        <div className="border-b border-border/60 bg-card px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Notifications
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {notifications.length} total notifications · {unreadCount} unread
              </div>
            </div>
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        {notificationList}
      </PopoverContent>
    </Popover>
  );
}
