import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto safe-area-bottom border-t border-border/35 bg-[var(--bg-page)]">
      <div className="container mx-auto px-4 py-8 md:py-10">
        {/* Main Footer Grid - 5 columns on desktop (Brand spans 2) */}
        <div className="grid grid-cols-1 gap-8 min-[400px]:grid-cols-2 md:grid-cols-5 md:gap-10">
          {/* Brand Column - takes 2 columns on desktop */}
          <div className="col-span-1 min-[400px]:col-span-2 md:col-span-2 min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-[0_8px_20px_hsl(358_94%_46%/0.2)]">
                <span className="text-lg font-bold text-primary-foreground">
                  CT
                </span>
              </div>
              <span className="text-[1.85rem] font-semibold leading-none text-[var(--text-primary)]">
                {t("common.appName")}
              </span>
            </div>
            <p className="max-w-sm text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
              {t(
                "footer.tagline",
                "Your personal movie and TV show tracker. Discover, track, and share your cinematic journey.",
              )}
            </p>
          </div>
          {/* Explore Column */}
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]/90">
              {t("footer.explore", "Explore")}
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Explore links">
              <Link
                to="/search?sort=popularity.desc"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.trending", "Trending")}
              </Link>
              <Link
                to="/search?sort=primary_release_date.desc"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.upcoming", "Upcoming")}
              </Link>
              <Link
                to="/search?sort=vote_average.desc"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.topRated", "Top Rated")}
              </Link>
            </nav>
          </div>

          {/* Support Column */}
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]/90">
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
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.buyMeACoffee", "Buy Me a Coffee")}
              </a>
              <Link
                to="/about"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.about", "About")}
              </Link>
              <Link
                to="/feedback"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.feedback", "Feedback")}
              </Link>
              <a
                href="https://developer.themoviedb.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.tmdbApi", "TMDB API")}
              </a>
            </nav>
          </div>

          {/* Legal Column */}
          <div className="min-w-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]/90">
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
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("nav.privacy", "Privacy Policy")}
              </Link>
              <Link
                to="/terms"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t("footer.terms", "Terms of Service")}
              </Link>
              <Link
                to="/cookies"
                className="break-words text-[0.92rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
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
            <p className="text-center text-[0.84rem] text-[var(--text-secondary)] md:text-left">
              (c) {currentYear} {t("common.appName")}.{" "}
              {t("footer.allRightsReserved", "All rights reserved.")}
            </p>

            {/* TMDB Attribution */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[0.84rem] text-[var(--text-secondary)]">
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
                    alt="TMDB Logo"
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
          <p className="mx-auto mt-3 max-w-3xl text-center text-[0.78rem] leading-relaxed text-[var(--text-secondary)]">
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
