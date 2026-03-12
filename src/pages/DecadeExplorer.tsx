import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { discoverMovies, discoverTV } from "@/services/tmdb";
import { MediaCard, MediaCardSkeleton } from "@/components/MediaCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";

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
  const { i18n } = useTranslation();
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
        title="Explore by Decade — CineTrekker"
        description="Discover movies and TV shows from different eras"
        canonical="https://cinetrekker.vercel.app/decades"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-8 w-8" />
          <h1 className="section-title mb-0">Explore by Decade</h1>
        </div>

        <Tabs
          value={mediaType}
          onValueChange={(v) => setMediaType(v as "movie" | "tv")}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="movie">Movies</TabsTrigger>
            <TabsTrigger value="tv">TV Shows</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Decade Selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DECADES.map((decade) => (
            <Badge
              key={decade.value}
              variant={
                selectedDecade.value === decade.value ? "default" : "outline"
              }
              className="cursor-pointer text-base py-2 px-4 hover:bg-primary/10 transition-colors"
              style={{ minWidth: "44px", minHeight: "44px" }} // Ensure 44px hit area
              onClick={() => setSelectedDecade(decade)}
            >
              {decade.label}
            </Badge>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-4">
          {selectedDecade.label} {mediaType === "movie" ? "Movies" : "TV Shows"}
        </h2>

        {isLoading ? (
          <div className="media-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : media && media.length > 0 ? (
          <div className="media-grid">
            {media.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No results available for this decade
          </div>
        )}
      </div>
    </>
  );
}
