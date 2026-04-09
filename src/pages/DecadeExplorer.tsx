import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { discoverMovies, discoverTV } from "@/services/tmdb";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { buildCanonicalUrl, toBreadcrumbJsonLd } from "@/lib/seo";

const DECADES = [
  { value: "2020", label: "2020s", start: 2020, end: 2029 },
  { value: "2010", label: "2010s", start: 2010, end: 2019 },
  { value: "2000", label: "2000s", start: 2000, end: 2009 },
  { value: "1990", label: "1990s", start: 1990, end: 1999 },
  { value: "1980", label: "1980s", start: 1980, end: 1989 },
  { value: "1970", label: "1970s", start: 1970, end: 1979 },
  { value: "1960", label: "1960s", start: 1960, end: 1969 },
  { value: "1950", label: "1950s", start: 1950, end: 1959 },
  { value: "1940", label: "Classic (Pre-1950)", start: 1900, end: 1949 },
];

export default function DecadeExplorer() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;
  const [selectedDecade, setSelectedDecade] = useState(DECADES[0]);
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");

  const { data: media, isLoading } = useQuery({
    queryKey: [
      "decade-media",
      selectedDecade.value,
      mediaType,
      language,
      includeAdult,
    ],
    queryFn: async () => {
      const results =
        mediaType === "movie"
          ? await discoverMovies(
              {
                primary_release_date_gte: `${selectedDecade.start}-01-01`,
                primary_release_date_lte: `${selectedDecade.end}-12-31`,
                sort_by: "popularity.desc",
                include_adult: includeAdult ? "true" : "false",
              },
              language,
            )
          : await discoverTV(
              {
                first_air_date_gte: `${selectedDecade.start}-01-01`,
                first_air_date_lte: `${selectedDecade.end}-12-31`,
                sort_by: "popularity.desc",
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
  });

  return (
    <>
      <SEO
        title={t("decades.seoTitle", "Explore by Decade - CineTrekker")}
        description={t(
          "decades.seoDescription",
          "Explore movies and TV shows by decade on CineTrekker, from modern releases to classic cinema eras.",
        )}
        keywords={t(
          "decades.seoKeywords",
          "movies by decade, tv shows by decade, classic films, 1990s movies, 2000s movies, CineTrekker decades",
        )}
        canonical={buildCanonicalUrl("/decades")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
            { name: t("nav.decades", "Decades"), path: "/decades" },
          ]),
        ]}
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <section className="ct-panel-strong mb-8 overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Calendar className="h-6 w-6" />
            </span>
            <div>
              <p className="ct-kicker mb-3">
                {t("decades.kicker", "Browse by era")}
              </p>
              <h1 className="section-title mb-3">
                {t("decades.title", "Explore by Decade")}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {t(
                  "decades.intro",
                  "Travel through film and TV history decade by decade. Switch eras to surface standout titles and compare how storytelling trends evolved over time.",
                )}
              </p>
            </div>
          </div>
        </section>

        <Tabs
          value={mediaType}
          onValueChange={(value) => setMediaType(value as "movie" | "tv")}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="movie">{t("common.movies", "Movies")}</TabsTrigger>
            <TabsTrigger value="tv">{t("common.tvShows", "TV Shows")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <section className="ct-panel mb-8 p-4 md:p-5">
          <p className="mb-3 text-sm font-medium text-foreground">
            {t("decades.pickEra", "Choose an era to open its collection")}
          </p>
          <div className="flex flex-wrap gap-2">
            {DECADES.map((decade) => (
              <Badge
                key={decade.value}
                variant={selectedDecade.value === decade.value ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-base transition-colors hover:bg-primary/10"
                style={{ minWidth: "44px", minHeight: "44px" }}
                role="button"
                tabIndex={0}
                aria-pressed={selectedDecade.value === decade.value}
                onClick={() => setSelectedDecade(decade)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDecade(decade);
                  }
                }}
              >
                {decade.label}
              </Badge>
            ))}
          </div>
        </section>

        <h2 className="mb-4 text-2xl font-bold">
          {selectedDecade.label}{" "}
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
        ) : media && media.length > 0 ? (
          <div className="media-grid">
            {media.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </div>
        ) : (
          <div className="ct-panel py-16 text-center text-muted-foreground">
            {t("decades.noResults", "No results available for this decade")}
          </div>
        )}
      </div>
    </>
  );
}
