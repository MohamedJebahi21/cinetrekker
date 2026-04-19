import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Settings from "lucide-react/dist/esm/icons/settings";
import Palette from "lucide-react/dist/esm/icons/palette";
import Globe from "lucide-react/dist/esm/icons/globe";
import Layers from "lucide-react/dist/esm/icons/layers";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Award from "lucide-react/dist/esm/icons/award";
import User from "lucide-react/dist/esm/icons/user";
import Menu from "lucide-react/dist/esm/icons/menu";
import X from "lucide-react/dist/esm/icons/x";
import Compass from "lucide-react/dist/esm/icons/compass";
import Film from "lucide-react/dist/esm/icons/film";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMotionIntensityPreference } from "@/hooks/useMotionIntensityPreference";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
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

type MenuCategoryKey = "browse" | "library" | "insights" | "social";

type MenuLinkItem = {
  path: string;
  labelKey: string;
  defaultLabel: string;
  icon: ComponentType<{ className?: string }>;
  requiresAuth: boolean;
  category: MenuCategoryKey;
};

const menuCategoryOrder: Array<{
  key: MenuCategoryKey;
  labelKey: string;
  defaultLabel: string;
}> = [
  { key: "browse", labelKey: "nav.browse", defaultLabel: "Browse" },
  { key: "library", labelKey: "nav.library", defaultLabel: "Library" },
  { key: "insights", labelKey: "nav.insights", defaultLabel: "Insights" },
  { key: "social", labelKey: "nav.social", defaultLabel: "Social" },
];

const menuLinks: MenuLinkItem[] = [
  { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass, requiresAuth: false, category: "browse" },
  { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film, requiresAuth: false, category: "browse" },
  { path: "/genres", labelKey: "nav.genres", defaultLabel: "Genres", icon: Layers, requiresAuth: false, category: "browse" },
  { path: "/decades", labelKey: "nav.decades", defaultLabel: "Decades", icon: CalendarDays, requiresAuth: false, category: "browse" },
  { path: "/awards", labelKey: "nav.awards", defaultLabel: "Awards", icon: Award, requiresAuth: false, category: "browse" },
  { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Film, requiresAuth: true, category: "library" },
  { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: Clock3, requiresAuth: false, category: "library" },
  { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film, requiresAuth: true, category: "library" },
  { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays, requiresAuth: true, category: "library" },
  { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award, requiresAuth: true, category: "insights" },
  { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award, requiresAuth: true, category: "insights" },
  { path: "/year-in-review", labelKey: "nav.yearInReview", defaultLabel: "Year In Review", icon: Award, requiresAuth: true, category: "insights" },
  { path: "/following", labelKey: "nav.following", defaultLabel: "Following", icon: User, requiresAuth: true, category: "social" },
];

const desktopMenuGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: "easeOut" as const,
    },
  },
};

const mobileMenuListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.06,
    },
  },
};

