import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Menu, X, Globe, LogIn, LogOut, User } from 'lucide-react';
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
      "glass-nav h-16 transition-all duration-300",
      isScrolled && "shadow-lg"
    )}>
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(358_94%_46%/0.5)]">
            <span className="text-xl font-bold text-primary-foreground">CT</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block">
            {t('common.appName')}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
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
        <div className="flex items-center gap-2">
          {/* Search Icon (Mobile) */}
          <Link to="/search" className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Search className="h-5 w-5" />
          </Link>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-white/5">
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
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-white/5">
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
                <Button variant="default" size="sm" className="gap-2 btn-primary-glow">
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
            className="md:hidden hover:bg-white/5"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
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
                className="px-4 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground text-center mt-2"
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
                className="px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 text-left mt-2"
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
