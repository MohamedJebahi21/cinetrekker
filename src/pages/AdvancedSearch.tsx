import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Sliders } from 'lucide-react';
import { searchMulti } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/SEO';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export default function AdvancedSearch() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'release_date'>('popularity');

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['advanced-search', query, language],
    queryFn: () => searchMulti(query, 1, language),
    enabled: false,
  });

  const handleSearch = () => {
    if (query.trim()) {
      refetch();
    }
  };

  // Filter results based on all criteria
  const filteredResults = results?.results
    .filter((item) => {
      // Media type filter
      if (mediaType !== 'all' && item.media_type !== mediaType) return false;

      // Year filter
      const releaseYear = new Date(
        item.release_date || item.first_air_date || '1900-01-01'
      ).getFullYear();
      if (releaseYear < yearRange[0] || releaseYear > yearRange[1]) return false;

      // Rating filter
      const rating = item.vote_average || 0;
      if (rating < ratingRange[0] || rating > ratingRange[1]) return false;

      // Genre filter
      if (selectedGenres.length > 0) {
        const itemGenres = item.genre_ids || [];
        const hasGenre = selectedGenres.some((g) => itemGenres.includes(g));
        if (!hasGenre) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0);
        case 'rating':
          return (b.vote_average || 0) - (a.vote_average || 0);
        case 'release_date': {
          const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
          const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
          return dateB.getTime() - dateA.getTime();
        }
        default:
          return 0;
      }
    });

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const activeFilters =
    (mediaType !== 'all' ? 1 : 0) +
    (yearRange[0] !== 1900 || yearRange[1] !== new Date().getFullYear() ? 1 : 0) +
    (ratingRange[0] !== 0 || ratingRange[1] !== 10 ? 1 : 0) +
    (selectedGenres.length > 0 ? 1 : 0);

  return (
    <>
      <SEO
        title="Advanced Search — CineTrekker"
        description="Search movies and TV shows with advanced filters"
        canonical="https://cinetrekker.vercel.app/advanced-search"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">Advanced Search</h1>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for movies, TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
          
          {/* Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Sliders className="h-4 w-4 mr-2" />
                Filters
                {activeFilters > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {activeFilters}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Search Filters</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Media Type */}
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <Select value={mediaType} onValueChange={(v) => setMediaType(v as 'all' | 'movie' | 'tv')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="movie">Movies</SelectItem>
                      <SelectItem value="tv">TV Shows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Range */}
                <div className="space-y-2">
                  <Label>
                    Year: {yearRange[0]} - {yearRange[1]}
                  </Label>
                  <Slider
                    min={1900}
                    max={new Date().getFullYear()}
                    step={1}
                    value={yearRange}
                    onValueChange={(v) => setYearRange(v as [number, number])}
                  />
                </div>

                {/* Rating Range */}
                <div className="space-y-2">
                  <Label>
                    Rating: {ratingRange[0]} - {ratingRange[1]}
                  </Label>
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={ratingRange}
                    onValueChange={(v) => setRatingRange(v as [number, number])}
                  />
                </div>

                {/* Genres */}
                <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                      <Badge
                        key={genre.id}
                        variant={selectedGenres.includes(genre.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleGenre(genre.id)}
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'popularity' | 'rating' | 'release_date')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popularity">Most Popular</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="release_date">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMediaType('all');
                    setYearRange([1900, new Date().getFullYear()]);
                    setRatingRange([0, 10]);
                    setSelectedGenres([]);
                    setSortBy('popularity');
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="media-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredResults && filteredResults.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Found {filteredResults.length} results
            </p>
            <div className="media-grid">
              {filteredResults.map((media) => (
                <MediaCard key={`${media.id}-${media.media_type}`} media={media} />
              ))}
            </div>
          </>
        ) : query ? (
          <div className="text-center py-16 text-muted-foreground">
            No results found. Try adjusting your filters.
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            Enter a search query to get started
          </div>
        )}
      </div>
    </>
  );
}
