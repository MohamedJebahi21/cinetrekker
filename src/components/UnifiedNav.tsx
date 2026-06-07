import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, CalendarDays, Compass, Film, Layers, LogIn, Menu, Palette, Settings, Star, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { NotificationBell } from "@/components/NotificationBell";
import { getCurrentStreak } from "@/lib/streak";

type NavItem = {
  path: string;
  label: string;
  icon: typeof Compass;
  auth?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/discover", label: "Discover", icon: Compass },
  { path: "/trending", label: "Trending", icon: Film },
  { path: "/genres", label: "Genres", icon: Layers },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, auth: true },
  { path: "/stats", label: "Stats", icon: Award, auth: true },
  { path: "/watchlist", label: "Watchlist", icon: Star, auth: true },
];

function NavLink({
  to,
  active,
  onClick,
  children,
}: {
  to: string;
  active: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function UnifiedNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const streak = getCurrentStreak();

  const profileHref = user ? "/profile" : "/login";
  const profileLabel = user ? t("nav.profile", "Profile") : t("nav.signIn", "Sign In");
  const profileInitial = useMemo(() => {
    const source = user?.email || "C";
    return source.slice(0, 1).toUpperCase();
  }, [user?.email]);

  const cycleTheme = () => {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "oled" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="page-container flex h-16 items-center gap-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            C
          </span>
          <span className="hidden text-sm sm:inline">{t("common.appName", "CineTrekker")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.filter((item) => !item.auth || user).map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} active={active}>
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {streak > 0 ? (
            <div className="hidden rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-400 md:block">
              {streak}d
            </div>
          ) : null}

          {user ? (
            <div className="hidden rounded-full border border-border/60 bg-card/60 px-1 py-1 shadow-sm backdrop-blur-xl md:flex">
              <NotificationBell />
            </div>
          ) : null}

          <Button variant="ghost" size="icon" className="rounded-full" onClick={cycleTheme} aria-label={t("nav.changeTheme", "Change theme")}>
            <Palette className="h-5 w-5" />
          </Button>

          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to={profileHref} aria-label={profileLabel}>
              {user ? (
                <User className="h-5 w-5" />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {profileInitial}
                </span>
              )}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t("nav.openMenu", "Open menu")}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden rounded-full md:inline-flex"
            onClick={() => setMobileOpen(true)}
            aria-label={t("nav.openMenu", "Open menu")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-label={t("nav.menu", "Menu")}
          className="w-[min(100vw,22rem)] p-0"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border/60 px-5 py-4">
              <SheetTitle className="flex items-center justify-between text-left">
                <span>{t("common.appName", "CineTrekker")}</span>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setMobileOpen(false)} aria-label={t("nav.closeMenu", "Close menu")}>
                  <X className="h-5 w-5" />
                </Button>
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {NAV_ITEMS.filter((item) => !item.auth || user).map((item) => {
                  const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/60 bg-card/60 text-foreground hover:bg-accent/60",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 rounded-3xl border border-border/60 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("nav.account", "Account")}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button asChild>
                    <Link to={profileHref} onClick={() => setMobileOpen(false)}>
                      {profileLabel}
                    </Link>
                  </Button>
                  {user ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileOpen(false);
                        void signOut();
                      }}
                    >
                      {t("nav.signOut", "Sign Out")}
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      <Link to="/signup" onClick={() => setMobileOpen(false)}>
                        <LogIn className="mr-2 h-4 w-4" />
                        {t("authPrompt.createAccount", "Create Account")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export default UnifiedNav;
