import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Settings from 'lucide-react/dist/esm/icons/settings';
import House from 'lucide-react/dist/esm/icons/house';
import Search from 'lucide-react/dist/esm/icons/search';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ChartNoAxesCombined from 'lucide-react/dist/esm/icons/chart-no-axes-combined';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { SearchDropdown } from '@/components/SearchDropdown';
import { profileService } from '@/services/profile';

interface NavItem {
  path: string;
  key: string;
  fallback: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', key: 'nav.home', fallback: 'Home', icon: House, exact: true },
  { path: '/search', key: 'nav.search', fallback: 'Search', icon: Search },
  { path: '/watchlist', key: 'nav.watchlist', fallback: 'Watchlist', icon: Bookmark },
  { path: '/watched', key: 'nav.watched', fallback: 'Watched', icon: CheckCheck },
  { path: '/recommendations', key: 'nav.recommendations', fallback: 'Recommendations', icon: Sparkles },
  { path: '/calendar', key: 'nav.calendar', fallback: 'Calendar', icon: Calendar },
  { path: '/enhanced-stats', key: 'nav.stats', fallback: 'Stats', icon: ChartNoAxesCombined },
];

export function UnifiedNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isSearchPage = pathname.startsWith('/search');
  const { user, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleButtonRef = useRef<HTMLButtonElement>(null);
  const desktopToggleButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch profile from Supabase to get the uploaded profile photo
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const profileImageUrl = useMemo(() => {
    // Prefer uploaded profile photo from database
    if (profile?.profile_photo) {
      return profile.profile_photo;
    }
    
    // Fallback to auth metadata
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const candidates = [metadata?.avatar_url, metadata?.picture, metadata?.photo_url];
    return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
  }, [profile, user]);

  const profileInitial = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const rawName = [metadata?.full_name, metadata?.name, metadata?.preferred_username, user?.email].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    );
    return rawName?.trim().charAt(0).toUpperCase() ?? 'P';
  }, [user]);

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
      const clickedInsideDesktopMenu = desktopMenuRef.current?.contains(target);
      const clickedInsideMobileMenu = mobileMenuRef.current?.contains(target);
      const clickedMobileToggle = mobileToggleButtonRef.current?.contains(target);
      const clickedDesktopToggle = desktopToggleButtonRef.current?.contains(target);

      if (!clickedInsideDesktopMenu && !clickedInsideMobileMenu && !clickedMobileToggle && !clickedDesktopToggle) {
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
    <header
      role="banner"
      className={cn('glass-nav min-h-[calc(4rem+env(safe-area-inset-top,0px)+0.4rem)] pt-[calc(env(safe-area-inset-top,0px)+0.4rem)] transition-all duration-300', isScrolled && 'scrolled')}
    >
      <div className="container mx-auto flex h-full items-center justify-between px-4 gap-4">
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0" aria-label={t('common.appName', 'CineTrekker')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(358_94%_46%/0.5)]">
            <span className="text-xl font-bold text-primary-foreground">CT</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden lg:block">{t('common.appName', 'CineTrekker')}</span>
        </Link>

        {!isSearchPage && (
          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <SearchDropdown />
          </div>
        )}

        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/profile"
            className={cn(
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground transition-colors hover:bg-accent',
              pathname.startsWith('/profile') && 'bg-primary text-primary-foreground'
            )}
            aria-label={t('nav.profile', 'Profile')}
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={t('nav.profile', 'Profile')}
                className="h-8 w-8 rounded-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                {profileInitial}
              </span>
            )}
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
            ref={desktopToggleButtonRef}
            type="button"
            className="inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground hover:bg-accent transition-colors"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <Link
            to="/profile"
            className={cn(
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-lg text-foreground transition-colors hover:bg-accent',
              pathname.startsWith('/profile') && 'bg-primary text-primary-foreground'
            )}
            aria-label={t('nav.profile', 'Profile')}
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={t('nav.profile', 'Profile')}
                className="h-8 w-8 rounded-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                {profileInitial}
              </span>
            )}
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
            ref={mobileToggleButtonRef}
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
        ref={desktopMenuRef}
        className={cn(
          'hidden md:block absolute right-4 z-50 w-80 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300 ease-out',
          isMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
        style={{ top: 'calc(4rem + env(safe-area-inset-top, 0px) + 0.4rem)' }}
      >
        <nav className="p-3 flex flex-col gap-1" aria-label={t('nav.main', 'Main navigation')}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] flex items-center',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 mr-2" />
                {t(item.key, item.fallback)}
              </Link>
            );
          })}

          {!loading && (
            user ? (
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-left text-destructive hover:bg-destructive/10 min-h-[48px]"
              >
                {t('nav.signOut', 'Sign Out')}
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-3 rounded-lg text-sm font-medium min-h-[48px] flex items-center justify-center bg-primary text-primary-foreground"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t('nav.signIn', 'Sign In')}
              </Link>
            )
          )}
        </nav>
      </div>

      <div
        ref={mobileMenuRef}
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
            const Icon = item.icon;
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
                <Icon className="h-4 w-4 mr-2" />
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