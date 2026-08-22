import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Settings from "lucide-react/dist/esm/icons/settings";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal";
import Layers from "lucide-react/dist/esm/icons/layers";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Award from "lucide-react/dist/esm/icons/award";
import User from "lucide-react/dist/esm/icons/user";
import Compass from "lucide-react/dist/esm/icons/compass";
import Film from "lucide-react/dist/esm/icons/film";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Check from "lucide-react/dist/esm/icons/check";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Heart from "lucide-react/dist/esm/icons/heart";
import Search from "lucide-react/dist/esm/icons/search";
import FolderHeart from "lucide-react/dist/esm/icons/folder-heart";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { changeLanguage, languages } from "@/i18n";

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
    titleKey: "nav.personalLibrary",
    defaultTitle: "Personal Library",
    links: [
      { path: "/", labelKey: "nav.home", defaultLabel: "Home", icon: Compass, descKey: "navDescription.home", defaultDesc: "Your personal feed and tonight's picks." },
      { path: "/profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: User, descKey: "navDescription.profile", defaultDesc: "Manage your account, rank, and stats." },
      { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Bookmark, descKey: "navDescription.watchlist", defaultDesc: "Your list of titles to watch." },
      { path: "/collections", labelKey: "nav.collections", defaultLabel: "Collections", icon: FolderHeart, descKey: "navDescription.collections", defaultDesc: "Curate themed lists worth sharing." },
      { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: CheckSquare, descKey: "navDescription.watched", defaultDesc: "Your logged watch history." },
      { path: "/following", labelKey: "nav.following", defaultLabel: "Following", icon: User, descKey: "navDescription.following", defaultDesc: "Titles you are tracking for updates." },
    ],
  },
  {
    titleKey: "nav.community",
    defaultTitle: "Community",
    links: [
      { path: "/people", labelKey: "nav.people", defaultLabel: "People", icon: User, descKey: "navDescription.people", defaultDesc: "Discover public profiles and follow fellow cinephiles." },
    ],
  },
  {
    titleKey: "nav.discoveryExplore",
    defaultTitle: "Discovery & Explore",
    links: [
      { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass, descKey: "navDescription.discover", defaultDesc: "Explore recommendations and releases." },
      { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film, descKey: "navDescription.trending", defaultDesc: "What's popular right now." },
      { path: "/search", labelKey: "nav.search", defaultLabel: "Search", icon: Compass, descKey: "navDescription.search", defaultDesc: "Find movies, series, or people." },
      { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film, descKey: "navDescription.recommendations", defaultDesc: "Taste-matched suggestions for your next watch." },
      { path: "/genres", labelKey: "nav.genres", defaultLabel: "Genres", icon: Layers, descKey: "navDescription.genres", defaultDesc: "Browse by specific film categories." },
      { path: "/decades", labelKey: "nav.decades", defaultLabel: "Decades", icon: CalendarDays, descKey: "navDescription.decades", defaultDesc: "Travel through cinema history." },
    ],
  },
  {
    titleKey: "nav.insightsAwards",
    defaultTitle: "Insights & Awards",
    links: [
      { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays, descKey: "navDescription.calendar", defaultDesc: "TV schedule and movie release tracker." },
      { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award, descKey: "navDescription.stats", defaultDesc: "Detailed analysis of your viewing habits." },
      { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award, descKey: "navDescription.achievements", defaultDesc: "Trophies and milestones unlocked." },
      { path: "/quests", labelKey: "nav.quests", defaultLabel: "Monthly Quests", icon: Trophy, descKey: "navDescription.quests", defaultDesc: "Time-limited challenges and rewards." },
      { path: "/year-in-review", labelKey: "nav.yearInReview", defaultLabel: "Year In Review", icon: Award, descKey: "navDescription.yearInReview", defaultDesc: "Your personal annual wrapped recap." },
      { path: "/awards", labelKey: "nav.awards", defaultLabel: "Awards", icon: Award, descKey: "navDescription.awards", defaultDesc: "Browse award winners and nominees." },
    ],
  },
];

// Flat menu links kept for backwards compatibility with currentPageLabel
const primaryNavigationGroups = navigationGroups.filter((group) => group.titleKey !== "nav.community");

