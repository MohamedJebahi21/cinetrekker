import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Settings from "lucide-react/dist/esm/icons/settings";
import Palette from "lucide-react/dist/esm/icons/palette";
import Globe from "lucide-react/dist/esm/icons/globe";
import Layers from "lucide-react/dist/esm/icons/layers";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Award from "lucide-react/dist/esm/icons/award";
import User from "lucide-react/dist/esm/icons/user";
import Compass from "lucide-react/dist/esm/icons/compass";
import Film from "lucide-react/dist/esm/icons/film";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Heart from "lucide-react/dist/esm/icons/heart";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMotionIntensityPreference } from "@/hooks/useMotionIntensityPreference";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { profileService } from "@/services/profile";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { languages } from "@/i18n";

const SearchDropdown = lazy(() =>
  import("@/components/SearchDropdown").then((mod) => ({
    default: mod.SearchDropdown,
  })),
);

const RemotionAurora = lazy(() =>
  import("@/components/motion/RemotionAurora").then((mod) => ({
    default: mod.RemotionAurora,
  })),
);

// Grouped navigation for high-fidelity overlays
const navigationGroups = [
  {
    title: "Personal Library",
    links: [
      { path: "/", labelKey: "nav.home", defaultLabel: "Home", icon: Compass, desc: "Your personal feed and tonight's picks." },
      { path: "/profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: User, desc: "Manage your account, rank, and stats." },
      { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Bookmark, desc: "Your list of titles to watch." },
      { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: CheckSquare, desc: "Your logged watch history." },
      { path: "/following", labelKey: "nav.following", defaultLabel: "Following", icon: User, desc: "Titles you are tracking for updates." },
    ],
  },
  {
    title: "Community",
    links: [
      { path: "/people", labelKey: "nav.people", defaultLabel: "People", icon: User, desc: "Discover public profiles and follow fellow cinephiles." },
    ],
  },
  {
    title: "Discovery & Explore",
    links: [
      { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass, desc: "Explore recommendations and releases." },
      { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film, desc: "What's popular right now." },
      { path: "/search", labelKey: "nav.search", defaultLabel: "Search", icon: Compass, desc: "Find movies, series, or people." },
      { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film, desc: "AI and taste-matching suggestions." },
      { path: "/genres", labelKey: "nav.genres", defaultLabel: "Genres", icon: Layers, desc: "Browse by specific film categories." },
      { path: "/decades", labelKey: "nav.decades", defaultLabel: "Decades", icon: CalendarDays, desc: "Travel through cinema history." },
    ],
  },
  {
    title: "Insights & Awards",
    links: [
      { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays, desc: "TV schedule and movie release tracker." },
      { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award, desc: "Detailed analysis of your viewing habits." },
      { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award, desc: "Trophies and milestones unlocked." },
      { path: "/year-in-review", labelKey: "nav.yearInReview", defaultLabel: "Year In Review", icon: Award, desc: "Your personal annual wrapped recap." },
      { path: "/awards", labelKey: "nav.awards", defaultLabel: "Awards", icon: Award, desc: "Browse award winners and nominees." },
    ],
  },
];

// Flat menu links kept for backwards compatibility with currentPageLabel
const primaryNavigationGroups = navigationGroups.filter((group) => group.title !== "Community");

const menuLinks = [
  { path: "/profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: User },
  { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass },
  { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Bookmark },
  { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: CheckSquare },
  { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film },
  { path: "/search", labelKey: "nav.search", defaultLabel: "Search", icon: Compass },
  { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film },
  { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays },
  { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award },
  { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award },
  { path: "/genres", labelKey: "nav.genres", defaultLabel: "Genres", icon: Layers },
  { path: "/decades", labelKey: "nav.decades", defaultLabel: "Decades", icon: CalendarDays },
  { path: "/awards", labelKey: "nav.awards", defaultLabel: "Awards", icon: Award },
  { path: "/year-in-review", labelKey: "nav.yearInReview", defaultLabel: "Year In Review", icon: Award },
  { path: "/following", labelKey: "nav.following", defaultLabel: "Following", icon: User },
  { path: "/people", labelKey: "nav.people", defaultLabel: "People", icon: User },
];

function BurgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative h-5 w-5 flex items-center justify-center">
      <motion.span
        animate={isOpen ? { rotate: 45, y: 0, top: "9px" } : { rotate: 0, y: 0, top: "4px" }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute left-0 right-0 h-0.5 rounded bg-foreground"
      />
      <motion.span
        animate={isOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        className="absolute left-0 right-0 top-[9px] h-0.5 rounded bg-foreground"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: 0, top: "9px" } : { rotate: 0, y: 0, top: "14px" }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute left-0 right-0 h-0.5 rounded bg-foreground"
      />
    </div>
  );
}

const desktopMenuGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

const menuItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: "easeOut" as const,
    },
  },
};

const mobileMenuListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export function UnifiedNav() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { watched } = useUserLists();
  const reduceMotion = useReducedMotion();
  const motionIntensity = useMotionIntensityPreference();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const profileImageUrl = useMemo(() => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.profile_photo) return profile.profile_photo;
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const candidates = [metadata?.avatar_url, metadata?.picture, metadata?.photo_url];
    return (
      candidates.find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ) ?? null
    );
  }, [profile, user]);

  const moviesWatchedCount = useMemo(() => {
    return watched.filter((item) => item.mediaType === "movie").length;
  }, [watched]);

  const levelInfo = useMemo(() => {
    let name = "Casual Viewer";
    let nextMilestone = 50;
    let prevMilestone = 0;

    if (moviesWatchedCount <= 50) {
      name = t("profile.levelCasualViewer", "Casual Viewer");
      nextMilestone = 50;
      prevMilestone = 0;
    } else if (moviesWatchedCount <= 150) {
      name = t("profile.levelMovieBuff", "Movie Buff");
      nextMilestone = 150;
      prevMilestone = 50;
    } else if (moviesWatchedCount <= 300) {
      name = t("profile.levelCinephile", "Cinephile");
      nextMilestone = 300;
      prevMilestone = 150;
    } else {
      name = t("profile.levelFilmHistorian", "Film Historian");
      nextMilestone = 600;
      prevMilestone = 300;
    }

    const progress = Math.min(
      100,
      Math.max(
        0,
        ((moviesWatchedCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100
      )
    );

    return { name, nextMilestone, progress };
  }, [moviesWatchedCount, t]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = window.scrollY > 20;
      setIsScrolled((current) => (current === next ? current : next));
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsDesktopMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleOpen = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSheetOpen(false);
        setIsDesktopMenuOpen(true);
        return;
      }
      setIsDesktopMenuOpen(false);
      setIsMobileSheetOpen(true);
    };

    window.addEventListener("cinetrekker:open-mobile-menu", handleOpen);
    return () => window.removeEventListener("cinetrekker:open-mobile-menu", handleOpen);
  }, []);

  const searchFallback = (
    <div aria-hidden="true" className="h-11 w-full rounded-xl border border-border/50 bg-card/40" />
  );

  const currentPageLabel = useMemo(() => {
    if (pathname === "/") return t("nav.home", "Home");

    const routeLabels: Array<{ path: string; label: string }> = [
      { path: "/settings", label: t("nav.settings", "Settings") },
      { path: "/login", label: t("nav.signIn", "Sign In") },
      { path: "/signup", label: t("nav.signUp", "Sign Up") },
      { path: "/accessibility", label: t("accessibility.title", "Accessibility Settings") },
      ...menuLinks.map(item => ({ path: item.path, label: t(item.labelKey, item.defaultLabel) })),
    ];

    const matched = routeLabels
      .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];

    if (matched) return matched.label;

    const segment = pathname.split("/").filter(Boolean)[0];
    if (!segment) return t("nav.home", "Home");
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }, [pathname, t]);

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 left-0 right-0 z-[90] border-b border-border/70 bg-background/88 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300",
        isScrolled &&
          "border-border bg-[hsl(var(--background)/0.96)] shadow-[0_10px_28px_hsl(var(--foreground)/0.08)]",
      )}
    >
      <div className="topbar-inner container mx-auto flex h-16 max-w-[84rem] items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="topbar-brand group flex shrink-0 items-center gap-2.5">
          <img
            src="/apple-touch-icon.png"
            alt="CineTrekker logo"
            className="h-9 w-9 rounded-xl object-cover shadow-sm ring-1 ring-white/10 sm:h-10 sm:w-10"
          />
          <span className="hidden text-[0.95rem] font-semibold tracking-[-0.02em] text-foreground sm:block lg:text-base">
            {t("common.appName", "CineTrekker")}
          </span>
        </Link>

        <div className="topbar-context hidden items-center md:flex">
          <span className="max-w-[9rem] truncate border-l border-primary/35 pl-3 text-xs font-medium text-muted-foreground sm:max-w-none sm:text-sm">
            {currentPageLabel}
          </span>
        </div>

        <div className="topbar-search min-w-0 flex-1">
          <Suspense fallback={searchFallback}>
            <SearchDropdown />
          </Suspense>
        </div>

        <div className="topbar-actions ml-auto hidden items-center md:flex">
          {user ? (
            <div className="topbar-action-group">
              <div className="topbar-notification-slot">
                <NotificationBell />
              </div>
              <UserProfileDropdown
                profilePhoto={profileImageUrl}
                displayName={profile?.display_name ?? undefined}
              />
            </div>
          ) : (
            <div className="topbar-action-group">
            <Button asChild variant="ghost" size="icon" className="topbar-icon-button">
              <Link to="/login" aria-label={t("nav.signIn", "Sign In")}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
            </div>
          )}

          <div className="topbar-divider" aria-hidden="true" />
          <div className="topbar-action-group">
            <Button asChild variant="ghost" size="icon" className="topbar-icon-button">
              <Link to="/settings" aria-label={t("nav.settings", "Settings")}>
                <Settings className="h-5 w-5" />
              </Link>
            </Button>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="topbar-icon-button" aria-label={t("nav.changeLanguage", "Change language")}>
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px] bg-popover border-border/50">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => i18n.changeLanguage(lang.code)} className={i18n.language === lang.code ? "bg-accent" : ""}>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="topbar-icon-button" aria-label={t("nav.changeTheme", "Change theme")}>
                  <Palette className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px] bg-popover border-border/50">
                {(["dark", "light", "oled"] as const).map((option) => (
                  <DropdownMenuItem key={option} onClick={() => setTheme(option)} className={theme === option ? "bg-accent" : ""}>
                    {option === "dark" ? t("nav.themeDark", "Dark") : option === "light" ? t("nav.themeLight", "Light") : t("nav.themeOled", "OLED")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="topbar-menu-button relative"
            onClick={() => setIsDesktopMenuOpen((current) => !current)}
            aria-label={isDesktopMenuOpen ? t("common.close", "Close") : t("nav.menu", "Menu")}
            aria-expanded={isDesktopMenuOpen}
            aria-controls="desktop-menu-overlay"
          >
            <BurgerIcon isOpen={isDesktopMenuOpen} />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <Button asChild variant="outline" size="icon" className="h-11 w-11">
            <Link to={user ? "/profile" : "/login"} aria-label={t("nav.profile", "Profile")}>
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={t("nav.profile", "Profile")}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => setIsMobileSheetOpen((current) => !current)}
            aria-label={isMobileSheetOpen ? t("common.close", "Close") : t("nav.menu", "Menu")}
            aria-expanded={isMobileSheetOpen}
            aria-controls="mobile-menu-panel"
          >
            <BurgerIcon isOpen={isMobileSheetOpen} />
          </Button>
        </div>
      </div>

      {typeof document !== "undefined" && isDesktopMenuOpen
        ? createPortal(
            <div
              id="desktop-menu-overlay"
              className="fixed bottom-0 left-0 right-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 hidden md:block"
              role="dialog"
              aria-label={t("nav.menu", "Menu")}
              aria-modal="true"
            >
              <button
                type="button"
                className="absolute inset-0 z-10 bg-black/40"
                aria-label={t("common.close", "Close")}
                onClick={() => setIsDesktopMenuOpen(false)}
              />

              <motion.div
                className="relative z-20 h-full w-full overflow-y-auto border-t border-border bg-background px-4 py-6 shadow-none sm:px-6 sm:py-8"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.994 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: reduceMotion ? 0.16 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="desktop-menu-shell mx-auto flex min-h-full max-w-[78rem] items-center">
                  <nav aria-label={t("nav.main", "Main navigation")} className="desktop-menu-grid grid w-full gap-5 md:grid-cols-3">
                    {primaryNavigationGroups.map((group) => (
                      <section key={group.title} className="desktop-menu-group min-w-0 self-stretch rounded-2xl border border-border bg-card p-4 shadow-[0_16px_36px_hsl(var(--background)/0.24)] sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
                          <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-muted-foreground">{group.title}</h3>
                          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{group.links.length}</span>
                        </div>
                        <motion.div
                          className="flex flex-col gap-2"
                          variants={desktopMenuGridVariants}
                          initial="hidden"
                          animate="visible"
                          transition={reduceMotion ? { delayChildren: 0.01, staggerChildren: 0.01 } : undefined}
                        >
                          {group.links.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            return (
                              <motion.div key={item.path} variants={menuItemVariants}>
                                <Link
                                  to={item.path}
                                  onClick={() => setIsDesktopMenuOpen(false)}
                                  aria-current={isActive ? "page" : undefined}
                                  className={cn(
                                    "group relative flex min-h-[4.65rem] items-start gap-3 overflow-hidden rounded-xl border border-border bg-background px-3.5 py-3 text-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    isActive && "border-primary/60 bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary)),0_8px_20px_hsl(var(--primary)/0.1)]"
                                  )}
                                >
                                  <div className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors duration-200 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary",
                                    isActive && "border-primary/45 bg-primary/15 text-primary"
                                  )}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0 flex-1 pt-0.5">
                                    <p className={cn("text-sm font-semibold leading-5 text-foreground transition-colors duration-200 group-hover:text-primary", isActive && "text-primary")}>
                                      {t(item.labelKey, item.defaultLabel)}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-xs font-normal leading-4 text-muted-foreground">{item.desc}</p>
                                  </div>
                                </Link>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </section>
                    ))}
                  </nav>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetContent
          id="mobile-menu-panel"
          side="right"
          showCloseButton={false}
          overlayClassName="top-[calc(4rem+env(safe-area-inset-top,0px))]"
          className="safe-area-insets top-[calc(4rem+env(safe-area-inset-top,0px))] h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] w-full max-w-none overflow-y-auto border-l-0 bg-background px-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 sm:w-[24rem] sm:border-l sm:pt-[max(1rem,env(safe-area-inset-top,0px))]"
        >
          <motion.div
            className="relative z-10 px-4 sm:px-5 pb-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.14 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <SheetHeader className="rounded-lg border border-border bg-card px-4 py-4 text-left">
              <SheetTitle className="text-xl">{t("nav.menu", "Menu")}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {t("nav.mobileSubtitle", "Browse tools and extra pages live here.")}
              </p>
            </SheetHeader>

            <nav aria-label={t("nav.main", "Main navigation")}>
              <motion.div
                className="mt-5 space-y-5"
              variants={mobileMenuListVariants}
              initial="hidden"
              animate="visible"
              transition={reduceMotion ? { delayChildren: 0.01, staggerChildren: 0.01 } : undefined}
            >
              {/* User Profile Progress Card inside Mobile Menu */}
              {user && (
                <motion.div
                  variants={menuItemVariants}
                  className="rounded-lg border border-border bg-card p-4 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt="Avatar"
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t("profile.cinephileMilestones", "Trek Progress")}</p>
                      <h4 className="text-sm font-bold text-foreground truncate">{profile?.display_name || user.email}</h4>
                    </div>
                    <span className="rounded border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground tracking-wider shrink-0">
                      {levelInfo.name}
                    </span>
                  </div>
                  <div className="mt-3 relative z-10">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{moviesWatchedCount} {moviesWatchedCount === 1 ? "movie" : "movies"}</span>
                      <span>Next milestone: {levelInfo.nextMilestone}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded overflow-hidden border border-border">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${levelInfo.progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Guest CTA card */}
              {!user && (
                <motion.div
                  variants={menuItemVariants}
                  className="rounded-lg border border-border bg-muted/30 p-4 relative overflow-hidden text-center"
                >
                  <h4 className="text-sm font-bold text-foreground">{t("home.makeEveryVisitPersonal", "Make every visit personal")}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t("home.createAccountSyncDesc", "Create a free account to sync watchlist & ratings.")}</p>
                  <div className="mt-3 flex gap-2 justify-center">
                    <Button asChild size="sm" className="text-[10px] h-8 px-4">
                      <Link to="/signup" onClick={() => setIsMobileSheetOpen(false)}>{t("home.createFreeAccount", "Register")}</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="text-[10px] h-8 px-4 bg-transparent border-border hover:bg-accent">
                      <Link to="/login" onClick={() => setIsMobileSheetOpen(false)}>{t("nav.signIn", "Sign In")}</Link>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Categorized Menu Links on Mobile */}
              {primaryNavigationGroups.map((group) => (
                <div key={group.title} className="space-y-2 border-t border-border pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {group.links.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      return (
                        <motion.div
                          key={item.path}
                          variants={menuItemVariants}
                          transition={reduceMotion ? { duration: 0.12 } : { duration: 0.2, ease: "easeOut" }}
                        >
                          <Link
                            to={item.path}
                            onClick={() => setIsMobileSheetOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent",
                              isActive && "border-primary bg-primary/10 text-primary"
                            )}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0 text-muted-foreground", isActive && "text-primary")} />
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-semibold text-foreground", isActive && "text-primary")}>
                                {t(item.labelKey, item.defaultLabel)}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Settings & Auth Section */}
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1 mb-2">
                  System
                </p>
                <motion.div variants={menuItemVariants}>
                  <Link
                    to="/settings"
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {t("nav.settings", "Settings")}
                  </Link>
                </motion.div>
                {user ? (
                  <motion.div variants={menuItemVariants}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSheetOpen(false);
                        window.dispatchEvent(new Event("cinetrekker:sign-out"));
                      }}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <User className="h-4 w-4 shrink-0" />
                      {t("nav.signOut", "Sign Out")}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileSheetOpen(false)}
                      className="flex min-h-[44px] items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <User className="h-4 w-4 shrink-0" />
                      {t("nav.signIn", "Sign In")}
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </nav>
          </motion.div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
