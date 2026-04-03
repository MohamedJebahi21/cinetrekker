import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Calendar, MapPin, Film, Tv } from "lucide-react";
import { getPersonDetails, getImageUrl } from "@/services/tmdb";
import { MediaCard } from "@/components/MediaCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { buildCanonicalUrl, buildPersonPath, toBreadcrumbJsonLd } from "@/lib/seo";

export default function Person() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const personId = parseInt(id || "0", 10);

  const { data: person, isLoading, isError, error } = useQuery({
    queryKey: ["person", personId, language],
    queryFn: () => getPersonDetails(personId, language),
    enabled: !!personId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="page-container pb-24 pt-6 md:pb-0">
          <div className="mb-12 flex flex-col gap-8 md:flex-row">
            </div>
            <div className="flex-1 space-y-4">
              <div className="h-8 w-3/4 rounded skeleton-shimmer" />
              <div className="h-4 w-1/2 rounded skeleton-shimmer" />
              <div className="h-24 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !person) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-lg text-muted-foreground">{t("common.error")}</p>
        {error ? (
          <p className="mt-2 text-sm text-destructive">
            {(error as Error).message}
          </p>
        ) : null}
      </div>
    );
  }

  const movies =
    person.combined_credits?.cast
      ?.filter((credit) => credit.media_type === "movie")
      .sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20) || [];

  const tvShows =
    person.combined_credits?.cast
      ?.filter((credit) => credit.media_type === "tv")
      .sort((a, b) => {
        const dateA = a.first_air_date ? new Date(a.first_air_date).getTime() : 0;
        const dateB = b.first_air_date ? new Date(b.first_air_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20) || [];

  const profileUrl = getImageUrl(person.profile_path, "w500");
  const profileSrcSet = person.profile_path
    ? `${getImageUrl(person.profile_path, "w185")} 185w, ${getImageUrl(person.profile_path, "w342")} 342w, ${getImageUrl(person.profile_path, "w500")} 500w`
    : undefined;
  const birthYear = person.birthday
    ? new Date(person.birthday).getFullYear()
    : null;
  const deathYear = person.deathday
    ? new Date(person.deathday).getFullYear()
    : null;
  const personPath = buildPersonPath(personId, person.name);

  return (
    <>
      <SEO
        title={`${person.name} | CineTrekker`}
        description={
          person.biography
            ? person.biography.slice(0, 160)
            : `View ${person.name}'s filmography and biography.`
        }
        image={profileUrl}
        canonical={buildCanonicalUrl(personPath)}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "People", path: "/search?type=person" },
            { name: person.name, path: personPath },
          ]),
        ]}
      />

      <div className="min-h-screen pt-16">
        <div className="page-container pb-24 pt-6 md:pb-0">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary md:hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("nav.home")}
          </Link>

          <div className="mb-12 flex flex-col gap-8 md:flex-row">
            <div className="mx-auto flex-shrink-0 md:mx-0">
              {profileUrl ? (
                <Image
                  src={profileUrl}
                  srcSet={profileSrcSet}
                  sizes="(max-width: 768px) 192px, 256px"
                  alt={`${person.name} profile photo`}
                  width={500}
                  height={750}
                  className="w-48 rounded-xl shadow-2xl md:w-64"
                  showSkeleton
                />
              ) : (
                <div className="flex aspect-[2/3] w-48 items-center justify-center rounded-xl bg-muted md:w-64">
                  <span className="text-4xl text-muted-foreground">
                    {person.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <h1 className="text-3xl font-bold md:text-4xl">{person.name}</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                Explore cast credits, recent filmography, and biography details
                for {person.name}. This page connects performer discovery with
                CineTrekker movie tracker pages so you can move from a person
                profile into saved titles and related viewing paths quickly.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {person.known_for_department ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {person.known_for_department}
                  </span>
                ) : null}
                {birthYear ? (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {birthYear}
                    {deathYear ? ` - ${deathYear}` : ""}
                  </div>
                ) : null}
                {person.place_of_birth ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {person.place_of_birth}
                  </div>
                ) : null}
              </div>

              {person.biography ? (
                <section>
                  <h2 className="mb-2 text-lg font-semibold">
                    {t("person.biography")}
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    {person.biography}
                  </p>
                </section>
              ) : null}
            </div>
          </div>

          {movies.length > 0 || tvShows.length > 0 ? (
            <Tabs defaultValue="movies" className="mb-12">
              <TabsList className="mb-6">
                <TabsTrigger value="movies" className="gap-2">
                  <Film className="h-4 w-4" />
                  {t("person.movies")} ({movies.length})
                </TabsTrigger>
                <TabsTrigger value="tv" className="gap-2">
                  <Tv className="h-4 w-4" />
                  {t("person.tvSeries")} ({tvShows.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                {movies.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {movies.map((movie) => (
                      <MediaCard
                        key={`movie-${movie.id}-${movie.credit_id}`}
                        media={{ ...movie, media_type: "movie" }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    {t("person.noMovies")}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="tv">
                {tvShows.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {tvShows.map((show) => (
                      <MediaCard
                        key={`tv-${show.id}-${show.credit_id}`}
                        media={{ ...show, media_type: "tv" }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    {t("person.noTvSeries")}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">{t("person.noCredits")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
