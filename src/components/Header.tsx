import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Menu from "lucide-react/dist/esm/icons/menu";
import X from "lucide-react/dist/esm/icons/x";
import Globe from "lucide-react/dist/esm/icons/globe";
import Palette from "lucide-react/dist/esm/icons/palette";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import User from "lucide-react/dist/esm/icons/user";
import Settings from "lucide-react/dist/esm/icons/settings";
import Home from "lucide-react/dist/esm/icons/home";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Award from "lucide-react/dist/esm/icons/award";
import Clock from "lucide-react/dist/esm/icons/clock";
import Grid3x3 from "lucide-react/dist/esm/icons/grid-3x3";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { languages } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { SearchDropdown } from "@/components/SearchDropdown";
import { cn } from "@/lib/utils";
import GuestSyncBanner from "@/components/GuestSyncBanner";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  const profileKey = useMemo(
    () => `cinetrekker_profile_${user?.id || "guest"}`,
    [user?.id],
  );

  // Track scroll for enhanced glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load profile data
  useEffect(() => {
    const loadProfile = () => {
      try {
        const stored = localStorage.getItem(profileKey);
        if (!stored) return;
        const parsed = JSON.parse(stored) as {
          photo?: string;
          profilePhoto?: string;
          avatar_url?: string;
          displayName?: string;
        };
        setProfilePhoto(parsed.photo || parsed.profilePhoto || parsed.avatar_url || null);
        setDisplayName(parsed.displayName || "");
      } catch {
        setProfilePhoto(null);
        setDisplayName("");
      }
    };

    loadProfile();

    // Listen for profile updates
    window.addEventListener("profileUpdated", loadProfile);
    return () => window.removeEventListener("profileUpdated", loadProfile);
  }, [profileKey]);

  const navLinks = [
    { path: "/", label: t("nav.home"), exact: true },
    { path: "/search", label: t("nav.search"), exact: false },
    { path: "/recommendations", label: t("nav.recommendations"), exact: false },
    { path: "/achievements", label: "Achievements", exact: false },
    { path: "/enhanced-stats", label: "Stats", exact: false },
    { path: "/calendar", label: t("nav.calendar"), exact: false },
    { path: "/awards", label: "Awards", exact: false },
    { path: "/year-in-review", label: "Year in Review", exact: false },
    { path: "/watch-history", label: "History", exact: false },
  ];

  const menuCategories = [
    {
      title: "Main",
      items: [
        { path: "/", label: t("nav.home"), icon: Home },
        { path: "/search", label: t("nav.search"), icon: Search },
      ],
    },
    {
      title: "Discover",
      items: [
        {
          path: "/recommendations",
          label: t("nav.recommendations"),
          icon: Sparkles,
        },
        { path: "/calendar", label: t("nav.calendar"), icon: Calendar },
        { path: "/awards", label: "Awards", icon: Award },
      ],
    },
    {
      title: "Analytics",
      items: [
        { path: "/enhanced-stats", label: "Stats", icon: BarChart3 },
        { path: "/achievements", label: "Achievements", icon: Trophy },
        { path: "/year-in-review", label: "Year in Review", icon: Calendar },
        { path: "/watch-history", label: "History", icon: Clock },
      ],
    },
  ];

  const currentLanguage =
    languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const themeLabelMap = {
    dark: t("nav.themeDark", "Dark"),
    light: t("nav.themeLight", "Light"),
    oled: t("nav.themeOled", "OLED"),
  } as const;
  const themeLabel = themeLabelMap[theme];

  const renderThemeSwitcher = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-white/5 min-w-[44px] min-h-[44px]"
          aria-label={t("nav.changeTheme", "Change theme")}
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">{themeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[140px] bg-popover border-border/50"
      >
        {(["dark", "light", "oled"] as const).map((option) => {
          const optionLabel = themeLabelMap[option];
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => setTheme(option)}
              className={theme === option ? "bg-accent" : ""}
            >
              {optionLabel}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header
      role="banner"
      className={cn(
        "ct-premium-header sticky top-0 z-40 transition-all duration-300 shadow-lg border-b border-border/60",
        isScrolled && "scrolled shadow-xl",
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 gap-6 pt-[env(safe-area-inset-top)] md:pt-0">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-4 group flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-[0_2px_16px_hsl(var(--primary)/0.18)] transition-all duration-300 group-hover:shadow-[0_0_32px_hsl(358_94%_46%/0.32)]">
            <span className="text-2xl font-extrabold tracking-tight text-primary-foreground drop-shadow-sm select-none">
              CT
            </span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground hidden lg:block drop-shadow-sm select-none">
            {t("common.appName")}
          </span>
        </Link>

        {/* Search Dropdown - Desktop */}
        <div className="hidden md:block flex-1 max-w-2xl mx-6 lg:mx-12">
          <SearchDropdown />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* All Menus Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex gap-2 hover:bg-accent/60 focus-visible:bg-accent/80 min-w-[48px] min-h-[48px] rounded-xl shadow-sm transition-all"
                aria-label={t("nav.allMenus", "All menus")}
              >
                <span className="font-semibold tracking-wide text-base">{t("nav.menu", "Menu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[400px] max-h-[600px] overflow-y-auto bg-popover border-border/50"
            >
              <div className="p-2">
                {menuCategories.map((category, idx) => (
                  <div key={category.title}>
                    {idx > 0 && <DropdownMenuSeparator className="my-2" />}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category.title}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {category.items.map((item) => {
                        const isActive =
                          location.pathname === item.path ||
                          (item.path !== "/" &&
                            location.pathname.startsWith(item.path));
                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem key={item.path} asChild>
                            <Link
                              to={item.path}
                              className={cn(
                                "flex items-center gap-3 cursor-pointer p-3 rounded-lg",
                                isActive &&
                                  "bg-primary text-primary-foreground",
                              )}
                            >
                              <ItemIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="flex-1 text-sm">
                                {item.label}
                              </span>
                              {(item as { count?: number }).count !== undefined && (item as { count?: number }).count! > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] bg-primary text-primary-foreground text-center">
                                  {(item as { count?: number }).count}
                                </span>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="hidden lg:flex hover:bg-accent/60 focus-visible:bg-accent/80 min-w-[48px] min-h-[48px] rounded-xl shadow-sm transition-all"
                >
                  <Link
                    to="/settings"
                    aria-label={t("nav.settings", "Settings")}
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-popover border-border/50"
              >
                <p>{t("nav.settings", "Settings")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex gap-2 hover:bg-accent/60 focus-visible:bg-accent/80 min-w-[48px] min-h-[48px] rounded-xl shadow-sm transition-all"
                aria-label={t("nav.changeLanguage", "Change language")}
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[140px] bg-popover border-border/50"
            >
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={i18n.language === lang.code ? "bg-accent" : ""}
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher - Desktop Only */}
          <div className="hidden lg:block">
            {renderThemeSwitcher()}
          </div>

          {/* User Menu / Auth */}
          {!loading &&
            (user ? (
              <>
                <div className="hidden lg:block">
                  <NotificationBell />
                </div>
                <div className="hidden lg:flex items-center gap-3">
                  <UserProfileDropdown
                    profilePhoto={profilePhoto}
                    displayName={displayName}
                  />
                </div>
                {/* Mobile Profile Link */}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="lg:hidden hover:bg-accent/60 focus-visible:bg-accent/80 min-w-[48px] min-h-[48px] rounded-xl shadow-sm transition-all"
                  aria-label={t("nav.profile", "Profile")}
                >
                  <Link to="/profile">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 btn-primary-glow min-w-[48px] min-h-[48px] rounded-xl shadow-md text-base font-semibold"
                  aria-label={t("nav.signIn")}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav.signIn")}</span>
                </Button>
              </Link>
            ))}

          {/* Mobile Search Shortcut — tap to go to /search */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="md:hidden hover:bg-accent/60 focus-visible:bg-accent/80 min-w-[48px] min-h-[48px] rounded-xl shadow-sm transition-all"
            aria-label={t("nav.search", "Search")}
          >
            <Link to="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          {/* Mobile Menu Toggle */}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-accent/60 focus-visible:bg-accent/80 min-w-[48px] min-h-[48px] rounded-xl shadow-sm transition-all"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={
              isMenuOpen
                ? t("nav.closeMenu", "Close menu")
                : t("nav.openMenu", "Open menu")
            }
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <GuestSyncBanner />

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav
          className="lg:hidden border-t border-border/50 bg-background/95 shadow-2xl animate-fade-in max-h-[calc(100vh-5.5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain backdrop-blur-xl"
          aria-label="Mobile navigation"
        >
          <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
            {/* Mobile Search */}
            <div className="mb-3">
              <SearchDropdown onNavigate={() => setIsMenuOpen(false)} />
            </div>

            {navLinks.map((link) => {
              const isActive = link.exact
                ? location.pathname === link.path
                : location.pathname.startsWith(link.path) && link.path !== "/";
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "px-5 py-4 rounded-xl text-base font-semibold transition-colors min-h-[48px] flex items-center shadow-sm",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex items-center gap-2">
                    {link.label}
                  </span>
                </Link>
              );
            })}

            {/* Mobile Auth Button */}
            {!user ? (
              <Link
                to="/login"
                className="px-5 py-3 rounded-xl text-base font-semibold bg-primary text-primary-foreground text-center mt-2 min-h-[48px] flex items-center justify-center shadow-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("nav.signIn")}
              </Link>
            ) : (
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="px-5 py-3 rounded-xl text-base font-semibold text-destructive hover:bg-destructive/10 text-left mt-2 min-h-[48px] flex items-center shadow-sm"
              >
                {t("nav.signOut")}
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
