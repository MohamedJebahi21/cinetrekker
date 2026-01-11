import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and App Name */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-lg font-bold gradient-text">{t('common.appName')}</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t('nav.privacy')}
            </Link>
          </div>

          {/* TMDB Attribution */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-3">
              <img 
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
                alt="TMDB Logo" 
                className="h-4"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center md:text-end max-w-sm">
              {t('footer.attribution')}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            © {currentYear} {t('common.appName')}. {t('footer.allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
