import { useLocation, useNavigate } from "react-router-dom";
import Home from "lucide-react/dist/esm/icons/home";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import User from "lucide-react/dist/esm/icons/user";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  requiresAuth?: boolean;
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/search", label: "Search", icon: SearchIcon },
  { path: "/watchlist", label: "Watchlist", icon: Bookmark, requiresAuth: true },
  { path: "/profile", label: "Profile", icon: User, requiresAuth: true },
];

interface BottomNavProps {
  showOnMobile?: boolean;
}

export function BottomNav({ showOnMobile = true }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!showOnMobile) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleNavigate = (item: NavItem) => {
    if (item.requiresAuth && !user) {
      navigate("/login");
      return;
    }

    navigate(item.path);
  };

  return (
    <>
      <nav className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
        <div className="grid min-h-[4.5rem] grid-cols-4 gap-1 px-2 pt-2">
          {MOBILE_NAV_ITEMS.map((item) => {
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
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="h-24 md:hidden" />
    </>
  );
}

export function SideNav() {
  return null;
}

export default BottomNav;
