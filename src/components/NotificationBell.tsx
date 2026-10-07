import { Bell, CheckCheck, ChevronRight, Check, X, Settings2, CalendarDays } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { arSA, de, es, fr, tr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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

const relativeTimeLocales = { ar: arSA, de, es, fr, tr };

function NotificationBellComponent() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
  const previewNotifications = unreadNotifications.slice(0, 3);
  const languageCode = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] as keyof typeof relativeTimeLocales;
  const relativeTimeLocale = relativeTimeLocales[languageCode];
  const unreadLabel = t("notifications.unreadUpdates", { count: unreadCount });

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
        "relative !h-11 !min-h-11 !w-11 !min-w-11 overflow-visible rounded-full border border-border/40 bg-foreground/5 text-foreground/90 backdrop-blur transition-all duration-200 hover:bg-foreground/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/50 md:!h-9 md:!min-h-9 md:!w-9 md:!min-w-9",
        unreadCount > 0 && "border-primary/30 bg-primary/10 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.15)]",
      )}
      type="button"
      aria-label={t("notifications.open", { count: unreadCount })}
    >
      <Bell className={cn("relative h-5 w-5", unreadCount > 0 && "text-primary")} />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-sm">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationList = (
    <section aria-label={t("notifications.unreadRegion")}>
      {unreadNotifications.length === 0 ? (
        <div className="px-5 py-9 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/35 text-primary">
            <CheckCheck className="h-5 w-5" />
          </div>
          <div className="mt-4 text-base font-bold tracking-tight text-foreground">
            {t("notifications.emptyTitle")}
          </div>
          <div className="mx-auto mt-1.5 max-w-[17rem] text-sm leading-6 text-muted-foreground">
            {t("notifications.emptyDescription")}
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              to="/calendar"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-3.5 text-xs font-bold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <CalendarDays className="h-4 w-4 text-primary" />
              {t("notifications.exploreCalendar")}
            </Link>
            <Link
              to="/notifications"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("notifications.viewHistory")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain p-3">
          {previewNotifications.map((notification) => (
            <div
              key={notification.id}
              className="group/notification relative flex items-start gap-2 rounded-2xl border border-border/60 bg-background p-2.5 shadow-sm transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/28 hover:bg-card"
            >
              <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-primary" aria-hidden="true" />
              <button
                type="button"
                className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t("notifications.openItem", { message: notification.message })}
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
                  className="h-14 w-10 rounded-xl border border-border/40 shadow-sm"
                />
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-sm font-semibold leading-5 text-foreground">
                    {notification.message}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: relativeTimeLocale,
                      })}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                      {t("notifications.new")}
                    </span>
                  </span>
                </span>
                <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkRead(notification.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={t("notifications.markReadItem", { message: notification.message })}
                title={t("notifications.markRead")}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}
          {unreadNotifications.length > previewNotifications.length ? (
            <Link
              to="/notifications"
              className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("notifications.moreUnread", { count: unreadNotifications.length - previewNotifications.length })}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );

  const notificationFooter = unreadCount > 0 ? (
    <footer className="border-t border-border/60 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{unreadLabel}</p>
        <Link
          to="/settings#section-notifications"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t("notifications.managePreferences")}
          title={t("notifications.managePreferences")}
        >
          <Settings2 className="h-4 w-4" />
        </Link>
      </div>
      <button
        type="button"
        onClick={() => markAllRead()}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <CheckCheck className="h-4 w-4" />
        {t("notifications.markAllRead")}
      </button>
    </footer>
  ) : null;

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{bellButton}</SheetTrigger>
        <SheetContent
          side="top"
          showCloseButton={false}
          className="safe-area-insets h-[88vh] max-h-[88vh] rounded-b-[28px] rounded-t-none border-b border-border/60 bg-card px-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] shadow-2xl"
        >
          <SheetHeader className="border-b border-border/60 px-4 pb-4 pt-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-lg">{t("notifications.title", "Notifications")}</SheetTitle>
                  <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
                    {unreadCount > 0 ? unreadLabel : t("notifications.emptyTitle")}
                  </SheetDescription>
                </div>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t("notifications.close", "Close notifications")}
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </div>
            {unreadCount > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {unreadLabel}
                </span>
                <Link
                  to="/notifications"
                  className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t("notifications.viewAll", "View all")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notificationList}
            {notificationFooter}
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
        className="w-[25rem] overflow-hidden rounded-[1.5rem] border-border/60 bg-popover p-0 shadow-[0_26px_80px_hsl(var(--background)/0.5)] ring-1 ring-border/40"
      >
        <div className="relative border-b border-border/60 bg-card px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold tracking-tight text-foreground">
                  {t("notifications.title", "Notifications")}
                </div>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {unreadCount > 0 ? unreadLabel : t("notifications.emptyTitle")}
                </p>
              </div>
            </div>
            <Link
              to="/notifications"
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t("notifications.viewAll", "View all")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {unreadCount > 0 && (
            <div className="mt-3">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {unreadLabel}
              </span>
            </div>
          )}
        </div>
        {notificationList}
        {notificationFooter}
      </PopoverContent>
    </Popover>
  );
}

export const NotificationBell = memo(NotificationBellComponent);
