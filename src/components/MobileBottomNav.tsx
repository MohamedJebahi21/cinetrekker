import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import House from "lucide-react/dist/esm/icons/house";
import Search from "lucide-react/dist/esm/icons/search";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import Menu from "lucide-react/dist/esm/icons/menu";
import { cn } from "@/lib/utils";
import { useUserLists } from "@/contexts/UserListsContext";

const NAV_ITEMS = [
  { path: "/", key: "nav.home", fallback: "Home", icon: House, exact: true as const },
  { path: "/search", key: "nav.search", fallback: "Search", icon: Search, exact: false as const },
  { path: "/watchlist", key: "nav.watchlist", fallback: "Watchlist", icon: Bookmark, exact: false as const },
  { path: "/watched", key: "nav.watched", fallback: "Watched", icon: CheckCheck, exact: false as const },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { watchlist } = useUserLists();
  const watchlistCount = watchlist.length;

  const openMenu = () => {
    window.dispatchEvent(new CustomEvent("cinetrekker:open-mobile-menu"));
  };

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 md:hidden"
      aria-label={t("nav.main", "Main navigation")}
    >
      <div className="mobile-bottom-nav-inner flex items-stretch">
        {NAV_ITEMS.map(({ path, key, fallback, icon: Icon, exact }) => {
          const isActive = exact ? pathname === path : pathname.startsWith(path);
          const isWatchlist = path === "/watchlist";
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "mobile-bottom-nav-item flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium leading-none transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={t(key, fallback)}
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isActive && "scale-110",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isWatchlist && watchlistCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[0.5625rem] font-bold leading-none text-primary-foreground">
                    {watchlistCount > 99 ? "99+" : watchlistCount}
                  </span>
                )}
              </span>
              <span>{t(key, fallback)}</span>
            </Link>
          );
        })}

        {/* More button — opens the mobile sheet nav */}
        <button
          type="button"
          onClick={openMenu}
          className="mobile-bottom-nav-item flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium leading-none text-muted-foreground transition-colors"
          aria-label={t("nav.more", "More")}
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          <span>{t("nav.more", "More")}</span>
        </button>
      </div>
    </nav>
  );
}