const menuLinks = [
  { path: "/profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: User },
  { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass },
  { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Bookmark },
  { path: "/collections", labelKey: "nav.collections", defaultLabel: "Collections", icon: FolderHeart },
  { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: CheckSquare },
  { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film },
  { path: "/search", labelKey: "nav.search", defaultLabel: "Search", icon: Compass },
  { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film },
  { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays },
  { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award },
  { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award },
  { path: "/quests", labelKey: "nav.quests", defaultLabel: "Monthly Quests", icon: Trophy },
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
  const activeLanguageCode = i18n.resolvedLanguage ?? i18n.language;
  const activeLanguageLabel =
    languages.find((language) => language.code === activeLanguageCode)?.name ?? "English";
  const activeThemeLabel =
    theme === "dark"
      ? t("nav.themeDark", "Dark")
      : theme === "light"
        ? t("nav.themeLight", "Light")
        : t("nav.themeOled", "OLED");

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

  const mobileNavigationGroups = useMemo(() => {
    if (user) return primaryNavigationGroups;

    const [personal, community, discovery, insights] = navigationGroups;
    return [
      {
        titleKey: "nav.explore",
        defaultTitle: "Explore",
        links: [
          personal.links[0],
          ...discovery.links.filter((item) => item.path !== "/recommendations"),
          insights.links[0],
          insights.links[5],
          ...community.links,
        ],
      },
    ];
  }, [user]);

  return (
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      <header
      role="banner"
      className={cn(
        "sticky top-0 left-0 right-0 z-[90] border-b border-border bg-background pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow,border-color] duration-200",
        isScrolled && "border-border bg-background shadow-sm",
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

        <div className={cn("topbar-search hidden min-w-0 flex-1 sm:block", pathname === "/search" && "hidden md:block")}>
          <Suspense fallback={searchFallback}>
            <SearchDropdown />
          </Suspense>
        </div>

        {pathname !== "/search" && (
          <Link
            to="/search"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/70 px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
            aria-label={t("nav.search", "Search")}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{t("nav.search", "Search")}</span>
          </Link>
        )}

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl border-border/70 bg-card/65 px-3 text-xs font-semibold text-foreground shadow-sm transition-[background-color,border-color,box-shadow] hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
                aria-label={t("nav.preferences", "Preferences")}
              >
                <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="hidden lg:inline">{t("nav.preferences", "Preferences")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-[17.5rem] overflow-hidden rounded-2xl border-border/60 bg-popover p-1.5 shadow-[0_22px_56px_hsl(var(--background)/0.45)]"
            >
              <div className="px-2.5 pb-2 pt-1.5">
                <p className="text-sm font-bold tracking-tight text-foreground">{t("preferences.quickControls", "Quick controls")}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {t("preferences.quickControlsDescription", "Tune your viewing space without leaving this page.")}
                </p>
              </div>
              <DropdownMenuItem asChild className="min-h-[3.25rem] cursor-pointer rounded-xl px-2.5 py-2 font-medium focus:bg-accent">
                <Link to="/settings" className="flex w-full items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-primary">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t("nav.settings", "Settings")}</span>
                    <span className="block truncate text-[11px] font-normal text-muted-foreground">{t("preferences.settingsDescription", "Account, privacy, and notifications")}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
              <div className="my-1.5 border-t border-border/70" />
              <p className="px-2.5 pb-1 pt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("preferences.appearanceAndLanguage", "Appearance and language")}
              </p>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="min-h-11 rounded-xl px-2.5 py-2 focus:bg-accent data-[state=open]:bg-accent">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">{t("nav.changeLanguage", "Language")}</span>
                    <span className="mt-0.5 text-[11px] font-normal text-muted-foreground">{activeLanguageLabel}</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[14rem] rounded-2xl border-border/60 bg-popover p-1.5 shadow-[0_18px_48px_hsl(var(--background)/0.42)]">
                  <p className="px-2.5 pb-1 pt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("nav.changeLanguage", "Language")}
                  </p>
                  <DropdownMenuRadioGroup value={activeLanguageCode} onValueChange={(code) => void changeLanguage(code)}>
                    {languages.map((language) => (
                      <DropdownMenuRadioItem key={language.code} value={language.code} className="min-h-10 rounded-xl py-2 text-sm font-medium focus:bg-accent">
                        {language.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="min-h-11 rounded-xl px-2.5 py-2 focus:bg-accent data-[state=open]:bg-accent">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">{t("nav.changeTheme", "Theme")}</span>
                    <span className="mt-0.5 text-[11px] font-normal text-muted-foreground">{activeThemeLabel}</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[15rem] rounded-2xl border-border/60 bg-popover p-1.5 shadow-[0_18px_48px_hsl(var(--background)/0.42)]">
                  <p className="px-2.5 pb-1 pt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("nav.changeTheme", "Theme")}
                  </p>
                  <div className="space-y-1">
                    {(["dark", "light", "oled"] as const).map((option) => {
                      const label =
                        option === "dark"
                          ? t("nav.themeDark", "Dark")
                          : option === "light"
                            ? t("nav.themeLight", "Light")
                            : t("nav.themeOled", "OLED");
                      const description =
                        option === "dark"
                          ? t("preferences.themeDarkDescription", "Balanced for low-light viewing")
                          : option === "light"
                            ? t("preferences.themeLightDescription", "Bright, high-clarity interface")
                            : t("preferences.themeOledDescription", "Pure black for OLED displays");
                      const isSelected = theme === option;

                      return (
                        <DropdownMenuItem
                          key={option}
                          onSelect={() => setTheme(option)}
                          className={cn(
                            "min-h-[3.5rem] cursor-pointer rounded-xl px-3 py-2 focus:bg-accent",
                            isSelected && "bg-primary/10 text-foreground focus:bg-primary/12",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{label}</span>
                            <span className="mt-0.5 block text-[11px] font-normal leading-4 text-muted-foreground">{description}</span>
                          </span>
                          {isSelected && (
                            <span className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                              <Check className="h-3.5 w-3.5" />
                              {t("preferences.currentTheme", "Current")}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

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
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label={isMobileSheetOpen ? t("common.close", "Close") : t("nav.menu", "Menu")}
            >
              <BurgerIcon isOpen={isMobileSheetOpen} />
            </Button>
          </SheetTrigger>
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
                      <section key={group.titleKey} className="desktop-menu-group min-w-0 self-stretch border-t border-border pt-4 first:border-t-0 first:pt-0">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-muted-foreground">{t(group.titleKey, group.defaultTitle)}</h3>
                          <span className="text-[10px] font-medium text-muted-foreground">{group.links.length}</span>
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
                                    "group relative flex min-h-[3.5rem] items-start gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-sm transition-[background-color,border-color,color] duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    isActive && "border-primary/25 bg-primary/8 text-primary"
                                  )}
                                >
                                  <div className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-150 group-hover:bg-primary/10 group-hover:text-primary",
                                    isActive && "bg-primary/12 text-primary"
                                  )}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0 flex-1 pt-0.5">
                                    <p className={cn("text-sm font-semibold leading-5 text-foreground transition-colors duration-200 group-hover:text-primary", isActive && "text-primary")}>
                                      {t(item.labelKey, item.defaultLabel)}
                                    </p>
                                    <p className="mt-0.5 line-clamp-1 text-xs font-normal leading-4 text-muted-foreground">{t(item.descKey, item.defaultDesc)}</p>
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
            <SheetHeader className="border-b border-border px-1 pb-4 text-left">
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

              {/* Guest visitors see discovery essentials first; signed-in users retain their full personal workspace. */}
              {mobileNavigationGroups.map((group) => (
                <div key={group.titleKey} className="space-y-2 border-t border-border pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1">
                    {t(group.titleKey, group.defaultTitle)}
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
                              "flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted",
                              isActive && "bg-primary/8 text-primary"
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

              {!user && (
                <section className="space-y-2 border-t border-border pt-4" aria-label={t("nav.accountOnly", "Your account")}>
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {t("nav.accountOnly", "Your account")}
                  </p>
                  <p className="px-1 text-xs leading-5 text-muted-foreground">
                    {t("nav.accountOnlyDescription", "Sign in to unlock your watchlist, progress, collections, recommendations, and viewing stats.")}
                  </p>
                </section>
              )}

              {/* Settings & Auth Section */}
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1 mb-2">
                  System
                </p>
                <motion.div variants={menuItemVariants}>
                  <Link
                    to="/settings"
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="flex min-h-[44px] items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
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
      </header>
    </Sheet>
  );
}
