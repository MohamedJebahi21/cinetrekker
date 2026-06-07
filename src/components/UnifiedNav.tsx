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
import { getCurrentStreak } from "@/lib/streak";

interface NavItem {
  path: string;
  key: string;
  fallback: string;
  icon: LucideIcon;
  exact?: boolean;
}

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

export function UnifiedNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const streak = getCurrentStreak();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const motionIntensity = useMotionIntensityPreference();
  const [isScrolled, setIsScrolled] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopToggleButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch profile from Supabase to get the uploaded profile photo
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const profileImageUrl = useMemo(() => {
    // Prefer uploaded profile photo from database
    if (profile?.profile_photo) {
      return profile.profile_photo;
    }
    
    // Fallback to auth metadata
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const candidates = [metadata?.avatar_url, metadata?.picture, metadata?.photo_url];
    return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
  }, [profile, user]);

  const groupedMenuLinks = useMemo(
    () =>
      menuCategoryOrder
        .map((category) => ({
          ...category,
          items: menuLinks.filter((item) => item.category === category.key),
        }))
        .filter((category) => category.items.length > 0),
    [],
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isMenuOpen) return;

      const target = event.target as Node;
      const clickedInsideDesktopMenu = desktopMenuRef.current?.contains(target);
      const clickedDesktopToggle = desktopToggleButtonRef.current?.contains(target);

      if (!clickedInsideDesktopMenu && !clickedDesktopToggle) {
        setIsMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isMenuOpen]);

    const routeLabels: Array<{ path: string; label: string }> = [
      { path: "/settings", label: t("nav.settings", "Settings") },
      { path: "/login", label: t("nav.signIn", "Sign In") },
      { path: "/signup", label: t("nav.signUp", "Sign Up") },
      { path: "/accessibility", label: t("accessibility.title", "Accessibility Settings") },
      ...menuLinks.map((item) => ({
        path: item.path,
        label: t(item.labelKey, item.defaultLabel),
      })),
    ];

  const activePath = useMemo(() => {
    return NAV_ITEMS.find((item) => {
      if (item.exact) return pathname === item.path;
      return pathname.startsWith(item.path);
    })?.path;
  }, [pathname]);

  const handleMobileSignOut = async () => {
    setIsMobileSheetOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header
      role="banner"
      className={cn('glass-nav min-h-[calc(4rem+env(safe-area-inset-top,0px)+0.4rem)] pt-[calc(env(safe-area-inset-top,0px)+0.4rem)] transition-all duration-300', isScrolled && 'scrolled')}
    >
      <div className="container mx-auto flex h-full items-center justify-between px-4 gap-4">
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0" aria-label={t('common.appName', 'CineTrekker')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(358_94%_46%/0.5)]">
            <span className="text-xl font-bold text-primary-foreground">CT</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden lg:block">{t('common.appName', 'CineTrekker')}</span>
        </Link>

        {!isSearchPage && (
          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <SearchDropdown />
          </div>
        )}

        <div className="hidden md:flex items-center gap-1">
          <SupportButton className="mr-1" />

          <Link
            to="/profile"
            className={cn(
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground transition-colors hover:bg-accent',
              pathname.startsWith('/profile') && 'bg-primary text-primary-foreground'
            )}
            aria-label={t('nav.profile', 'Profile')}
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={t('nav.profile', 'Profile')}
                className="h-8 w-8 rounded-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                {profileInitial}
              </span>
            )}
          </Link>

          <Link
            to="/settings"
            className={cn(
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground transition-colors hover:bg-accent',
              pathname.startsWith('/settings') && 'bg-primary text-primary-foreground'
            )}
            aria-label={t('nav.settings', 'Settings')}
          >
            <Settings className="h-5 w-5" />
          </Link>

          <button
            ref={desktopToggleButtonRef}
            type="button"
            className="inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground hover:bg-accent transition-colors"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-400 select-none shadow-[0_2px_8px_rgba(249,115,22,0.15)]">
              🔥 {streak} {streak === 1 ? t("common.day", "day") : t("common.days", "days")}
            </div>
          )}
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
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={t('nav.profile', 'Profile')}
                className="h-8 w-8 rounded-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                {profileInitial}
              </span>
            )}
          </Link>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-400 select-none">
              🔥 {streak}
            </div>
          )}
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
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div
        ref={desktopMenuRef}
        className={cn(
          'hidden md:block absolute right-4 z-50 w-80 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300 ease-out',
          isMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
        style={{ top: 'calc(4rem + env(safe-area-inset-top, 0px) + 0.4rem)' }}
      >
        <nav className="p-3 flex flex-col gap-1" aria-label={t('nav.main', 'Main navigation')}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] flex items-center',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 mr-2" />
                {t(item.key, item.fallback)}
              </Link>
            );
          })}

          {!loading && (
            user ? (
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-left text-destructive hover:bg-destructive/10 min-h-[48px]"
              >
                {t('nav.signOut', 'Sign Out')}
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-3 rounded-lg text-sm font-medium min-h-[48px] flex items-center justify-center bg-primary text-primary-foreground"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t('nav.signIn', 'Sign In')}
              </Link>
            )
          )}
        </nav>
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

export default UnifiedNav;
