import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export function CookieConsent() {
  const { t } = useTranslation();
  const { choice, acceptAll, rejectNonEssential } = useCookieConsent();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateOffset = () => {
      const height = container.getBoundingClientRect().height;
      // Keep a small breathing room so content never touches the banner edge.
      root.style.setProperty("--ct-cookie-consent-offset", `${Math.ceil(height + 12)}px`);
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(container);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--ct-cookie-consent-offset");
    };
  }, []);

  if (choice) {
    return null;
  }

  return (
    <div ref={containerRef} className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px)+0.75rem)] z-[80] px-4 pt-4 md:bottom-0" aria-live="polite" aria-atomic="true">
      <div
        role="region"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        className="mx-auto w-full max-w-5xl rounded-3xl border border-border/60 bg-background/95 px-4 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-5 md:py-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <p id="cookie-consent-title" className="text-sm font-semibold text-foreground">
              {t("cookieConsent.title", "Cookie preferences")}
            </p>
            <p id="cookie-consent-description" className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {t(
                "cookieConsent.description",
                "We use cookies to save your watchlist and personalize your experience. Choose to accept all or only essential cookies.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2"
              onClick={rejectNonEssential}
            >
              {t(
                "cookieConsent.rejectNonEssential",
                "Reject non-essential",
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 gap-2"
              onClick={acceptAll}
            >
              {t("cookieConsent.acceptAll", "Accept all")}
            </Button>
            <Button asChild type="button" variant="ghost" className="min-h-11">
              <Link to="/cookies">
                {t("cookieConsent.preferences", "Preferences")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
