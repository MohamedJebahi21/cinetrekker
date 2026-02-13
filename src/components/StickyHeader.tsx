import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface StickyHeaderProps {
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export function StickyHeader({
  onSearch,
  searchPlaceholder = 'Search movies, shows, people...',
}: StickyHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  const toggleDark = () => {
    // Dark mode is now the only theme - toggle disabled
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled ? 'glass-effect border-b border-border shadow-md' : 'border-b border-transparent'
      )}
    >
      <div className="px-4 py-3 md:py-4">
        <div className="max-w-screen-2xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between gap-4">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent whitespace-nowrap"
            >
              CineTrekker
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                  <Search aria-hidden className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <form onSubmit={handleSearchSubmit} className="w-full">
                    <Input
                      type="search"
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 pr-4 rounded-full bg-muted/50 border-muted focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </form>
                </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { path: '/', label: 'Home' },
                { path: '/search', label: 'Discover' },
                { path: '/watchlist', label: 'Watchlist' },
                { path: '/watched', label: 'Watched' },
              ].map(({ path, label }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(path) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/recommendations')}>Recommendations</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/calendar')}>Calendar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between gap-2">
            {/* Logo / Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-muted rounded-md"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-main-nav"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Search Icon / Close Search */}
            {!searchOpen ? (
              <>
                <div className="flex-1" />
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 hover:bg-muted rounded-md"
                >
                  <Search className="h-5 w-5" />
                </button>
                {showDarkToggle && (
                  <Button variant="ghost" size="icon" onClick={toggleDark} className="rounded-md">
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                )}
              </>
            ) : (
              <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
                <Input
                  type="search"
                  autoFocus
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(false)}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav id="mobile-main-nav" className="md:hidden mt-3 space-y-2 border-t border-border pt-3">
              {[
                { path: '/', label: 'Home' },
                { path: '/search', label: 'Discover' },
                { path: '/watchlist', label: 'Watchlist' },
                { path: '/watched', label: 'Watched' },
                { path: '/recommendations', label: 'Recommendations' },
                { path: '/calendar', label: 'Calendar' },
                { path: '/profile', label: 'Profile' },
              ].map(({ path, label }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(path) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export default StickyHeader;