export function UnifiedNav() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const visibleMenuLinks = useMemo(() => menuLinks, []);

  const groupedMenuLinks = useMemo(
    () =>
      menuCategoryOrder
        .map((category) => ({
          ...category,
          items: visibleMenuLinks.filter((item) => item.category === category.key),
        }))
        .filter((category) => category.items.length > 0),
    [visibleMenuLinks],
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
      ...visibleMenuLinks.map((item) => ({
        path: item.path,
        label: t(item.labelKey, item.defaultLabel),
      })),
    ];

    const matched = routeLabels
      .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];

    if (matched) return matched.label;

    const segment = pathname.split("/").filter(Boolean)[0];
    if (!segment) return t("nav.home", "Home");
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }, [pathname, t, visibleMenuLinks]);

  const handleMobileSignOut = async () => {
    setIsMobileSheetOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 left-0 right-0 z-[90] border-b border-border/50 bg-background/88 pt-[env(safe-area-inset-top,0px)] backdrop-blur-[18px] transition-[background-color,box-shadow] duration-300",
        isScrolled && "bg-[hsl(var(--background)/0.96)] shadow-[0_10px_28px_hsl(var(--foreground)/0.08)]",
      )}
    >
      <div className="container mx-auto flex h-16 items-center gap-3 px-3 sm:px-4">
        <Link to="/" className="group flex shrink-0 items-center gap-3">
          <img
            src="/apple-touch-icon.png"
            alt="CineTrekker logo"
            className="h-11 w-11 rounded-2xl object-cover shadow-[0_8px_20px_hsl(var(--primary)/0.2)]"
          />
          <span className="hidden text-base font-semibold text-foreground sm:block lg:text-lg">
            {t("common.appName", "CineTrekker")}
          </span>
        </Link>

        <div className="hidden items-center md:flex">
          <span className="rounded-lg px-4 py-2 text-sm font-semibold text-primary">
            {currentPageLabel}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <Suspense fallback={searchFallback}>
            <SearchDropdown />
          </Suspense>
        </div>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <div className="flex items-center rounded-full border border-border/60 bg-card/60 px-1 py-1 shadow-sm backdrop-blur-xl">
                <NotificationBell />
              </div>
              <UserProfileDropdown
                profilePhoto={profileImageUrl}
                displayName={profile?.display_name ?? undefined}
              />
            </>
          ) : (
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link to="/login" aria-label={t("nav.signIn", "Sign In")}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}

          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/settings" aria-label={t("nav.settings", "Settings")}>
              <Settings className="h-5 w-5" />
            </Link>
          </Button>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t("nav.changeLanguage", "Change language")}
              >
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] bg-popover border-border/50">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={i18n.language === lang.code ? "bg-accent" : ""}
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t("nav.changeTheme", "Change theme")}
              >
                <Palette className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px] bg-popover border-border/50">
              {(["dark", "light", "oled"] as const).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setTheme(option)}
                  className={theme === option ? "bg-accent" : ""}
                >
                  {option === "dark"
                    ? t("nav.themeDark", "Dark")
                    : option === "light"
                      ? t("nav.themeLight", "Light")
                      : t("nav.themeOled", "OLED")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full text-foreground/90"
            onClick={() => setIsDesktopMenuOpen((current) => !current)}
            aria-label={
              isDesktopMenuOpen
                ? t("nav.closeMenu", "Close menu")
                : t("nav.openMenu", "Open menu")
            }
            aria-expanded={isDesktopMenuOpen}
            aria-controls="desktop-menu-overlay"
          >
            <span className="relative h-5 w-5">
              <Menu
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-all duration-200",
                  isDesktopMenuOpen ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
                )}
              />
              <X
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-all duration-200",
                  isDesktopMenuOpen ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
                )}
              />
            </span>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          {user ? (
            <div className="flex items-center rounded-full border border-border/60 bg-card/60 px-1 py-1 shadow-sm backdrop-blur-xl">
              <NotificationBell />
            </div>
          ) : null}
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to={user ? "/profile" : "/login"} aria-label={t("nav.profile", "Profile")}>
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={t("nav.profile", "Profile")}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setIsMobileSheetOpen((current) => !current)}
            aria-label={
              isMobileSheetOpen
                ? t("nav.closeMenu", "Close menu")
                : t("nav.openMenu", "Open menu")
            }
            aria-expanded={isMobileSheetOpen}
            aria-controls="mobile-menu-panel"
          >
            <span className="relative h-5 w-5">
              <Menu
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-all duration-200",
                  isMobileSheetOpen ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
                )}
              />
              <X
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-all duration-200",
                  isMobileSheetOpen ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
                )}
              />
            </span>
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
              {motionIntensity !== "low" ? (
                <div className={cn("pointer-events-none absolute inset-0", motionIntensity === "high" ? "opacity-72" : "opacity-48")}>
                  <Suspense fallback={null}>
                    <RemotionAurora className={motionIntensity === "high" ? "opacity-85" : "opacity-60"} />
                  </Suspense>
                </div>
              ) : null}

              <button
                type="button"
                className="absolute inset-0 z-10 bg-black/55 backdrop-blur-sm"
                aria-label={t("common.close", "Close")}
                onClick={() => setIsDesktopMenuOpen(false)}
              />

              <motion.div
                className="relative z-20 mx-auto h-full w-full overflow-y-auto border-t border-border/60 bg-background px-6 py-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.994 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: reduceMotion ? 0.16 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mx-auto max-w-6xl space-y-6">
                  <div className="flex items-start gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/85">
                        {t("nav.more", "More")}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-foreground">
                        {t("nav.menu", "Menu")}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("nav.mobileSubtitle", "Browse tools and extra pages live here.")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {groupedMenuLinks.map((category) => (
                      <div key={category.key} className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {t(category.labelKey, category.defaultLabel)}
                        </p>
                        <motion.div
                          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                          variants={desktopMenuGridVariants}
                          initial="hidden"
                          animate="visible"
                          transition={reduceMotion ? { delayChildren: 0.01, staggerChildren: 0.01 } : undefined}
                        >
                          {category.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <motion.div
                                key={item.path}
                                variants={menuItemVariants}
                                transition={reduceMotion ? { duration: 0.12 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <Link
                                  to={item.path}
                                  onClick={() => setIsDesktopMenuOpen(false)}
                                  className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 text-base font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/50"
                                >
                                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                                  {t(item.labelKey, item.defaultLabel)}
                                </Link>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </div>
                    ))}
                  </div>

                  {!user ? (
                    <div className="rounded-3xl border border-primary/20 bg-primary/8 px-5 py-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/85">
                        {t("nav.account", "Account")}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-foreground">
                        {t("authPrompt.title", "Create a free account to save your watchlist")}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {t(
                          "authPrompt.description",
                          "Save titles, mark them watched, and keep your progress synced across devices.",
                        )}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button asChild>
                          <Link to="/signup" onClick={() => setIsDesktopMenuOpen(false)}>
                            {t("authPrompt.createAccount", "Create Account")}
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link to="/login" onClick={() => setIsDesktopMenuOpen(false)}>
                            {t("nav.signIn", "Sign In")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}

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
          aria-labelledby={undefined}
          aria-label={`${t("common.appName", "CineTrekker")} ${t("nav.menu", "Menu")}`}
          overlayClassName="top-[calc(4rem+env(safe-area-inset-top,0px))]"
          className="safe-area-insets top-[calc(4rem+env(safe-area-inset-top,0px))] h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] w-full max-w-none overflow-y-auto border-l-0 bg-background px-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 sm:w-[24rem] sm:border-l sm:pt-[max(1rem,env(safe-area-inset-top,0px))]"
        >
          {motionIntensity !== "low" ? (
            <div className={cn("pointer-events-none absolute inset-0", motionIntensity === "high" ? "opacity-56" : "opacity-34")}>
              <Suspense fallback={null}>
                <RemotionAurora className={motionIntensity === "high" ? "opacity-70" : "opacity-50"} />
              </Suspense>
            </div>
          ) : null}

          <motion.div
            className="relative z-10 px-4 sm:px-5"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.14 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <SheetHeader className="rounded-2xl border border-border/60 bg-card px-4 py-4 text-left">
              <SheetTitle className="text-xl">
                {`${t("common.appName", "CineTrekker")} ${t("nav.menu", "Menu")}`}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {t("nav.mobileSubtitle", "Browse tools and extra pages live here.")}
              </p>
            </SheetHeader>

            <motion.nav
              className="mt-5 space-y-5"
              aria-label={t("nav.main", "Main navigation")}
              variants={mobileMenuListVariants}
              initial="hidden"
              animate="visible"
              transition={reduceMotion ? { delayChildren: 0.01, staggerChildren: 0.01 } : undefined}
            >
              {groupedMenuLinks.map((category) => (
                <div key={category.key} className="space-y-2 border-t border-border/50 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t(category.labelKey, category.defaultLabel)}
                  </p>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.path}
                        variants={menuItemVariants}
                        transition={reduceMotion ? { duration: 0.12 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileSheetOpen(false)}
                          className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/45"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {t(item.labelKey, item.defaultLabel)}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ))}

              {/* Settings & Auth */}
              <div className="space-y-2 border-t border-border/50 pt-4">
                <motion.div variants={menuItemVariants}>
                  <Link
                    to="/settings"
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/45"
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
                        void handleMobileSignOut();
                      }}
                      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-destructive/30 bg-card px-4 py-3 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10"
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
                      className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20"
                    >
                      <User className="h-4 w-4 shrink-0" />
                      {t("nav.signIn", "Sign In")}
                    </Link>
                  </motion.div>
                )}
                {!user ? (
                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/signup"
                      onClick={() => setIsMobileSheetOpen(false)}
                      className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/45"
                    >
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {t("authPrompt.createAccount", "Create Account")}
                    </Link>
                  </motion.div>
                ) : null}
              </div>
            </motion.nav>
          </motion.div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
