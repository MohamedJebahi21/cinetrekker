import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useMotionIntensityPreference } from "@/hooks/useMotionIntensityPreference";

const RemotionAurora = lazy(() =>
  import("@/components/motion/RemotionAurora").then((mod) => ({
    default: mod.RemotionAurora,
  })),
);

export function Footer() {
  const { t } = useTranslation();
  const motionIntensity = useMotionIntensityPreference();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/40 bg-background">
      {motionIntensity !== "low" ? (
        <div className={cn("pointer-events-none absolute inset-0 hidden md:block", motionIntensity === "high" ? "opacity-48" : "opacity-30")}>
          <Suspense fallback={null}>
            <RemotionAurora className={motionIntensity === "high" ? "opacity-75" : "opacity-55"} />
          </Suspense>
        </div>
      ) : null}

      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-7 pb-[max(calc(3.5rem+env(safe-area-inset-bottom,0px)),1.5rem)] md:py-12 md:pb-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-12">
          <div className="min-w-0 md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/apple-touch-icon.png"
                alt="CineTrekker logo"
                className="h-10 w-10 rounded-2xl object-cover shadow-[0_8px_20px_hsl(var(--primary)/0.18)] ring-1 ring-white/10"
              />
              <span className="text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-foreground sm:text-[1.65rem]">
                {t("common.appName")}
              </span>
            </div>
            <p className="max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
              {t(
                "footer.tagline",
                "Your personal movie and TV tracker. Discover, track, and share your cinematic journey.",
              )}
            </p>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90">
              {t("footer.explore", "Explore")}
            </h3>
            <nav className="flex flex-col gap-3.5" aria-label={t("footer.exploreLinks", "Explore links")}>
              <Link to="/" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.home", "Home")}
              </Link>
              <Link to="/watchlist" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.watchlist", "Watchlist")}
              </Link>
              <Link to="/watched" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.watched", "Watched")}
              </Link>
              <Link to="/search" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.search", "Search")}
              </Link>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90">
              {t("footer.support", "Support")}
            </h3>
            <nav className="flex flex-col gap-3.5" aria-label={t("footer.supportLinks", "Support links")}>
              <a
                href="https://buymeacoffee.com/mohamed_jebahi"
                target="_blank"
                rel="noopener noreferrer"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("footer.buyMeACoffee", "Buy Me a Coffee")}
              </a>
              <Link to="/about" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("footer.about", "About")}
              </Link>
              <Link to="/feedback" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("footer.feedback", "Feedback")}
              </Link>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90">
              {t("footer.legal", "Legal")}
            </h3>
            <nav className="flex flex-col gap-3.5" aria-label={t("footer.legalLinks", "Legal links")}>
              <Link to="/privacy" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.privacy", "Privacy Policy")}
              </Link>
              <Link to="/terms" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("footer.terms", "Terms of Service")}
              </Link>
              <Link to="/cookies" className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground">
                {t("footer.cookies", "Cookie Policy")}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-5">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-[0.84rem] text-muted-foreground md:text-left">
              © {currentYear} {t("common.appName")}. {t("footer.allRightsReserved", "All rights reserved.")}
            </p>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("footer.poweredBy", "Powered by")}
                </span>
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  <img
                    src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                    alt="TMDB logo for CineTrekker movie tracker data provider"
                    className="h-4 logo-image"
                    loading="lazy"
                    width="81"
                    height="12"
                  />
                </a>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
            {t(
              "footer.attribution",
              "This product uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV show data, including images and metadata, is provided by The Movie Database (TMDB).",
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
