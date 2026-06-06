import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, X, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export function GuestSyncStickyBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched } = useUserLists();
  const { choice: cookieChoice } = useCookieConsent();
  const [isDismissed, setIsDismissed] = useState(false);

  const unsyncedCount = watchlist.length + watched.length;

  // Render nothing if user logged in, dismissed, has no unsynced items, or cookie banner is still visible
  if (user || isDismissed || unsyncedCount === 0 || !cookieChoice) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 mx-auto w-full max-w-xl px-4 animate-slide-up select-none">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/95 p-3.5 pr-10 shadow-[0_20px_60px_rgba(229,9,20,0.32)] backdrop-blur-md text-white relative">
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label={t("common.dismiss", "Dismiss")}
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Sparkles className="h-5 w-5 text-yellow-300 fill-yellow-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight text-white/95 sm:text-sm">
              {t("guestSync.stickyTitle", "{{count}} unsynced titles in guest mode", {
                count: unsyncedCount,
              })}
            </p>
            <p className="mt-0.5 text-[10px] text-white/78 leading-normal sm:text-xs">
              {t("guestSync.stickyCopy", "Create a free account to sync across devices.")}
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-white text-primary hover:bg-white/90 shadow-sm shrink-0 rounded-xl font-bold h-8 text-xs gap-1"
        >
          <Link to="/signup">
            {t("guestSync.syncNow", "Sync Now")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
