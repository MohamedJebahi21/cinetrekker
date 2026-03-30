import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Menu from "lucide-react/dist/esm/icons/menu";
import X from "lucide-react/dist/esm/icons/x";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Settings from "lucide-react/dist/esm/icons/settings";
import Palette from "lucide-react/dist/esm/icons/palette";
import House from "lucide-react/dist/esm/icons/house";
import Search from "lucide-react/dist/esm/icons/search";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import ChartNoAxesCombined from "lucide-react/dist/esm/icons/chart-no-axes-combined";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Layers from "lucide-react/dist/esm/icons/layers";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Award from "lucide-react/dist/esm/icons/award";
import User from "lucide-react/dist/esm/icons/user";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/Image";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { profileService } from "@/services/profile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NotificationBell = lazy(() =>
  import("@/components/NotificationBell").then((mod) => ({
    default: mod.NotificationBell,
  })),
);
const SearchDropdown = lazy(() =>
  import("@/components/SearchDropdown").then((mod) => ({
    default: mod.SearchDropdown,
  })),
);

interface NavItem {
  path: string;
  key: string;
  fallback: string;
  icon: LucideIcon;
  exact?: boolean;
}

// Mega menu structure — 3 columns
const MEGA_MENU_COLUMNS = [
  {
    heading: "Discover",
    items: [
      { path: "/", key: "nav.home", fallback: "Home", icon: House, exact: true },
      { path: "/search", key: "nav.search", fallback: "Search", icon: Search },
      { path: "/trending", key: "nav.trending", fallback: "Trending", icon: Sparkles },
      { path: "/genres", key: "nav.genres", fallback: "Genres", icon: Layers },
      { path: "/decades", key: "nav.decades", fallback: "Decades", icon: CalendarDays },
      { path: "/awards", key: "nav.awards", fallback: "Awards", icon: Award },
    ],
  },
  {
    heading: "My Lists",
    items: [
      { path: "/watchlist", key: "nav.watchlist", fallback: "Watchlist", icon: Bookmark },
      { path: "/watched", key: "nav.watched", fallback: "Watched", icon: CheckCheck },
      { path: "/following", key: "nav.following", fallback: "Following", icon: User },
      { path: "/recommendations", key: "nav.recommendations", fallback: "Recommendations", icon: Sparkles },
      { path: "/calendar", key: "nav.calendar", fallback: "Calendar", icon: Calendar },
    ],
  },
  {
    heading: "Progress",
    items: [
      { path: "/stats", key: "nav.stats", fallback: "Stats", icon: ChartNoAxesCombined },
      { path: "/achievements", key: "nav.achievements", fallback: "Achievements", icon: Trophy },
      { path: "/year-in-review", key: "nav.yearInReview", fallback: "Year In Review", icon: CalendarDays },
    ],
  },
];

const NAV_ITEMS: NavItem[] = MEGA_MENU_COLUMNS.flatMap((col) => col.items) as NavItem[];

const THEME_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "oled", label: "OLED" },
] as const;

