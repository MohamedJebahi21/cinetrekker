import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Filter, SlidersHorizontal, X, TrendingUp } from 'lucide-react';
import SEO from '@/components/SEO';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  searchMulti, 
  getMovieGenres, 
  getTVGenres, 
  discoverMovies, 
  discoverTV,
  getTrending 
} from '@/services/tmdb';
import { Media } from '@/types/media';
import { MediaCard } from '@/components/MediaCard';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { RandomTrekButton } from '@/components/RandomTrekButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MediaType, Genre } from '@/types/media';
import { useDebounce } from '@/hooks/useDebounce';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' },
];

// Runtime options
const RUNTIMES = [
  { id: 'short', name: 'Quick Watch (< 90 min)', gte: '0', lte: '90' },
  { id: 'medium', name: 'Standard (90-120 min)', gte: '90', lte: '120' },
  { id: 'long', name: 'Epic (2h+)', gte: '120', lte: '500' },
];

// Streaming services (common provider IDs)
const STREAMING_SERVICES = [
  { id: '8', name: 'Netflix' },
  { id: '9', name: 'Amazon Prime' },
  { id: '337', name: 'Disney+' },
  { id: '1899', name: 'Max' },
  { id: '15', name: 'Hulu' },
  { id: '350', name: 'Apple TV+' },
  { id: '531', name: 'Paramount+' },
  { id: '387', name: 'Peacock' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

export default function Search() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as MediaType) || 'all';
  const initialGenre = searchParams.get('genre') || '';
  const initialYear = searchParams.get('year') || '';
  const initialLang = searchParams.get('lang') || '';
  const initialSort = searchParams.get('sort') || 'popularity.desc';
  const initialRuntime = searchParams.get('runtime') || '';
  const initialStreaming = searchParams.get('streaming') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);
  const normalizedQuery = useMemo(() => debouncedQuery.normalize('NFKC').trim(), [debouncedQuery]);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType>(initialType);
  const [genreFilter, setGenreFilter] = useState<string>(initialGenre);
  const [yearFilter, setYearFilter] = useState<string>(initialYear);
  const [languageFilter, setLanguageFilter] = useState<string>(initialLang);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [runtimeFilter, setRuntimeFilter] = useState<string>(initialRuntime);
  const [streamingFilter, setStreamingFilter] = useState<string>(initialStreaming);
  
  // Quick preview modal removed — navigation to details is used instead
  
  const language = i18n.language;

  // Update URL params when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (normalizedQuery) params.q = normalizedQuery;
    if (mediaTypeFilter !== 'all') params.type = mediaTypeFilter;
    if (genreFilter) params.genre = genreFilter;
    if (yearFilter) params.year = yearFilter;
    if (languageFilter) params.lang = languageFilter;
    if (sortBy !== 'popularity.desc') params.sort = sortBy;
    if (runtimeFilter) params.runtime = runtimeFilter;
    if (streamingFilter) params.streaming = streamingFilter;
    setSearchParams(params);
  }, [normalizedQuery, mediaTypeFilter, genreFilter, yearFilter, languageFilter, sortBy, runtimeFilter, streamingFilter, setSearchParams]);

  const { data: movieGenres } = useQuery({
    queryKey: ['genres', 'movie', language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ['genres', 'tv', language],
    queryFn: () => getTVGenres(language),
  });

  // Combine and deduplicate genres
  const allGenres = useMemo(() => {
    const genreMap = new Map<number, Genre>();
    movieGenres?.genres?.forEach(g => genreMap.set(g.id, g));
    tvGenres?.genres?.forEach(g => genreMap.set(g.id, g));
    return Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [movieGenres, tvGenres]);

  // Use genre filter directly
  const effectiveGenres = genreFilter || undefined;

  // Get runtime params
  const runtimeConfig = runtimeFilter ? RUNTIMES.find(r => r.id === runtimeFilter) : undefined;

  // Determine if we should use text search or discover API
  const hasFilters = mediaTypeFilter !== 'all' || !!genreFilter || !!yearFilter || !!languageFilter || !!runtimeFilter || !!streamingFilter;
  const useDiscoverMode = !debouncedQuery && hasFilters;
  const useSearchMode = normalizedQuery.length > 0;
  const showTrending = !useDiscoverMode && !useSearchMode;

  // Text search query
  const { data: searchResults, isLoading: isSearching, isError: isSearchError, error: searchError } = useQuery({
    queryKey: ['search', normalizedQuery, language],
    queryFn: () => searchMulti(normalizedQuery, 1, language),
    enabled: Boolean(useSearchMode),
    retry: 1,
  });

  // Discover movies query
  const { data: discoverMoviesResults, isLoading: isDiscoveringMovies, isError: isDiscoverMoviesError, error: discoverMoviesError } = useQuery({
    queryKey: ['discover', 'movie', effectiveGenres, yearFilter, languageFilter, sortBy, runtimeConfig?.gte, runtimeConfig?.lte, streamingFilter, language],
    queryFn: () => discoverMovies({
      with_genres: effectiveGenres,
      primary_release_year: yearFilter || undefined,
      with_original_language: languageFilter || undefined,
      sort_by: sortBy,
      with_runtime_gte: runtimeConfig?.gte,
      with_runtime_lte: runtimeConfig?.lte,
      with_watch_providers: streamingFilter || undefined,
      watch_region: streamingFilter ? 'US' : undefined,
    }, language),
    enabled: Boolean(useDiscoverMode && (mediaTypeFilter === 'movie' || mediaTypeFilter === 'all')),
  });

  // Discover TV query
  const { data: discoverTVResults, isLoading: isDiscoveringTV, isError: isDiscoverTVError, error: discoverTVError } = useQuery({
    queryKey: ['discover', 'tv', effectiveGenres, yearFilter, languageFilter, sortBy, runtimeConfig?.gte, runtimeConfig?.lte, streamingFilter, language],
    queryFn: () => discoverTV({
      with_genres: effectiveGenres,
      first_air_date_year: yearFilter || undefined,
      with_original_language: languageFilter || undefined,
      sort_by: sortBy,
      with_runtime_gte: runtimeConfig?.gte,
      with_runtime_lte: runtimeConfig?.lte,
      with_watch_providers: streamingFilter || undefined,
      watch_region: streamingFilter ? 'US' : undefined,
    }, language),
    enabled: Boolean(useDiscoverMode && (mediaTypeFilter === 'tv' || mediaTypeFilter === 'all')),
  });

  // Trending for default view
  const { data: trendingResults, isLoading: isTrendingLoading, isError: isTrendingError, error: trendingError } = useQuery({
    queryKey: ['trending', 'all', 'week', language],
    queryFn: () => getTrending('all', 'week', language),
    enabled: Boolean(showTrending),
  });

  const isLoading = isSearching || isDiscoveringMovies || isDiscoveringTV || isTrendingLoading;
  const isError = isSearchError || isDiscoverMoviesError || isDiscoverTVError || isTrendingError;
  const activeError = (searchError || discoverMoviesError || discoverTVError || trendingError) as Error | null;

  // Combine and filter results
  const results = useMemo(() => {
    if (useSearchMode) {
      // Filter search results by type and genre
      let filtered = searchResults?.results?.filter(item => 
        item.media_type === 'movie' || item.media_type === 'tv'
      ) || [];

      if (mediaTypeFilter !== 'all') {
        filtered = filtered.filter(item => item.media_type === mediaTypeFilter);
      }

      if (genreFilter) {
        const genreId = parseInt(genreFilter);
        filtered = filtered.filter(item => item.genre_ids?.includes(genreId));
      }

      return filtered;
    }

    if (useDiscoverMode) {
      const movies = (discoverMoviesResults?.results || []).map(m => ({ ...m, media_type: 'movie' as const }));
      const tvShows = (discoverTVResults?.results || []).map(s => ({ ...s, media_type: 'tv' as const }));

      if (mediaTypeFilter === 'movie') return movies;
      if (mediaTypeFilter === 'tv') return tvShows;
      
      // Interleave results for "all" type
      const combined = [];
      const maxLen = Math.max(movies.length, tvShows.length);
      for (let i = 0; i < maxLen; i++) {
        if (movies[i]) combined.push(movies[i]);
        if (tvShows[i]) combined.push(tvShows[i]);
      }
      return combined;
    }

    // Default: show trending
    return trendingResults?.results?.filter(item => 
      item.media_type === 'movie' || item.media_type === 'tv'
    ) || [];
  }, [useSearchMode, useDiscoverMode, searchResults, discoverMoviesResults, discoverTVResults, trendingResults, mediaTypeFilter, genreFilter]);

  const clearFilters = () => {
    setMediaTypeFilter('all');
    setGenreFilter('');
    setYearFilter('');
    setLanguageFilter('');
    setSortBy('popularity.desc');
    setRuntimeFilter('');
    setStreamingFilter('');
  };

  const clearSearch = () => {
    setQuery('');
  };

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut: 'f' to open filters on mobile when not focused on input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setMobileFiltersOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // When mobile filters open, scroll to top and focus first control for better UX
  useEffect(() => {
    if (mobileFiltersOpen) {
      setTimeout(() => {
        mobileFiltersRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        const first = mobileFiltersRef.current?.querySelector<HTMLElement>('button, input, select');
        first?.focus();
      }, 50);
    }
  }, [mobileFiltersOpen]);

  const activeFiltersCount = [
    mediaTypeFilter !== 'all',
    genreFilter,
    yearFilter,
    languageFilter,
    runtimeFilter,
    streamingFilter,
  ].filter(Boolean).length;

  // Card click navigates via the card's Link; quick preview removed

  // Extracted filters content so it can be used in desktop and mobile drawer
  const FiltersContent = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-semibold">{t('search.filters')}</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0">
              {activeFiltersCount} {t('search.active')}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground md:hover:text-primary active:text-primary focus-visible:text-primary">
            <X className="w-4 h-4 mr-1" />
            {t('search.clearFilters')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Type Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('filters.type')}</label>
          <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as MediaType)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="movie">{t('common.movies')}</SelectItem>
              <SelectItem value="tv">{t('common.tvShows')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Genre Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('filters.genre')}</label>
          <Select
            value={genreFilter || '__all__'}
            onValueChange={(v) => setGenreFilter(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {allGenres.map((genre) => (
                <SelectItem key={genre.id} value={genre.id.toString()}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Runtime Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('filters.runtime') || 'Runtime'}</label>
          <Select value={runtimeFilter || '__all__'} onValueChange={(v) => setRuntimeFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {RUNTIMES.map((runtime) => (
                <SelectItem key={runtime.id} value={runtime.id}>
                  {runtime.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Streaming Service Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('filters.streaming') || 'Streaming'}</label>
          <Select value={streamingFilter || '__all__'} onValueChange={(v) => setStreamingFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {STREAMING_SERVICES.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('filters.year')}</label>
          <Select value={yearFilter || '__all__'} onValueChange={(v) => setYearFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('filters.language')}</label>
          <Select
            value={languageFilter || '__all__'}
            onValueChange={(v) => setLanguageFilter(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="text-xs text-muted-foreground">{t('filters.sort')}</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity.desc">{t('filters.sortOptions.popularity')}</SelectItem>
              <SelectItem value="vote_average.desc">{t('filters.sortOptions.rating')}</SelectItem>
              <SelectItem value="primary_release_date.desc">{t('filters.sortOptions.newest')}</SelectItem>
              <SelectItem value="original_title.asc">{t('filters.sortOptions.title')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  return (
    <div className="page-container pt-20">
      <SEO 
        title={query ? `Search: ${query}` : 'Search Movies & TV Shows'}
        description={query 
          ? `Search results for "${query}" - Find movies, TV shows, and actors on CineTrekker`
          : 'Search and discover movies and TV shows by genre, year, rating, and mood. Filter by streaming services and find your next watch.'
        }
        keywords={query ? `${query}, movies, TV shows, search, streaming` : 'movie search, TV show search, genre filter, mood filter, streaming services'}
        canonical={`https://cinetrekker.vercel.app/search${window.location.search}`}
      />
      {/* Search Header */}
      <div className="mb-8 bg-background/95 backdrop-blur-md border-b border-border/60 py-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="section-title mb-0">{t('nav.search')}</h1>
          <RandomTrekButton />
        </div>
        
        {/* Search Input with Clear Button */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 h-14 text-lg bg-card/50 border-white/10 rounded-xl focus:border-primary focus:ring-primary/20 transition-all"
            aria-label={t('search.placeholder')}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary transition-all"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter hint */}
        <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          {t('search.filterHint')}
        </p>
      </div>

      {/* Advanced Filters (desktop) */}
      <div className="hidden md:block">
        <div className="glass-card p-5 mb-8">
          <FiltersContent />
        </div>
      </div>

      {/* Mobile filter button and dialog */}
      <div className="md:hidden mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                {t('search.filterHint')}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{t('search.openFilters', 'Open filters (Press F)')}</TooltipContent>
          </Tooltip>
        </div>

        <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t('search.filters')}
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed right-0 top-0 h-full w-full max-w-sm bg-background p-4 z-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-semibold">{t('search.filters')}</span>
              </div>
              <DialogClose asChild>
                <button className="p-2 rounded-md hover:bg-muted/30 ml-2 min-w-[44px] min-h-[44px]">
                  <X className="w-4 h-4" />
                </button>
              </DialogClose>
            </div>
            <div ref={mobileFiltersRef} className="overflow-auto max-h-[80vh]">
              <FiltersContent />
            </div>

            <div className="border-t border-border/50 mt-4 pt-3 flex items-center gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => { clearFilters(); mobileFiltersRef.current?.scrollTo({ top: 0 }); }}>
                {t('search.clearFilters')}
              </Button>
              <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                {t('common.apply', 'Apply')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Results Header */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <>{t('common.loading')}</>
          ) : isError ? (
            <>{activeError?.message || t('common.error')}</>
          ) : normalizedQuery ? (
            <>{t('search.resultsFor', { query: normalizedQuery })} ({results.length})</>
          ) : hasFilters ? (
            <>{t('search.filterResults')} ({results.length})</>
          ) : (
            <>{t('search.trendingNow')}</>
          )}
        </p>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="media-grid">
          {Array.from({ length: 18 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20 max-w-md mx-auto">
          <h3 className="text-2xl font-bold mb-3 title-display">
            {t('common.error')}
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {activeError?.message || t('search.noResultsDescription', 'Something went wrong while searching.')}
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="media-grid">
          {results.map((item) => (
            <MediaCard key={`${item.id}-${item.media_type}`} media={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <SearchIcon className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3 title-display">
            {normalizedQuery 
              ? t('search.noResultsTitle', 'No results found')
              : t('search.startJourney', 'Your Journey Starts Here')
            }
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {normalizedQuery 
              ? t('search.noResultsDescription', `We couldn't find anything matching "${normalizedQuery}". Try adjusting your filters or search terms.`)
              : t('search.trySearching', 'Search for movies, TV shows, or use the genre chips above to discover something new.')
            }
          </p>
          {(hasFilters || normalizedQuery) && (
            <Button 
              variant="default" 
              onClick={() => { clearFilters(); clearSearch(); }} 
              className="btn-primary-glow gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t('common.discoverTrending', 'Discover Trending')}
            </Button>
          )}
        </div>
      )}

      {/* Media preview removed */}
    </div>
  );
}