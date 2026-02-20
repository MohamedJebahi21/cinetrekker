import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import User from 'lucide-react/dist/esm/icons/user';
import Settings from 'lucide-react/dist/esm/icons/settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { SearchDropdown } from '@/components/SearchDropdown';

interface NavItem {
  path: string;
  key: string;
  fallback: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', key: 'nav.home', fallback: 'Home', exact: true },
  { path: '/search', key: 'nav.search', fallback: 'Search' },
  { path: '/watchlist', key: 'nav.watchlist', fallback: 'Watchlist' },
  { path: '/watched', key: 'nav.watched', fallback: 'Watched' },
  { path: '/recommendations', key: 'nav.recommendations', fallback: 'Recommendations' },
  { path: '/calendar', key: 'nav.calendar', fallback: 'Calendar' },
  { path: '/enhanced-stats', key: 'nav.stats', fallback: 'Stats' },
];

export function UnifiedNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isMenuOpen) return;

      const target = event.target as Node;
      const clickedInsideMenu = menuRef.current?.contains(target);
      const clickedToggle = toggleButtonRef.current?.contains(target);

      if (!clickedInsideMenu && !clickedToggle) {
        setIsMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const activePath = useMemo(() => {
    return NAV_ITEMS.find((item) => {
      if (item.exact) return pathname === item.path;
      return pathname.startsWith(item.path);
    })?.path;
  }, [pathname]);

  return (
    <header role="banner" className={cn('glass-nav h-16 transition-all duration-300', isScrolled && 'scrolled')}>
      <div className="container mx-auto flex h-full items-center justify-between px-4 gap-4">
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0" aria-label={t('common.appName', 'CineTrekker')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(358_94%_46%/0.5)]">
            <span className="text-xl font-bold text-primary-foreground">CT</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden lg:block">{t('common.appName', 'CineTrekker')}</span>
        </Link>

        <div className="hidden md:block flex-1 max-w-xl mx-4">
          <SearchDropdown />
        </div>

        <nav className="hidden md:flex items-center gap-1" aria-label={t('nav.main', 'Main navigation')}>
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(item.key, item.fallback)}
              </Link>
            );
          })}

          {!loading && (
            user ? (
              <>
                <Link
                  to="/profile"
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                    pathname.startsWith('/profile') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
                >
                  <User className="h-4 w-4" />
                  {t('nav.profile', 'Profile')}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-2"
                  aria-label={t('nav.signOut', 'Sign Out')}
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signOut', 'Sign Out')}
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button type="button" variant="default" size="sm" className="gap-2" aria-label={t('nav.signIn', 'Sign In')}>
                  <LogIn className="h-4 w-4" />
                  {t('nav.signIn', 'Sign In')}
                </Button>
              </Link>
            )
          )}
        </nav>

        <div className="md:hidden flex items-center gap-1">
          <Link
            to="/profile"
            className={cn(
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground transition-colors hover:bg-accent',
              pathname.startsWith('/profile') && 'bg-primary text-primary-foreground'
            )}
            aria-label={t('nav.profile', 'Profile')}
          >
            <User className="h-5 w-5" />
          </Link>

          <Link
            to="/settings"
            className={cn(
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground transition-colors hover:bg-accent',
              pathname.startsWith('/settings') && 'bg-primary text-primary-foreground'
            )}
            aria-label={t('nav.settings', 'Settings')}
          >
            <Settings className="h-5 w-5" />
          </Link>

          <button
            ref={toggleButtonRef}
            type="button"
            className="inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground hover:bg-accent transition-colors"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        ref={menuRef}
        className={cn(
          'md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden transition-all duration-300 ease-out',
          isMenuOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="container mx-auto px-4 py-4 flex flex-col gap-2" aria-label={t('nav.mobile', 'Mobile navigation')}>
          <div className="mb-1">
            <SearchDropdown onNavigate={() => setIsMenuOpen(false)} />
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(item.key, item.fallback)}
              </Link>
            );
          })}

          {!loading && (
            user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-left text-destructive hover:bg-destructive/10 min-h-[44px]"
                >
                  {t('nav.signOut', 'Sign Out')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center bg-primary text-primary-foreground"
              >
                {t('nav.signIn', 'Sign In')}
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}

export default UnifiedNav;