import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Filter, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { 
  searchMulti, 
  getMovieGenres, 
  getTVGenres, 
  discoverMovies, 
  discoverTV,
  getTrending 
} from '@/services/tmdb';
import { Media } from '@/types/media';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { MediaPreviewModal } from '@/components/MediaPreviewModal';
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

// Mood mappings to TMDB genre IDs
const MOODS = [
  { id: 'thrilling', name: 'Thrilling', genres: '28,53,80' }, // Action, Thriller, Crime
  { id: 'feel-good', name: 'Feel-good', genres: '35,10751,10749' }, // Comedy, Family, Romance
  { id: 'mind-bending', name: 'Mind-bending', genres: '878,9648' }, // Sci-Fi, Mystery
  { id: 'emotional', name: 'Emotional', genres: '18,10749' }, // Drama, Romance
  { id: 'scary', name: 'Scary', genres: '27,53' }, // Horror, Thriller
  { id: 'adventurous', name: 'Adventurous', genres: '12,14,878' }, // Adventure, Fantasy, Sci-Fi
  { id: 'funny', name: 'Funny', genres: '35,16' }, // Comedy, Animation
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
  const initialMood = searchParams.get('mood') || '';
  const initialRuntime = searchParams.get('runtime') || '';
  const initialStreaming = searchParams.get('streaming') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType>(initialType);
  const [genreFilter, setGenreFilter] = useState<string>(initialGenre);
  const [yearFilter, setYearFilter] = useState<string>(initialYear);
  const [languageFilter, setLanguageFilter] = useState<string>(initialLang);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [moodFilter, setMoodFilter] = useState<string>(initialMood);
  const [runtimeFilter, setRuntimeFilter] = useState<string>(initialRuntime);
  const [streamingFilter, setStreamingFilter] = useState<string>(initialStreaming);
  
  // Modal state
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
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
    if (moodFilter) params.mood = moodFilter;
    if (runtimeFilter) params.runtime = runtimeFilter;
    if (streamingFilter) params.streaming = streamingFilter;
    setSearchParams(params);
  }, [debouncedQuery, mediaTypeFilter, genreFilter, yearFilter, languageFilter, sortBy, moodFilter, runtimeFilter, streamingFilter, setSearchParams]);

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

  // Get mood genres if mood is selected
  const moodGenres = moodFilter ? MOODS.find(m => m.id === moodFilter)?.genres : undefined;
  const effectiveGenres = moodGenres || genreFilter || undefined;

  // Get runtime params
  const runtimeConfig = runtimeFilter ? RUNTIMES.find(r => r.id === runtimeFilter) : undefined;

  // Determine if we should use text search or discover API
  const hasFilters = mediaTypeFilter !== 'all' || !!genreFilter || !!yearFilter || !!languageFilter || !!moodFilter || !!runtimeFilter || !!streamingFilter;
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
  const { data: discoverTVResults, isLoading: isDiscoveringTV } = useQuery({
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
    setMoodFilter('');
    setRuntimeFilter('');
    setStreamingFilter('');
  };

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  const activeFiltersCount = [
    mediaTypeFilter !== 'all',
    genreFilter,
    yearFilter,
    languageFilter,
    moodFilter,
    runtimeFilter,
    streamingFilter,
  ].filter(Boolean).length;

  const handleCardClick = (media: Media) => {
    setSelectedMedia(media);
    setModalOpen(true);
  };

  return (
    <div className="page-container pt-20">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="section-title mb-0">{t('nav.search')}</h1>
          <RandomTrekButton />
        </div>
        
        {/* Search Input with Clear Button */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 h-14 text-lg bg-card/50 border-white/10 rounded-xl focus:border-primary focus:ring-primary/20 transition-all"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
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

      {/* Advanced Filters */}
      <div className="glass-card p-5 mb-8">
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-primary">
              <X className="w-4 h-4 mr-1" />
              {t('search.clearFilters')}
            </Button>
          )}
        </div>

        {/* Mood Filter - Prominent */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-2 block">{t('filters.mood') || 'Mood'}</label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setMoodFilter(moodFilter === mood.id ? '' : mood.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  moodFilter === mood.id
                    ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsl(358_81%_47%/0.3)]'
                    : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
                }`}
              >
                <Sparkles className={`w-3 h-3 inline mr-1.5 ${moodFilter === mood.id ? 'animate-pulse' : ''}`} />
                {mood.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
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
              onValueChange={(v) => { setGenreFilter(v === '__all__' ? '' : v); setMoodFilter(''); }}
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
            <div key={`${item.id}-${item.media_type}`} onClick={() => handleCardClick(item)} className="cursor-pointer">
              <MediaCard media={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <SearchIcon className="empty-state-icon w-12 h-12" />
          </div>
          <h3 className="empty-state-title">{t('search.noResultsTitle') || 'No results found'}</h3>
          <p className="empty-state-description">
            {debouncedQuery 
              ? t('search.noResultsDescription') || `We couldn't find anything matching "${debouncedQuery}". Try adjusting your filters or search terms.`
              : t('search.trySearching') || 'Start typing to search for movies, TV shows, or actors.'
            }
          </p>
          {(hasFilters || debouncedQuery) && (
            <Button variant="default" onClick={() => { clearFilters(); clearSearch(); }} className="btn-primary-glow">
              {t('search.resetAll') || 'Reset All Filters'}
            </Button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <MediaPreviewModal
        media={selectedMedia}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}