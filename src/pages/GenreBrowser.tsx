import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getMovieGenres, getTVGenres, discoverMovies, discoverTV } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/SEO';

export default function GenreBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const language = i18n.language;

  const selectedGenre = searchParams.get('genre');
  const mediaType = (searchParams.get('type') as 'movie' | 'tv') || 'movie';

  const { data: movieGenres } = useQuery({
    queryKey: ['movie-genres', language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ['tv-genres', language],
    queryFn: () => getTVGenres(language),
  });

  const { data: genreMedia, isLoading } = useQuery({
    queryKey: ['genre-media', selectedGenre, mediaType, language],
    queryFn: async () => {
      if (!selectedGenre) return null;
      const results =
        mediaType === 'movie'
          ? await discoverMovies({ with_genres: selectedGenre })
          : await discoverTV({ with_genres: selectedGenre });
      return results.results.map((item) => ({ ...item, media_type: mediaType }));
    },
    enabled: !!selectedGenre,
  });

  const genres = mediaType === 'movie' ? movieGenres?.genres : tvGenres?.genres;
  const selectedGenreObj = genres?.find((g) => g.id.toString() === selectedGenre);

  return (
    <>
      <SEO
        title={`Browse by Genre — CineTrekker`}
        description="Explore movies and TV shows by genre"
        canonical="https://cinetrekker.vercel.app/genres"
      />
      <div className="page-container pt-20">
        <h1 className="section-title">Browse by Genre</h1>

        <Tabs value={mediaType} onValueChange={(v) => setSearchParams({ type: v, genre: selectedGenre || '' })}>
          <TabsList className="mb-6">
            <TabsTrigger value="movie">Movies</TabsTrigger>
            <TabsTrigger value="tv">TV Shows</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Genre Grid */}
        <div className="flex flex-wrap gap-2 mb-8">
          {genres?.map((genre) => (
            <Badge
              key={genre.id}
              variant={selectedGenre === genre.id.toString() ? 'default' : 'outline'}
              className="cursor-pointer text-sm py-2 px-4 hover:bg-primary/10 transition-colors"
              onClick={() => setSearchParams({ type: mediaType, genre: genre.id.toString() })}
            >
              {genre.name}
            </Badge>
          ))}
        </div>

        {/* Results */}
        {selectedGenreObj && (
          <>
            <h2 className="text-2xl font-bold mb-4">
              {selectedGenreObj.name} {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
            </h2>

            {isLoading ? (
              <div className="media-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <MediaCardSkeleton key={i} />
                ))}
              </div>
            ) : genreMedia && genreMedia.length > 0 ? (
              <div className="media-grid">
                {genreMedia.map((media) => (
                  <MediaCard key={media.id} media={media} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                No results found for this genre.
              </div>
            )}
          </>
        )}

        {!selectedGenre && (
          <div className="text-center py-16 text-muted-foreground">
            Select a genre above to browse content
          </div>
        )}
      </div>
    </>
  );
}
