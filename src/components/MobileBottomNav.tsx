import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import House from "lucide-react/dist/esm/icons/house";
import Search from "lucide-react/dist/esm/icons/search";
import User from "lucide-react/dist/esm/icons/user";
import Compass from "lucide-react/dist/esm/icons/compass";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/", key: "nav.home", fallback: "Home", icon: House, exact: true as const },
  { path: "/discover", key: "nav.discover", fallback: "Discover", icon: Compass, exact: false as const },
  { path: "/search", key: "nav.search", fallback: "Search", icon: Search, exact: false as const },
  { path: "/watchlist", key: "nav.watchlist", fallback: "Watchlist", icon: Bookmark, exact: false as const },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const profilePath = user ? "/profile" : "/login";
  const profileActive = pathname.startsWith("/profile") || pathname.startsWith("/login");
  const isFeedbackRoute = pathname === "/feedback";

  useEffect(() => {
    const editorSelector = "input:not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']";
    const updateEditingState = () => {
      const activeElement = document.activeElement;
      setIsEditing(Boolean(activeElement?.matches(editorSelector)));
    };

    const handleFocusOut = () => window.requestAnimationFrame(updateEditingState);

    window.addEventListener("focusin", updateEditingState);
    window.addEventListener("focusout", handleFocusOut);
    updateEditingState();

    return () => {
      window.removeEventListener("focusin", updateEditingState);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  if (isFeedbackRoute || isEditing) {
    return null;
  }

  return (
    <nav
      className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-10px_28px_hsl(var(--background)/0.18)] backdrop-blur-[20px] md:hidden"
      aria-label={t("nav.main", "Main navigation")}
    >
      <div className="mx-auto flex min-h-[4rem] w-full max-w-lg items-stretch px-1">
        {NAV_ITEMS.map(({ path, key, fallback, icon: Icon, exact }) => {
          const isActive = exact ? pathname === path : pathname.startsWith(path);

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={cn(
                "flex min-h-[4rem] min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[0.7rem] font-semibold leading-none transition-colors active:scale-[0.97]",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
              )}
              aria-label={t(key, fallback)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              <span>{t(key, fallback)}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate(profilePath)}
          className={cn(
            "flex min-h-[4rem] min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[0.7rem] font-semibold leading-none transition-colors active:scale-[0.97]",
            profileActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
          )}
          aria-label={user ? t("nav.profile", "Profile") : t("nav.signIn", "Sign In")}
          aria-current={profileActive ? "page" : undefined}
        >
          <User className={cn("h-5 w-5 transition-transform", profileActive && "scale-110")} strokeWidth={profileActive ? 2.5 : 2} />
          <span>{user ? t("nav.profile", "Profile") : t("nav.signIn", "Sign In")}</span>
        </button>
      </div>
    </nav>
  );
}
