import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-card/45">
      <div className="container mx-auto max-w-[82rem] px-4 py-10 pb-[max(calc(3.5rem+env(safe-area-inset-bottom,0px)),1.5rem)] md:py-14 md:pb-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-12">
          <div className="min-w-0 md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/apple-touch-icon.png"
                alt="CineTrekker logo"
                className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
              />
              <span className="text-xl font-semibold leading-none tracking-[-0.025em] text-foreground sm:text-2xl">
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
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
              {t("footer.explore", "Explore")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label={t("footer.exploreLinks", "Explore links")}>
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
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
              {t("footer.support", "Support")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label={t("footer.supportLinks", "Support links")}>
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
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
              {t("footer.legal", "Legal")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label={t("footer.legalLinks", "Legal links")}>
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

        <div className="mt-10 border-t border-border/70 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="shrink-0 text-[0.84rem] text-muted-foreground">
              © {currentYear} {t("common.appName")}. {t("footer.allRightsReserved", "All rights reserved.")}
            </p>
            <p className="flex-1 text-center text-xs leading-relaxed text-muted-foreground/70 min-w-0">
              {t(
                "footer.attribution",
                "This product uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV show data, including images and metadata, is provided by The Movie Database (TMDB).",
              )}
            </p>
            <div className="shrink-0 flex items-center gap-2">
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
