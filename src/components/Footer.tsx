import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background/50 mt-auto safe-area-bottom">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Grid - 5 columns on desktop (Brand spans 2) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand Column - takes 2 columns on desktop */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">CT</span>
              </div>
              <span className="text-xl font-bold">{t('common.appName')}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t('footer.tagline', 'Your personal movie and TV show tracker. Discover, track, and share your cinematic journey.')}
            </p>
          </div>
          {/* Explore Column */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground mb-4">
              {t('footer.explore', 'Explore')}
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Explore links">
              <Link 
                to="/search?sort=popularity.desc" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.trending', 'Trending')}
              </Link>
              <Link 
                to="/calendar" 
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

          {/* Support Column */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground mb-4">
              {t('footer.support', 'Support')}
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
              {t('footer.legal', 'Legal')}
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

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-xs text-muted-foreground text-center md:text-left">
              © {currentYear} {t('common.appName')}. {t('footer.allRightsReserved', 'All rights reserved.')}
            </p>

            {/* TMDB Attribution */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t('footer.poweredBy', 'Powered by')}
                </span>
                <a 
                  href="https://www.themoviedb.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img 
                    src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
                    alt="TMDB Logo" 
                    className="h-3"
                    loading="lazy"
                    width="81"
                    height="12"
                  />
                </a>
              </div>
            </div>
          </div>
          
          {/* TMDB Attribution Text */}
          <p className="text-[10px] text-muted-foreground/80 text-center mt-4 max-w-2xl mx-auto">
            {t('footer.attribution', 'This product uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV show data, including images and metadata, is provided by The Movie Database (TMDB).')}
          </p>
        </div>
      </div>
    </footer>
  );
}
