import { useLocation, useNavigate } from "react-router-dom";
import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import Home from "lucide-react/dist/esm/icons/home";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Settings from "lucide-react/dist/esm/icons/settings";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import User from "lucide-react/dist/esm/icons/user";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import MapPinned from "lucide-react/dist/esm/icons/map-pinned";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number | boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/search", label: "Discover", icon: SearchIcon },
  { path: "/enhanced-stats", label: "Stats", icon: BarChart3 },
  { path: "/watchlist", label: "Watchlist", icon: Bookmark },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { path: "/watched", label: "Watched", icon: CheckCircle2 },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/recommendations", label: "Recommendations", icon: Sparkles },
  { path: "/trek-lists", label: "Trek Lists", icon: MapPinned },
  { path: "/achievements", label: "Achievements", icon: Trophy },
  { path: "/accessibility", label: "Accessibility", icon: Settings },
  { path: "/profile", label: "Profile", icon: User },
];

interface BottomNavProps {
  showOnMobile?: boolean;
  watchlistCount?: number;
  watchedCount?: number;
}

/**
 * Mobile bottom navigation component
 */
export function BottomNav({
  showOnMobile = true,
  watchlistCount,
  watchedCount,
}: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const isLightTheme = theme === "light";

  if (!showOnMobile) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleNavigate = (path: string) => {
    // Redirect to login if trying to access a protected route without authentication
    const protectedPaths = [
      "/profile",
      "/watchlist",
      "/watched",
      "/recommendations",
      "/calendar",
      "/enhanced-stats",
      "/achievements",
      "/settings",
      "/trek-lists",
    ];
    if (
      protectedPaths.some((p) => path === p || path.startsWith(p + "/")) &&
      !user
    ) {
      navigate("/login");
    } else {
      navigate(path);
    }
  };

  return (
    <>
      {/* Mobile Bottom Nav (only visible on small screens) */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl bg-opacity-95 md:hidden",
          isLightTheme
            ? "border-black/10 bg-gradient-to-t from-white to-neutral-100 shadow-md"
            : "border-white/5 bg-gradient-to-t from-surface-dark-1 to-surface-dark-2 shadow-glow",
        )}
      >
        <div className="flex items-center justify-between h-20 px-2 gap-2">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            let badge = null;

            if (item.path === "/watchlist" && watchlistCount) {
              badge = watchlistCount;
            } else if (item.path === "/watched" && watchedCount) {
              badge = watchedCount;
            }

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 interactive-element",
                  active
                    ? "bg-primary/10 text-primary shadow-glow"
                    : cn(
                        "text-muted-foreground hover:text-foreground",
                        isLightTheme ? "hover:bg-black/5" : "hover:bg-surface-dark-3",
                      ),
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      active && "fill-current scale-110",
                    )}
                  />
                  {badge && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-glow">
                      {typeof badge === "number" && badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Menu */}
          <div className="relative flex-1">
            <button
              aria-label="More"
              aria-haspopup="menu"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={cn(
                "w-full flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 interactive-element text-muted-foreground hover:text-foreground",
                isLightTheme ? "hover:bg-black/5" : "hover:bg-surface-dark-3",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-semibold leading-none">
                More
              </span>
            </button>
            
            {moreMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setMoreMenuOpen(false)} 
                />
                <div className="absolute bottom-full right-0 mb-4 w-48 bg-popover text-popover-foreground rounded-md shadow-md border z-50 overflow-hidden">
                  {SECONDARY_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          handleNavigate(item.path);
                        }}
                        className={cn(
                          "w-full flex items-center px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                          active && "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content overlap */}
      <div className="h-20 md:hidden" />
    </>
  );
}

/**
 * Desktop side navigation bar
 */
export function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="hidden md:fixed md:left-0 md:top-20 md:w-48 md:flex md:flex-col md:gap-1 md:p-4 md:border-r md:border-border">
      {[...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
