import { Bell, CheckCheck, ChevronRight, Check, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
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

function NotificationBellComponent() {
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
  const previewNotifications = unreadNotifications.slice(0, 4);

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
      className={cn(
        "relative !h-11 !min-h-11 !w-11 !min-w-11 md:!h-9 md:!min-h-9 md:!w-9 md:!min-w-9 overflow-visible rounded-full border border-white/10 bg-white/5 text-foreground/90 backdrop-blur transition-colors duration-200 hover:bg-white/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-red-500/50",
        unreadCount > 0 && "border-primary/25 bg-primary/5",
      )}
      type="button"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 transition-opacity",
          unreadCount > 0 && "bg-transparent",
        )}
        aria-hidden="true"
      />
      <Bell className={cn("relative h-5 w-5", unreadCount > 0 && "text-primary")} />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-black text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationList = (
    <section aria-label="Unread notifications">
      {unreadNotifications.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/45 text-muted-foreground shadow-inner">
            <Bell className="h-5 w-5" />
          </div>
          <div className="text-base font-semibold tracking-tight text-foreground">
            You&apos;re all caught up
          </div>
          <div className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">
            New updates will appear here as soon as they happen.
          </div>
        </div>
      ) : (
        <div className="max-h-[24rem] space-y-2 overflow-y-auto overscroll-contain p-3">
          {previewNotifications.map((notification) => (
            <div
              key={notification.id}
              className="group/notification flex items-start gap-3 rounded-2xl border border-border/60 bg-background/58 px-3 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/28 hover:bg-card/82"
            >
              <button
                type="button"
                className={cn(
                  "group flex min-w-0 flex-1 items-start gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                  className="h-14 w-10 rounded-xl border border-white/10 shadow-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-5 text-foreground">
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
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`Mark notification as read: ${notification.message}`}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            </div>
          ))}
          {unreadNotifications.length > previewNotifications.length ? (
            <Link
              to="/notifications"
            className="flex min-h-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              View {unreadNotifications.length - previewNotifications.length} more unread
            </Link>
          ) : null}
        </div>
      )}

      <div className="border-t border-border/60 bg-muted/10 p-3">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{notifications.length} total notifications</span>
          <span>{unreadCount} unread</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/notifications"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.18)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            View all notifications
          </Link>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
          className="safe-area-insets h-[88vh] max-h-[88vh] rounded-b-[28px] rounded-t-none border-b border-border/60 bg-card/98 px-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] shadow-2xl"
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
        sideOffset={12}
        className="w-[26rem] overflow-hidden rounded-[1.5rem] border-border/60 bg-popover/98 p-0 shadow-[0_26px_80px_hsl(var(--background)/0.5)] ring-1 ring-white/10 backdrop-blur-2xl"
      >
        <div className="relative overflow-hidden border-b border-border/60 bg-card/94 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-bold tracking-tight text-foreground">
                Notifications
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-background/55 px-2.5 py-1">
                  {notifications.length} total
                </span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
                  {unreadCount} unread
                </span>
              </div>
            </div>
            <Link
              to="/notifications"
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-border/60 bg-background/65 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

export const NotificationBell = memo(NotificationBellComponent);
