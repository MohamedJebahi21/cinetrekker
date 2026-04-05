import { useState, useEffect, useRef, type FormEvent } from 'react';
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

const PENDING_SEARCH_QUERY_KEY = 'cinetrekker_pending_search_query';
const MIN_SEARCH_LENGTH = 2;

function normalizeSearchQuery(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;

    const handleBeforeInput = (event: Event) => {
      const nativeEvent = event as InputEvent;
      if (nativeEvent.inputType === "insertReplacementText") {
        event.preventDefault();
      }
    };

    input.addEventListener("beforeinput", handleBeforeInput);
    return () => input.removeEventListener("beforeinput", handleBeforeInput);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextQuery = normalizeSearchQuery(searchInputRef.current?.value ?? searchQuery);

    if (nextQuery.length < MIN_SEARCH_LENGTH) {
      return;
    }

    sessionStorage.setItem(PENDING_SEARCH_QUERY_KEY, nextQuery);
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`, {
      state: { submittedQuery: nextQuery },
    });
    setSearchQuery('');
  };

  const toggleDark = () => {
    // Dark mode is now the only theme - toggle disabled
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-background shadow-md',
        scrolled && 'shadow-lg'
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="text-xl font-bold">
          CineTrekker
        </button>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              name="searchInput"
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
      </div>
    </header>
  );
}

export default StickyHeader;
