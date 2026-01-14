import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Filter, SlidersHorizontal, X } from 'lucide-react';
import { 
  searchMulti, 
  getMovieGenres, 
  getTVGenres, 
  discoverMovies, 
  discoverTV,
  getTrending 
} from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
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
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType>(initialType);
  const [genreFilter, setGenreFilter] = useState<string>(initialGenre);
  const [yearFilter, setYearFilter] = useState<string>(initialYear);
  const [languageFilter, setLanguageFilter] = useState<string>(initialLang);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  
  const language = i18n.language;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Update URL params when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery) params.q = debouncedQuery;
    if (mediaTypeFilter !== 'all') params.type = mediaTypeFilter;
    if (genreFilter) params.genre = genreFilter;
    if (yearFilter) params.year = yearFilter;
    if (languageFilter) params.lang = languageFilter;
    if (sortBy !== 'popularity.desc') params.sort = sortBy;
    setSearchParams(params);
  }, [debouncedQuery, mediaTypeFilter, genreFilter, yearFilter, languageFilter, sortBy, setSearchParams]);

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

  // Determine if we should use text search or discover API
  const hasFilters = mediaTypeFilter !== 'all' || !!genreFilter || !!yearFilter || !!languageFilter;
  const useDiscoverMode = !debouncedQuery && hasFilters;
  const useSearchMode = debouncedQuery.length > 0;
  const showTrending = !useDiscoverMode && !useSearchMode;

  // Text search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery, language],
    queryFn: () => searchMulti(debouncedQuery, 1, language),
    enabled: Boolean(useSearchMode),
  });

  // Discover movies query
  const { data: discoverMoviesResults, isLoading: isDiscoveringMovies } = useQuery({
    queryKey: ['discover', 'movie', genreFilter, yearFilter, languageFilter, sortBy, language],
    queryFn: () => discoverMovies({
      with_genres: genreFilter || undefined,
      primary_release_year: yearFilter || undefined,
      with_original_language: languageFilter || undefined,
      sort_by: sortBy,
    }, language),
    enabled: Boolean(useDiscoverMode && (mediaTypeFilter === 'movie' || mediaTypeFilter === 'all')),
  });

  // Discover TV query
  const { data: discoverTVResults, isLoading: isDiscoveringTV } = useQuery({
    queryKey: ['discover', 'tv', genreFilter, yearFilter, languageFilter, sortBy, language],
    queryFn: () => discoverTV({
      with_genres: genreFilter || undefined,
      first_air_date_year: yearFilter || undefined,
      with_original_language: languageFilter || undefined,
      sort_by: sortBy,
    }, language),
    enabled: Boolean(useDiscoverMode && (mediaTypeFilter === 'tv' || mediaTypeFilter === 'all')),
  });

  // Trending for default view
  const { data: trendingResults, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['trending', 'all', 'week', language],
    queryFn: () => getTrending('all', 'week', language),
    enabled: Boolean(showTrending),
  });

  const isLoading = isSearching || isDiscoveringMovies || isDiscoveringTV || isTrendingLoading;

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
  };

  const activeFiltersCount = [
    mediaTypeFilter !== 'all',
    genreFilter,
    yearFilter,
    languageFilter,
  ].filter(Boolean).length;

  return (
    <div className="page-container">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="section-title">{t('nav.search')}</h1>
        
        {/* Search Input */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 text-lg bg-card border-border/50"
          />
        </div>
        
        {/* Filter hint */}
        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          {t('search.filterHint')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card/50 rounded-lg p-4 mb-6 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="font-medium">{t('search.filters')}</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} {t('search.active')}
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              {t('search.clearFilters')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Type Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('filters.type')}</label>
            <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as MediaType)}>
              <SelectTrigger className="bg-background">
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
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('common.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('common.all')}</SelectItem>
                {allGenres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.id.toString()}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('filters.year')}</label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('common.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('common.all')}</SelectItem>
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
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('common.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('common.all')}</SelectItem>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('filters.sort')}</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background">
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
      </div>

      {/* Results Header */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {debouncedQuery ? (
            <>{t('search.resultsFor', { query: debouncedQuery })} ({results.length})</>
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
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="media-grid">
          {results.map((item) => (
            <MediaCard key={`${item.id}-${item.media_type}`} media={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">{t('common.noResults')}</p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              {t('search.clearFilters')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
