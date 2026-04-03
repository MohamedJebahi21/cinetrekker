import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getMovieGenres, getTVGenres, discoverMovies, discoverTV } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/SEO';
import { useContentPolicy } from '@/contexts/content-policy-context';
import { applySafetyFilter } from '@/lib/contentFilter';

export default function GenreBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
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
    queryKey: ['genre-media', selectedGenre, mediaType, language, includeAdult],
    queryFn: async () => {
      if (!selectedGenre) return null;
      const results =
        mediaType === 'movie'
          ? await discoverMovies({ with_genres: selectedGenre, include_adult: includeAdult ? 'true' : 'false' }, language)
          : await discoverTV({ with_genres: selectedGenre, include_adult: includeAdult ? 'true' : 'false' }, language);
      return applySafetyFilter(
        results.results.map((item) => ({ ...item, media_type: mediaType })),
        strictFiltering,
        moderateFiltering,
      );
    },
    enabled: !!selectedGenre,
  });

  const genres = mediaType === 'movie' ? movieGenres?.genres : tvGenres?.genres;
  const selectedGenreObj = genres?.find((g) => g.id.toString() === selectedGenre);

  return (
    <>
      <SEO
        title={t("genres.seoTitle", "Browse by Genre — CineTrekker")}
        description={t("genres.seoDescription", "Explore movies and TV shows by genre")}
        canonical="https://cinetrekker.vercel.app/genres"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">{t("genres.title", "Browse by Genre")}</h1>

        <Tabs value={mediaType} onValueChange={(v) => setSearchParams({ type: v, genre: selectedGenre || '' })}>
          <TabsList className="mb-6">
            <TabsTrigger value="movie">{t("common.movies", "Movies")}</TabsTrigger>
            <TabsTrigger value="tv">{t("common.tvShows", "TV Shows")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Genre Grid */}
        <div className="flex flex-wrap gap-2 mb-8">
          {genres?.map((genre) => (
            <Badge
              key={genre.id}
              variant={selectedGenre === genre.id.toString() ? 'default' : 'outline'}
              className="cursor-pointer text-sm py-2 px-4 hover:bg-primary/10 transition-colors"
              role="button"
              tabIndex={0}
              aria-pressed={selectedGenre === genre.id.toString()}
              onClick={() => setSearchParams({ type: mediaType, genre: genre.id.toString() })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSearchParams({ type: mediaType, genre: genre.id.toString() });
                }
              }}
            >
              {genre.name}
            </Badge>
          ))}
        </div>

        {/* Results */}
        {selectedGenreObj && (
          <>
            <h2 className="text-2xl font-bold mb-4">
              {selectedGenreObj.name} {mediaType === 'movie' ? t("common.movies", "Movies") : t("common.tvShows", "TV Shows")}
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
                {t("genres.noResults", "No results available for this genre.")}
              </div>
            )}
          </>
        )}

        {!selectedGenre && (
          <div className="text-center py-16 text-muted-foreground">
            {t("genres.selectPrompt", "Select a genre above to browse content")}
          </div>
        )}
      </div>
    </>
  );
}

