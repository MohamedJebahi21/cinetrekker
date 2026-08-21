import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import House from "lucide-react/dist/esm/icons/house";
import Search from "lucide-react/dist/esm/icons/search";
import User from "lucide-react/dist/esm/icons/user";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/", key: "nav.home", fallback: "Home", icon: House, exact: true as const },
  { path: "/search", key: "nav.search", fallback: "Search", icon: Search, exact: false as const },
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
      className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[20px] md:hidden"
      aria-label={t("nav.main", "Main navigation")}
    >
      <div className="flex min-h-[3.25rem] items-stretch">
        {NAV_ITEMS.map(({ path, key, fallback, icon: Icon, exact }) => {
          const isActive = exact ? pathname === path : pathname.startsWith(path);

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={cn(
                "flex min-h-[3.25rem] min-w-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium leading-none transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
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
            "flex min-h-[3.25rem] min-w-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium leading-none transition-colors",
            profileActive ? "text-primary" : "text-muted-foreground",
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
