import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronLeft, ExternalLink, BedDouble, Film } from "lucide-react";
import SEO from "@/components/SEO";
import { FilmingLocationsMap } from "@/components/FilmingLocationsMap";
import { getFilmingLocation } from "@/lib/filmingLocations";
import { getMovieDetails, getTVDetails, getMediaTitle, getImageUrl } from "@/services/tmdb";
import { Image } from "@/components/ui/Image";
import type { Media } from "@/types/media";
import { getEnrichedFilmingLocations } from "@/services/filmingLocations";
import {
  getExpediaAffiliateUrl,
  getLocationDistanceContext,
  getPrimaryVisitUrl,
  getTripAdvisorAffiliateUrl,
} from "@/lib/travelAffiliate";
import {
  buildCanonicalUrl,
  buildMediaPath,
  toBreadcrumbJsonLd,
} from "@/lib/seo";

export default function LocationDetails() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const mediaType: "movie" | "tv" = location.pathname.startsWith("/tv") ? "tv" : "movie";
  const mediaId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ["location-details", mediaType, mediaId],
    queryFn: () => (mediaType === "movie" ? getMovieDetails(mediaId) : getTVDetails(mediaId)),
    enabled: Number.isFinite(mediaId) && mediaId > 0,
  });

  const title = data ? getMediaTitle(data) : "";

  const { data: enrichedLocations = [] } = useQuery({
    queryKey: ["enriched-filming-locations", mediaType, mediaId, title],
    queryFn: () =>
      getEnrichedFilmingLocations({
        mediaType,
        mediaId,
        title,
        media: data as Media,
      }),
    enabled: !!data,
  });

  if (isLoading || !data) {
    return <div className="page-container pt-20 text-sm text-muted-foreground">Loading filming locations...</div>;
  }

  const filmingLocation = enrichedLocations[0] || getFilmingLocation(data as Media);
  const seoTitle = `Filming Locations for ${title} | CineTrekker`;
  const detailsPath = buildMediaPath(mediaType, mediaId, title);
  const canonical = buildCanonicalUrl(`/${mediaType}/${mediaId}/locations`);

  return (
    <>
      <SEO
        title={seoTitle}
        description={`Explore filming locations, route stops, and cinematic geography for ${title} on CineTrekker.`}
        canonical={canonical}
        keywords={`${title}, filming locations, ${filmingLocation.country}, movie travel, cine tourism`}
        type={mediaType === "movie" ? "video.movie" : "video.tv_show"}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: title, path: detailsPath },
            { name: "Filming locations", path: `/${mediaType}/${mediaId}/locations` },
          ]),
        ]}
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <Link
          to={detailsPath}
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to details
        </Link>

        <div className="mb-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <Image
              src={getImageUrl(data.poster_path, "w342")}
              alt={`${title} filming locations poster for movie tracker`}
              width={342}
              height={513}
              loading="eager"
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="heading-credits text-sm text-[#f2c572]">Location Explorer</p>
            <h1 className="heading-credits mt-2 text-5xl text-white md:text-6xl">{title}</h1>
            <p className="editorial-copy mt-3 text-sm text-white/75 md:text-base">
              Discover where this story came to life and map the cinematic stops.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f2c572]/35 bg-[#1b1408] px-3 py-1.5 text-xs text-[#f2c572]">
              <MapPin className="h-3.5 w-3.5" />
              {filmingLocation.label}
            </div>
          </div>
        </div>

        <FilmingLocationsMap
          points={enrichedLocations.map((location, index) => ({
            id: `${mediaId}-${index}`,
            title,
            ...location,
          }))}
        />

        <section className="mt-6 space-y-3">
          {enrichedLocations.map((location, index) => (
            <article
              key={`${location.label}-${index}`}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="heading-credits text-2xl text-white">{location.label}</p>
                  <p className="mt-1 text-xs text-white/65">{location.scene}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/55">
                    Source: {location.source === "curated" ? "Curated" : location.source === "shotonwhat" ? "External dataset" : "Estimated fallback"}
                  </p>
                  <p className="mt-1 text-xs text-[#f2c572]">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="w-full md:min-w-[260px] md:max-w-[360px] rounded-lg border border-[#f2c572]/25 bg-[#171108] p-3">
                  <div className="flex items-center gap-2 text-[#f7d499]">
                    <BedDouble className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.08em]">Visit this Location</p>
                  </div>
                  <p className="mt-2 text-xs text-white/75">{getLocationDistanceContext(location)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={getPrimaryVisitUrl(location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-[#f2c572]/35 bg-[#24180a] px-3 py-1.5 text-xs text-[#f7d499] hover:bg-[#2f1f0d]"
                    >
                      Visit this Location
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={getTripAdvisorAffiliateUrl(location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
                    >
                      TripAdvisor
                    </a>
                    <a
                      href={getExpediaAffiliateUrl(location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
                    >
                      Expedia
                    </a>
                  </div>
                </div>
              </div>

              {location.trivia.length > 0 && (
                <div className="mt-4 rounded-lg border border-[#f2c572]/20 bg-gradient-to-br from-[#1f1609] via-[#140f07] to-[#0f0b06] p-3">
                  <div className="mb-2 inline-flex items-center gap-2 text-[#f4ca83]">
                    <Film className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.1em]">Behind the Scenes Trivia</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {location.trivia.map((fact, triviaIndex) => (
                      <p
                        key={`${location.label}-trivia-${triviaIndex}`}
                        className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-xs leading-relaxed text-white/80"
                      >
                        {fact}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
