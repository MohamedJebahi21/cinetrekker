import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Filter } from 'lucide-react';
import { searchMulti, getMovieGenres, getTVGenres } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MediaType } from '@/types/media';

export default function Search() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType>('all');
  const [sortBy, setSortBy] = useState<string>('popularity');
  
  const language = i18n.language;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query) {
        setSearchParams({ q: query });
      } else {
        setSearchParams({});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, setSearchParams]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, language],
    queryFn: () => searchMulti(debouncedQuery, 1, language),
    enabled: debouncedQuery.length > 0,
  });

  const { data: movieGenres } = useQuery({
    queryKey: ['genres', 'movie', language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ['genres', 'tv', language],
    queryFn: () => getTVGenres(language),
  });

  // Filter and sort results
  const filteredResults = searchResults?.results
    ?.filter(item => {
      // Filter by type
      if (mediaTypeFilter === 'all') return item.media_type === 'movie' || item.media_type === 'tv';
      return item.media_type === mediaTypeFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.vote_average || 0) - (a.vote_average || 0);
        case 'newest':
          const dateA = a.release_date || a.first_air_date || '';
          const dateB = b.release_date || b.first_air_date || '';
          return dateB.localeCompare(dateA);
        case 'title':
          const titleA = a.title || a.name || '';
          const titleB = b.title || b.name || '';
          return titleA.localeCompare(titleB);
        default: // popularity
          return (b.popularity || 0) - (a.popularity || 0);
      }
    }) || [];

  return (
    <div className="page-container">
      {/* Search Header */}
      <div className="mb-8">
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
            autoFocus
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('filters.type')}:</span>
          <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as MediaType)}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="movie">{t('common.movies')}</SelectItem>
              <SelectItem value="tv">{t('common.tvShows')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('filters.sort')}:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">{t('filters.sortOptions.popularity')}</SelectItem>
              <SelectItem value="rating">{t('filters.sortOptions.rating')}</SelectItem>
              <SelectItem value="newest">{t('filters.sortOptions.newest')}</SelectItem>
              <SelectItem value="title">{t('filters.sortOptions.title')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {debouncedQuery && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {t('search.resultsFor', { query: debouncedQuery })} ({filteredResults.length})
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="media-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="media-grid">
          {filteredResults.map((item) => (
            <MediaCard key={`${item.id}-${item.media_type}`} media={item} />
          ))}
        </div>
      ) : debouncedQuery ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">{t('search.placeholder')}</p>
        </div>
      )}
    </div>
  );
}
