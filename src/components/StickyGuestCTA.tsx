import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";

const DISMISSED_KEY = "cinetrekker_sticky_guest_cta_dismissed";

/**
 * Sticky bottom bar shown to guest users who have local watchlist/watched data.
 * Prompts them to create an account so their data is synced to the cloud.
 * Dismissed permanently via localStorage once closed.
 */
export function StickyGuestCTA() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched } = useUserLists();

  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(DISMISSED_KEY) === "true";
  });

  const hasLocalData = !user && (watchlist.length > 0 || watched.length > 0);

  if (!hasLocalData || isDismissed) return null;

  const totalItems = watchlist.length + watched.length;

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-[72] px-3 md:bottom-4"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-primary/25 bg-[linear-gradient(135deg,hsla(var(--primary)/0.18),hsla(var(--card)/0.96))] px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {/* Icon */}
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/12 text-primary">
          <CloudUpload className="h-4 w-4" />
        </span>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {t("guest.stickyCtaTitle", "{{count}} local items — not yet synced", {
              count: totalItems,
            })}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t(
              "guest.stickyCtaBody",
              "Create a free account to keep them safe across devices.",
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            size="sm"
            className="btn-primary-glow h-8 rounded-xl px-3 text-xs"
          >
            <Link to="/signup">
              {t("guest.syncNow", "Sync Free")}
            </Link>
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("common.dismiss", "Dismiss")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
