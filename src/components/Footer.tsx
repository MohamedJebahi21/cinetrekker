import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useMotionIntensityPreference } from "@/hooks/useMotionIntensityPreference";
import { useInView } from "@/hooks/useInView";

const RemotionAurora = lazy(() =>
  import("@/components/motion/RemotionAurora").then((mod) => ({
    default: mod.RemotionAurora,
  })),
);

const FOOTER_IN_VIEW_OPTIONS = { rootMargin: "100px", triggerOnce: false };

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [ref, inView] = useInView<HTMLDivElement>(FOOTER_IN_VIEW_OPTIONS);

  return (
    <footer ref={ref} className="ct-premium-footer relative overflow-hidden border-t border-border/40 shadow-[0_-2px_24px_hsl(var(--primary)/0.08)] bg-background/90 backdrop-blur-xl">
      {motionIntensity !== "low" && inView ? (
        <div className={cn("pointer-events-none absolute inset-0 hidden md:block", motionIntensity === "high" ? "opacity-48" : "opacity-30")}>
          <Suspense fallback={null}>
            <RemotionAurora className={motionIntensity === "high" ? "opacity-75" : "opacity-55"} />
          </Suspense>
        </div>
      ) : null}

      <div className="container relative z-10 mx-auto px-4 py-10 pb-[max(calc(4.5rem+env(safe-area-inset-bottom,0px)),2.5rem)] md:py-14 md:pb-14 flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-8 min-[400px]:grid-cols-2 md:grid-cols-5 md:gap-14">
          <div className="col-span-1 min-[400px]:col-span-2 md:col-span-2 min-w-0">
            <div className="mb-5 flex items-center gap-4">
              <img
                src="/apple-touch-icon.png"
                alt="CineTrekker logo"
                className="h-14 w-14 rounded-2xl object-cover shadow-[0_8px_32px_hsl(var(--primary)/0.18)] border-2 border-primary/20"
              />
              <span className="text-[2rem] font-extrabold leading-none text-foreground sm:text-[2.2rem] tracking-tight drop-shadow-sm select-none">
                {t("common.appName")}
              </span>
            </div>
            <p className="max-w-sm text-[1.05rem] leading-relaxed text-muted-foreground font-medium">
              {t(
                "footer.tagline",
                "Your personal movie and TV tracker. Discover, track, and share your cinematic journey.",
              )}
            </p>
          </div>

          <div className="min-w-0">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-foreground/90">
              {t("footer.explore", "Explore")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label={t("footer.exploreLinks", "Explore links")}>
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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
                {t("footer.support", "Support")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label={t("footer.supportLinks", "Support links")}>
              <a
                href="https://buymeacoffee.com/mohamed_jebahi"
                target="_blank"
                rel="noopener noreferrer"
                  className="break-words rounded-md text-[1.01rem] text-muted-foreground font-semibold transition-colors hover:text-primary hover:underline underline-offset-4"
              >
                {t('footer.trending', 'Trending')}
              </Link>
              <Link 
                to="/search?sort=primary_release_date.desc" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.upcoming', 'Upcoming')}
              </Link>
              <Link 
                to="/search?sort=vote_average.desc" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.topRated', 'Top Rated')}
              </Link>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
                {t("footer.legal", "Legal")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Support links">
              <Link 
                to="/about" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.about', 'About')}
              </Link>
              <Link 
                to="/feedback" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.feedback', 'Feedback')}
              </Link>
              <a 
                href="https://developer.themoviedb.org/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.tmdbApi', 'TMDB API')}
              </a>
            </nav>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground mb-4">
              <Link to="/privacy" className="hover:text-primary transition-colors">
                {t('footer.legal', 'Legal')}
              </Link>
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Legal links">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.privacy', 'Privacy Policy')}
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('footer.terms', 'Terms of Service')}
              </Link>
              <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('footer.cookies', 'Cookie Policy')}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-7">
          <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
            <p className="text-center text-[0.97rem] text-muted-foreground md:text-left font-medium">
              © {currentYear} <span className="font-bold text-foreground">{t("common.appName")}</span>. {t("footer.allRightsReserved", "All rights reserved.")}
            </p>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-base text-muted-foreground font-semibold">
                  {t("footer.poweredBy", "Powered by")}
                </span>
                <a 
                  href="https://www.themoviedb.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img
                    src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                    alt="TMDB logo for CineTrekker movie tracker data provider"
                    className="h-5 logo-image"
                    loading="lazy"
                    width="81"
                    height="16"
                  />
                </a>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-3xl text-center text-[0.97rem] leading-relaxed text-muted-foreground font-medium">
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


