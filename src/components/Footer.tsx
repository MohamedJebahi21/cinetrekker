import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto max-w-[82rem] px-4 py-9 pb-[max(calc(3.5rem+env(safe-area-inset-bottom,0px)),1.5rem)] md:py-12 md:pb-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5 md:gap-10">
          <div className="min-w-0 md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/apple-touch-icon.png"
                alt="CineTrekker logo"
                className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
              />
              <span className="text-lg font-semibold leading-none tracking-[-0.02em] text-foreground sm:text-xl">
                {t("common.appName")}
              </span>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              {t(
                "footer.tagline",
                "Your personal movie and TV tracker. Discover, track, and share your cinematic journey.",
              )}
            </p>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("footer.explore", "Explore")}
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label={t("footer.exploreLinks", "Explore links")}>
              <Link to="/" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("nav.home", "Home")}
              </Link>
              <Link to="/watchlist" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("nav.watchlist", "Watchlist")}
              </Link>
              <Link to="/watched" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("nav.watched", "Watched")}
              </Link>
              <Link to="/search" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("nav.search", "Search")}
              </Link>
              <Link to="/movie-tracker" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.movieTracker", "Movie & TV Tracker")}
              </Link>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("footer.support", "Support")}
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label={t("footer.supportLinks", "Support links")}>
              <a
                href="https://buymeacoffee.com/mohamed_jebahi"
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t("footer.buyMeACoffee", "Buy Me a Coffee")}
              </a>
              <Link to="/about" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.about", "About")}
              </Link>
              <Link to="/feedback" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.feedback", "Feedback")}
              </Link>
              <Link to="/status" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.serviceStatus", "Service status")}
              </Link>
              <Link to="/trust" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.trustCenter", "Trust center")}
              </Link>
              <Link to="/partnerships" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.partnershipPrinciples", "Partnership principles")}
              </Link>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("footer.legal", "Legal")}
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label={t("footer.legalLinks", "Legal links")}>
              <Link to="/privacy" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("nav.privacy", "Privacy Policy")}
              </Link>
              <Link to="/terms" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.terms", "Terms of Service")}
              </Link>
              <Link to="/cookies" className="-mx-1 inline-flex min-h-8 items-center break-words rounded-md px-1 text-[0.92rem] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t("footer.cookies", "Cookie Policy")}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
            <p className="text-[0.84rem] text-muted-foreground sm:shrink-0">
              © {currentYear} {t("common.appName")}. {t("footer.allRightsReserved", "All rights reserved.")}
            </p>
            <p className="w-full text-left text-xs leading-relaxed text-muted-foreground/70 sm:min-w-0 sm:flex-1 sm:text-center">
              {t(
                "footer.attribution",
                "This product uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV show data, including images and metadata, is provided by The Movie Database (TMDB).",
              )}
            </p>
            <div className="flex items-center gap-2 sm:shrink-0">
              <span className="text-sm text-muted-foreground">
                {t("footer.poweredBy", "Powered by")}
              </span>
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
      </div>
    </footer>
  );
}
