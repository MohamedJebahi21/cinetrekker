import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-background border-t border-border/40">
      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 gap-8 min-[400px]:grid-cols-2 md:grid-cols-5 md:gap-10">
          <div className="col-span-1 min-[400px]:col-span-2 md:col-span-2 min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-[0_8px_20px_hsl(358_94%_46%/0.2)]">
                <span className="text-lg font-bold text-primary-foreground">
                  CT
                </span>
              </div>
              <span className="text-[1.45rem] font-semibold leading-none text-foreground sm:text-[1.85rem]">
                {t("common.appName")}
              </span>
            </div>
            <p className="max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground">
              {t(
                "footer.tagline",
                "Your personal movie and TV show tracker. Discover, track, and share your cinematic journey.",
              )}
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
              {t("footer.explore", "Explore")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Explore links">
              <Link
                to="/search"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Search
              </Link>
              <Link
                to="/trending"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.trending", "Trending")}
              </Link>
              <Link
                to="/upcoming"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.upcoming", "Upcoming")}
              </Link>
              <Link
                to="/search?sort=vote_average.desc"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.topRated", "Top Rated")}
              </Link>
            </nav>
          </div>
          {/* Support Column */}
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
              <Link
                to="/about"
                className="hover:text-primary transition-colors"
              >
                {t("footer.support", "Support")}
              </Link>
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Support links">
              <a
                href="https://buymeacoffee.com/mohamed_jebahi"
                target="_blank" rel="noopener noreferrer"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.buyMeACoffee", "Buy Me a Coffee")}
              </a>
              <Link
                to="/about"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.about", "About")}
              </Link>
              <Link
                to="/feedback"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.feedback", "Feedback")}
              </Link>
              <a
                href="https://developer.themoviedb.org/docs"
                target="_blank" rel="noopener noreferrer"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.tmdbApi", "TMDB API")}
              </a>
            </nav>
          </div>
          {/* Legal Column */}
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
              <Link
                to="/privacy"
                className="hover:text-primary transition-colors"
              >
                {t("footer.legal", "Legal")}
              </Link>
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Legal links">
              <Link
                to="/privacy"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("nav.privacy", "Privacy Policy")}
              </Link>
              <Link
                to="/terms"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.terms", "Terms of Service")}
              </Link>
              <Link
                to="/cookies"
                className="break-words rounded-sm text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("footer.cookies", "Cookie Policy")}
              </Link>
            </nav>
          </div>
        </div>
        {/* Bottom Bar */}
        <div className="mt-8 border-t border-border/40 pt-5">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Copyright */}
            <p className="text-center text-[0.84rem] text-muted-foreground md:text-left">
              © {currentYear} {t("common.appName")}.{" "}
              {t("footer.allRightsReserved", "All rights reserved.")}
            </p>
            {/* TMDB Attribution */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[0.84rem] text-muted-foreground">
                  {t("footer.poweredBy", "Powered by")}
                </span>
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank" rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  <img
                    src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                    alt="TMDB logo for CineTrekker movie tracker data provider"
                    className="h-3 logo-image"
                    loading="lazy"
                    width="81"
                    height="12"
                  />
                </a>
              </div>
            </div>
          </div>
          {/* TMDB Attribution Text */}
          <p className="mx-auto mt-3 max-w-3xl text-center text-[0.78rem] leading-relaxed text-muted-foreground">
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
