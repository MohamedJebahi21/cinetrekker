import { useLocation, useNavigate } from "react-router-dom";
import { useState, type ComponentType } from "react";
import Home from "lucide-react/dist/esm/icons/home";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Settings from "lucide-react/dist/esm/icons/settings";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import User from "lucide-react/dist/esm/icons/user";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  badge?: number | boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/search", label: "Search", icon: SearchIcon },
  { path: "/watchlist", label: "Watchlist", icon: Bookmark, requiresAuth: true },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { path: "/watched", label: "Watched", icon: CheckCircle2, requiresAuth: true },
  { path: "/stats", label: "Stats", icon: BarChart3, requiresAuth: true },
  { path: "/calendar", label: "Calendar", icon: Calendar, requiresAuth: true },
  {
    path: "/recommendations",
    label: "Recommendations",
    icon: Sparkles,
    requiresAuth: true,
  },
  { path: "/achievements", label: "Achievements", icon: Trophy, requiresAuth: true },
  { path: "/profile", label: "Profile", icon: User, requiresAuth: true },
  { path: "/settings", label: "Settings", icon: Settings },
];

interface BottomNavProps {
  showOnMobile?: boolean;
  watchlistCount?: number;
  watchedCount?: number;
}

export function BottomNav({
  showOnMobile = true,
  watchlistCount,
  watchedCount,
}: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!showOnMobile) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleNavigate = (item: NavItem) => {
    const target = item.requiresAuth && !user ? "/login" : item.path;
    navigate(target);
    setSheetOpen(false);
  };

  const primaryItems = PRIMARY_NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.path === "/watchlist" ? watchlistCount : item.badge,
  }));

  return (
    <>
      <nav className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 w-full max-w-full overflow-hidden border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
        <div className="grid min-h-[4.5rem] grid-cols-4 gap-1 px-2 pt-2">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigate(item)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "scale-110")} />
                  {item.badge ? (
                    <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {typeof item.badge === "number" && item.badge > 99
                        ? "99+"
                        : item.badge}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="More"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <div className="h-24 md:hidden" />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-6 md:hidden">
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
            <SheetDescription>
              Quick access to the rest of CineTrekker.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {SECONDARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const badge =
                item.path === "/watched" ? watchedCount : item.badge;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className={cn(
                    "flex min-h-[72px] items-center gap-3 rounded-2xl border border-border/60 px-4 py-3 text-left transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "bg-card/70 text-foreground hover:bg-accent/50",
                  )}
                >
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70">
                    <Icon className="h-5 w-5" />
                    {badge ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                        {typeof badge === "number" && badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SideNav() {
  return null;
}

export default BottomNav;
