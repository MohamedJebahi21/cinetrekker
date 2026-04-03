import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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

  useLayoutEffect(() => {
    setIsMenuOpen(false);
    setIsThemeMenuOpen(false);
    setIsMobileSheetOpen(false);
  }, [pathname]);

  // Listen for open-mobile-menu events dispatched by the MobileBottomNav "More" button
  useEffect(() => {
    const handler = () => setIsMobileSheetOpen(true);
    window.addEventListener("cinetrekker:open-mobile-menu", handler);
    return () => window.removeEventListener("cinetrekker:open-mobile-menu", handler);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    if (isMobileSheetOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSheetOpen]);

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
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
              aria-label={t("nav.search", "Search")}
            >
              <Search className="h-5 w-5" />
            </button>

            {user ? (
              <Suspense fallback={notificationFallback}>
                <NotificationBell />
              </Suspense>
            ) : null}

            {user ? (
              <Link
                to="/profile"
                className={cn(
                  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent",
                  pathname.startsWith("/profile") && "text-primary",
                )}
                aria-label={t("nav.profile", "Profile")}
              >
                {renderProfileAvatar()}
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
                aria-label={t("nav.signIn", "Sign In")}
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            <SheetTrigger asChild>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.blur();
                }}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
                aria-label={t("nav.openMenu", "Open menu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
          </div>

          <SheetContent
            id="mobile-nav-sheet"
            side="right"
            closeIcon={<Menu className="h-5 w-5" />}
            closeAriaLabel={t("nav.closeMenu", "Close menu")}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              const closeButton = event.currentTarget.querySelector<HTMLButtonElement>("[data-sheet-close]");
              closeButton?.focus();
            }}
            className="safe-area-insets w-full max-w-none overflow-y-auto smooth-scroll border-l-0 bg-background px-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] md:hidden sm:w-3/4 sm:max-w-sm sm:border-l"
          >
            <div className="w-full px-4 sm:px-5">
                <SheetHeader className="rounded-2xl border border-border/60 bg-card/60 px-4 py-4 text-left shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                  <SheetTitle className="text-xl leading-tight">{t("common.appName", "CineTrekker")}</SheetTitle>
                  <div className="text-sm text-muted-foreground">
                    Explore, track, and manage your lists
                  </div>
                </SheetHeader>

                <div className="mt-5 space-y-5 pb-2">
                <Link
                  to={user ? "/profile" : "/login"}
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={user ? t("nav.profile", "Profile") : t("nav.signIn", "Sign In")}
                >
                  {user ? renderProfileAvatar() : <User className="h-8 w-8 text-muted-foreground" />}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{user?.email || "Guest"}</div>
                    <div className="text-xs text-muted-foreground">{user ? "Signed in" : "Sign in to sync your lists"}</div>
                  </div>
                </Link>

                <div className="space-y-2 border-t border-border/50 pt-4">
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

                <nav className="space-y-2 border-t border-border/50 pt-4" aria-label={t("nav.main", "Main navigation")}>
                  <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Browse</p>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileSheetOpen(false)}
                        className={cn(
                          "flex min-h-[56px] min-w-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "border border-primary/25 bg-primary/10 text-primary"
                            : "border border-border/40 bg-card/60 text-foreground hover:bg-accent/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            isActive ? "bg-primary/15" : "bg-background/60",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 break-words leading-5">{t(item.key, item.fallback)}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="space-y-2 border-t border-border/50 pt-4">
                  <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Account</p>
                  <Link
                    to="/settings"
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="flex min-h-[56px] min-w-0 items-center gap-3 rounded-2xl border border-border/40 bg-card/60 px-4 py-3 text-sm font-medium text-foreground"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words leading-5">{t("nav.settings", "Settings")}</span>
                  </Link>

                  {user ? (
                    <button
                      type="button"
                      onClick={() => { void signOut(); setIsMobileSheetOpen(false); }}
                      className="flex min-h-[56px] w-full min-w-0 items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words leading-5">{t("nav.signOut", "Sign Out")}</span>
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMobileSheetOpen(false)}
                      className="flex min-h-[56px] min-w-0 items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
                    >
                      <LogIn className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words leading-5">{t("nav.signIn", "Sign In")}</span>
                    </Link>
                  )}
                </div>
                </div>
              </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Desktop Mega Menu ── */}
      <div
        ref={desktopMenuRef}
        className={cn(
          "absolute right-0 top-[calc(4rem+env(safe-area-inset-top,0px)+0.4rem)] z-50 hidden w-full border-t border-border/40 bg-gradient-to-b from-background via-background/95 to-background/90 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out md:block",
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <div className="container mx-auto px-6 py-7">
          <div className="grid grid-cols-3 gap-6">
            {MEGA_MENU_COLUMNS.map((col) => (
              <div
                key={col.heading}
                className="rounded-2xl border border-border/45 bg-card/55 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
              >
                {/* Column heading */}
                <p className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/12 text-primary"
                              : "text-foreground/80 hover:bg-accent/80 hover:text-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border",
                              isActive
                                ? "border-primary/35 bg-primary/15"
                                : "border-border/50 bg-background/50 group-hover:border-border/80",
                            )}
                          >
                            <Icon className="h-4 w-4 opacity-80" />
                          </span>
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
            <div className="mt-6 border-t border-border/40 pt-5">
              {user ? (
                <button
                  type="button"
                  onClick={() => { signOut(); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.signOut", "Sign Out")}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.signIn", "Sign In")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

    </header>
  );
}

export default UnifiedNav;
