import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Compass } from "lucide-react";
import {
  getMovieGenres,
  getTVGenres,
  discoverMovies,
  discoverTV,
} from "@/services/tmdb";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { buildCanonicalUrl, toBreadcrumbJsonLd } from "@/lib/seo";

export default function GenreBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  const selectedGenre = searchParams.get("genre");
  const mediaType = (searchParams.get("type") as "movie" | "tv") || "movie";

  const { data: movieGenres } = useQuery({
    queryKey: ["movie-genres", language],
    queryFn: () => getMovieGenres(language),
  });

  const { data: tvGenres } = useQuery({
    queryKey: ["tv-genres", language],
    queryFn: () => getTVGenres(language),
  });

  const { data: genreMedia, isLoading } = useQuery({
    queryKey: ["genre-media", selectedGenre, mediaType, language, includeAdult],
    queryFn: async () => {
      if (!selectedGenre) return null;
      const results =
        mediaType === "movie"
          ? await discoverMovies(
              {
                with_genres: selectedGenre,
                include_adult: includeAdult ? "true" : "false",
              },
              language,
            )
          : await discoverTV(
              {
                with_genres: selectedGenre,
                include_adult: includeAdult ? "true" : "false",
              },
              language,
            );
      return applySafetyFilter(
        results.results.map((item) => ({ ...item, media_type: mediaType })),
        strictFiltering,
        moderateFiltering,
      );
    },
    enabled: !!selectedGenre,
  });

  const genres = mediaType === "movie" ? movieGenres?.genres : tvGenres?.genres;
  const selectedGenreObj = genres?.find((genre) => genre.id.toString() === selectedGenre);

  return (
    <>
      <SEO
        title={t("genres.seoTitle", "Browse by Genre - CineTrekker")}
        description={t(
          "genres.seoDescription",
          "Discover movies and TV shows by genre on CineTrekker, with curated discovery paths for action, drama, comedy, thriller, and more.",
        )}
        keywords={t(
          "genres.seoKeywords",
          "movie genres, tv genres, browse by genre, action movies, comedy movies, thriller series, cineTrekker discovery",
        )}
        canonical={buildCanonicalUrl("/genres")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
            { name: t("nav.genres", "Genres"), path: "/genres" },
          ]),
        ]}
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <section className="ct-panel-strong mb-8 overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Compass className="h-6 w-6" />
            </span>
            <div>
              <p className="ct-kicker mb-3">
                {t("genres.kicker", "Genre-driven discovery")}
              </p>
              <h1 className="section-title mb-3">
                {t("genres.title", "Browse by Genre")}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {t(
                  "genres.intro",
                  "Find your next watch by exploring genre-specific collections for both movies and TV shows. Select a genre to view popular titles and quickly jump from discovery to watchlist planning.",
                )}
              </p>
            </div>
          </div>
        </section>

        <Tabs
          value={mediaType}
          onValueChange={(value) =>
            setSearchParams({ type: value, genre: selectedGenre || "" })
          }
        >
          <TabsList className="mb-6">
            <TabsTrigger value="movie">{t("common.movies", "Movies")}</TabsTrigger>
            <TabsTrigger value="tv">{t("common.tvShows", "TV Shows")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <section className="ct-panel mb-8 p-4 md:p-5">
          <p className="mb-3 text-sm font-medium text-foreground">
            {t("genres.pickGenre", "Pick a genre to open a focused collection")}
          </p>
          <div className="flex flex-wrap gap-2">
            {genres?.map((genre) => (
              <Badge
                key={genre.id}
                variant={selectedGenre === genre.id.toString() ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-primary/10"
                role="button"
                tabIndex={0}
                aria-pressed={selectedGenre === genre.id.toString()}
                onClick={() =>
                  setSearchParams({ type: mediaType, genre: genre.id.toString() })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSearchParams({ type: mediaType, genre: genre.id.toString() });
                  }
                }}
              >
                {genre.name}
              </Badge>
            ))}
          </div>
        </section>

        {selectedGenreObj ? (
          <>
            <h2 className="mb-4 text-2xl font-bold">
              {selectedGenreObj.name}{" "}
              {mediaType === "movie"
                ? t("common.movies", "Movies")
                : t("common.tvShows", "TV Shows")}
            </h2>

            {isLoading ? (
              <div className="media-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <MediaCardSkeleton key={index} />
                ))}
              </div>
            ) : genreMedia && genreMedia.length > 0 ? (
              <div className="media-grid">
                {genreMedia.map((media) => (
                  <MediaCard key={media.id} media={media} />
                ))}
              </div>
            ) : (
              <div className="ct-panel py-16 text-center text-muted-foreground">
                {t("genres.noResults", "No results available for this genre.")}
              </div>
            )}
          </>
        ) : (
          <div className="ct-panel py-16 text-center text-muted-foreground">
            {t("genres.selectPrompt", "Select a genre above to browse content")}
          </div>
        )}
      </div>
    </>
  );
}