export function UnifiedNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isSearchPage = pathname.startsWith("/search");
  const { user, signOut, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopToggleButtonRef = useRef<HTMLButtonElement>(null);
  const desktopThemeMenuRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const profileImageUrl = useMemo(() => {
    if (profile?.profile_photo) return profile.profile_photo;
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const candidates = [metadata?.avatar_url, metadata?.picture, metadata?.photo_url];
    return candidates.find((v): v is string => typeof v === "string" && v.trim().length > 0) ?? null;
  }, [profile, user]);

  const profileInitial = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const rawName = [metadata?.full_name, metadata?.name, metadata?.preferred_username, user?.email].find(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    return rawName?.trim().charAt(0).toUpperCase() ?? "P";
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isMenuOpen) {
        const inside = desktopMenuRef.current?.contains(target);
        const toggle = desktopToggleButtonRef.current?.contains(target);
        if (!inside && !toggle) setIsMenuOpen(false);
      }
      if (isThemeMenuOpen && !desktopThemeMenuRef.current?.contains(target)) {
        setIsThemeMenuOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsThemeMenuOpen(false);
        setIsMobileSheetOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isMenuOpen, isThemeMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsThemeMenuOpen(false);
    setIsMobileSheetOpen(false);
  }, [pathname]);

  const openSearch = () => window.dispatchEvent(new CustomEvent("open-search-overlay"));

  const renderProfileAvatar = () =>
    profileImageUrl ? (
      <Image
        src={profileImageUrl}
        alt={t("nav.profile", "Profile")}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {profileInitial}
      </span>
    );

  const searchFallback = (
    <div aria-hidden="true" className="h-10 w-full rounded-xl border border-border/50 bg-card/40" />
  );
  const notificationFallback = (
    <span aria-hidden="true" className="inline-flex min-h-[48px] min-w-[48px] rounded-lg border border-border/40 bg-card/30" />
  );

  return (
    <header
      role="banner"
      className={cn(
        "glass-nav min-h-[calc(4rem+env(safe-area-inset-top,0px)+0.4rem)] pt-[calc(env(safe-area-inset-top,0px)+0.4rem)] transition-all duration-300",
        isScrolled && "scrolled",
      )}
    >
      <div className="container mx-auto flex h-full items-center justify-between gap-3 px-3 sm:px-4 md:gap-4">
        {/* Logo */}
        <Link to="/" className="group flex flex-shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(358_94%_46%/0.5)]">
            <span className="text-xl font-bold text-primary-foreground">CT</span>
          </div>
          <div className="hidden min-w-0 sm:block">
            <span className="block text-base font-bold text-foreground lg:text-xl">
              {t("common.appName", "CineTrekker")}
            </span>
          </div>
        </Link>

        {/* Desktop search */}
        {!isSearchPage && (
          <div className="mx-4 hidden max-w-xl flex-1 md:block">
            <Suspense fallback={searchFallback}>
              <SearchDropdown />
            </Suspense>
          </div>
        )}

        {/* Desktop right controls */}
        <div className="hidden items-center gap-1 md:flex">
          <Suspense fallback={notificationFallback}>
            <NotificationBell />
          </Suspense>

          {user ? (
            <>
              <Link
                to="/profile"
                className={cn(
                  "inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent",
                  pathname.startsWith("/profile") && "text-primary",
                )}
                aria-label={t("nav.profile", "Profile")}
              >
                {renderProfileAvatar()}
              </Link>
              <Link
                to="/settings"
                className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
                aria-label={t("nav.settings", "Settings")}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {t("nav.signIn", "Sign In")}
            </Link>
          )}

          {/* Theme picker */}
          <div className="relative" ref={desktopThemeMenuRef}>
            <button
              type="button"
              onClick={() => setIsThemeMenuOpen((prev) => !prev)}
              className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
              aria-label={t("nav.changeTheme", "Change theme")}
            >
              <Palette className="h-5 w-5" />
            </button>
            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-xl">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setTheme(option.value); setIsThemeMenuOpen(false); }}
                    className={cn("w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent", theme === option.value && "bg-accent")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button
            ref={desktopToggleButtonRef}
            type="button"
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? t("nav.closeMenu", "Close menu") : t("nav.openMenu", "Open menu")}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            aria-label={t("nav.search", "Search")}
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMobileSheetOpen(true)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            aria-label={t("nav.openMenu", "Open menu")}
            aria-expanded={isMobileSheetOpen}
            aria-controls="mobile-nav-sheet"
          >
            {user ? renderProfileAvatar() : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Desktop Mega Menu ── */}
      <div
        ref={desktopMenuRef}
        className={cn(
          "absolute right-0 top-[calc(4rem+env(safe-area-inset-top,0px)+0.4rem)] z-50 hidden w-full border-t border-border/40 bg-background shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out md:block",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-10">
            {MEGA_MENU_COLUMNS.map((col) => (
              <div key={col.heading}>
                {/* Column heading */}
                <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {col.heading}
                </p>
                <ul className="space-y-1">
                  {col.items.map((item) => {
                    const isActive = (item as NavItem).exact
                      ? pathname === item.path
                      : pathname.startsWith(item.path);
                    const Icon = item.icon;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-accent hover:text-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                          {t(item.key, item.fallback)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar — sign out / sign in */}
          {!loading && (
            <div className="mt-8 border-t border-border/40 pt-5">
              {user ? (
                <button
                  type="button"
                  onClick={() => { signOut(); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.signOut", "Sign Out")}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.signIn", "Sign In")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sheet ── */}
      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetContent
          id="mobile-nav-sheet"
          side="right"
          className="safe-area-insets w-full border-l border-border/60 bg-background/98 px-4 pb-8 pt-6 backdrop-blur-2xl md:hidden sm:max-w-sm"
        >
          <SheetHeader className="text-left">
            <SheetTitle>{t("common.appName", "CineTrekker")}</SheetTitle>
            <SheetDescription>
              Browse quickly on phones and tablets without a crowded header.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3">
              {user ? renderProfileAvatar() : <User className="h-8 w-8 text-muted-foreground" />}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{user?.email || "Guest"}</div>
                <div className="text-xs text-muted-foreground">{user ? "Signed in" : "Sign in to sync your lists"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { openSearch(); setIsMobileSheetOpen(false); }}
                className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/70 text-sm font-medium"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              <div className="flex min-h-[56px] items-center justify-center rounded-2xl border border-border/60 bg-card/70">
                <Suspense fallback={notificationFallback}>
                  <NotificationBell />
                </Suspense>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "rounded-xl border border-border/60 px-3 py-2 text-sm font-medium",
                      theme === option.value ? "border-primary/40 bg-primary/10 text-primary" : "bg-card/60 text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <nav className="space-y-2" aria-label={t("nav.main", "Main navigation")}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileSheetOpen(false)}
                    className={cn(
                      "flex min-h-[52px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "bg-card/60 text-foreground hover:bg-accent/50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.key, item.fallback)}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-2">
              <Link
                to="/settings"
                onClick={() => setIsMobileSheetOpen(false)}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-card/60 px-4 py-3 text-sm font-medium text-foreground"
              >
                <Settings className="h-4 w-4" />
                {t("nav.settings", "Settings")}
              </Link>

              {user ? (
                <button
                  type="button"
                  onClick={() => { void signOut(); setIsMobileSheetOpen(false); }}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.signOut", "Sign Out")}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.signIn", "Sign In")}
                </Link>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export default UnifiedNav;
