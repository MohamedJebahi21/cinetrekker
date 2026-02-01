import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, LogIn, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { languages } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { SearchDropdown } from '@/components/SearchDropdown';
import { cn } from '@/lib/utils';

export function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for enhanced glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/search', label: t('nav.search') },
    { path: '/watchlist', label: t('nav.watchlist') },
    { path: '/watched', label: t('nav.watched') },
    { path: '/recommendations', label: t('nav.recommendations') },
    { path: '/calendar', label: t('nav.calendar') },
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className={cn(
      "glass-nav h-16 transition-all duration-300 sticky top-0 z-50",
      isScrolled && "shadow-lg border-b border-white/10 backdrop-blur-xl bg-background/95"
    )}>
      <div className="container mx-auto flex h-full items-center justify-between px-4 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(358_94%_46%/0.5)]">
            <span className="text-xl font-bold text-primary-foreground">CT</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden lg:block">
            {t('common.appName')}
          </span>
        </Link>

        {/* Search Dropdown - Desktop */}
        <div className="hidden md:block flex-1 max-w-md">
          <SearchDropdown />
        </div>

        {/* Desktop Navigation - All links including Calendar */}
        <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "nav-link text-sm font-medium",
                location.pathname === link.path && "nav-link-active"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:bg-white/5 min-w-[44px] min-h-[44px]"
                aria-label="Change language"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLanguage.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px] bg-popover/95 backdrop-blur-xl border-border/50">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={i18n.language === lang.code ? 'bg-accent' : ''}
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu / Auth */}
          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 hover:bg-white/5 min-w-[44px] min-h-[44px]"
                    aria-label="User menu"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {user.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px] bg-popover/95 backdrop-blur-xl border-border/50">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2 btn-primary-glow min-w-[44px] min-h-[44px]"
                  aria-label={t('nav.signIn')}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('nav.signIn')}</span>
                </Button>
              </Link>
            )
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/5 min-w-[44px] min-h-[44px]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav className="lg:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {/* Mobile Search */}
            <div className="mb-2">
              <SearchDropdown onNavigate={() => setIsMenuOpen(false)} />
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center",
                  location.pathname === link.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Auth Button */}
            {!user ? (
              <Link
                to="/auth"
                className="px-4 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground text-center mt-2 min-h-[44px] flex items-center justify-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.signIn')}
              </Link>
            ) : (
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 text-left mt-2 min-h-[44px] flex items-center"
              >
                {t('nav.signOut')}
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
