import { Media } from "@/types/media";
import {
  buildCanonicalUrl,
  buildMediaPath,
  sanitizeExternalImageUrl,
  sanitizeJsonLd,
  sanitizeMetaText,
} from "@/lib/seo";

/**
 * Create a richer Movie or TVSeries JSON-LD schema.
 * Supports genre, director, actor, contentRating, duration fields.
 */
export function mediaToJsonLd(
  media: Media & {
    credits?: {
      cast?: Array<{ name: string; id?: number; character?: string }>;
      crew?: Array<{ name: string; id?: number; job?: string; department?: string }>;
    };
    genres?: Array<{ id: number; name: string }>;
    runtime?: number;
    episode_run_time?: number[];
    status?: string;
    tagline?: string;
    vote_count?: number;
  },
) {
  const isMovie =
    media.media_type === "movie" ||
    (media as Media & { title?: string }).title != null;
  const title = isMovie
    ? (media as Media & { title?: string }).title
    : (media as Media & { name?: string }).name;
  const slugTitle = title || "";
  const id = media.id;
  const url = buildCanonicalUrl(buildMediaPath(isMovie ? "movie" : "tv", id, slugTitle));
  const image = media.poster_path
    ? sanitizeExternalImageUrl(`https://image.tmdb.org/t/p/w500${media.poster_path}`)
    : undefined;

  // Genres
  const genres = (media.genres || [])
    .filter((g) => g?.name)
    .map((g) => g.name);

  // Directors
  const directors =
    media.credits?.crew
      ?.filter((c) => c.job === "Director" && c.name)
      .map((c) => ({
        "@type": "Person" as const,
        name: sanitizeMetaText(c.name, 120),
      })) || [];

  // Top 5 cast members
  const actors =
    media.credits?.cast
      ?.slice(0, 5)
      .filter((c) => c.name)
      .map((c) => ({
        "@type": "Person" as const,
        name: sanitizeMetaText(c.name, 120),
        ...(c.character
          ? { characterName: sanitizeMetaText(c.character, 120) }
          : {}),
      })) || [];

  // Content rating (from release_dates or content_ratings)
  let contentRating: string | undefined;
  const releaseDates = (media as unknown as Record<string, unknown>).release_dates as
    | { results?: Array<{ iso_3166_1?: string; release_dates?: Array<{ certification?: string }> }> }
    | undefined;
  if (releaseDates?.results) {
    const usRating = releaseDates.results
      .find((r) => r.iso_3166_1 === "US")
      ?.release_dates?.find((d) => d.certification)
      ?.certification;
    if (usRating) contentRating = usRating;
  }
  if (!contentRating) {
    const contentRatings = (media as unknown as Record<string, unknown>).content_ratings as
      | { results?: Array<{ iso_3166_1?: string; rating?: string }> }
      | undefined;
    if (contentRatings?.results) {
      const usRating = contentRatings.results.find((r) => r.iso_3166_1 === "US")?.rating;
      if (usRating) contentRating = usRating;
    }
  }

  // Duration in minutes
  const durationMin = media.runtime || media.episode_run_time?.[0];

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name: sanitizeMetaText(slugTitle || "Untitled", 180),
    url,
    image,
    description: media.overview
      ? sanitizeMetaText(media.overview, 500)
      : undefined,
    datePublished: media.release_date || media.first_air_date || undefined,
    genre: genres.length > 0 ? genres : undefined,
  };

  // Add aggregateRating only if we have valid data
  if (media.vote_average != null && media.vote_average > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: media.vote_average.toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: media.vote_count?.toString() || "1",
    };
  }

  // Add director(s) for movies
  if (isMovie && directors.length > 0) {
    schema.director = directors.length === 1 ? directors[0] : directors;
  }

  // Add actors
  if (actors.length > 0) {
    schema.actor = actors;
  }

  // Add content rating
  if (contentRating) {
    schema.contentRating = contentRating;
  }

  // Add duration
  if (durationMin) {
    schema.duration = `PT${durationMin}M`;
  }

  // Add tagline as alternateName
  if (media.tagline) {
    schema.alternateName = sanitizeMetaText(media.tagline, 180);
  }

  return sanitizeJsonLd(schema);
}

export function websiteJsonLd({
  name = "CineTrekker",
  url = buildCanonicalUrl("/"),
  description = "Track movies and TV shows you love with a structured movie tracker.",
  logo = buildCanonicalUrl("/favicon.ico"),
} = {}) {
  return sanitizeJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    name,
    alternateName: ["Cine Trekker"],
    url,
    description,
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      "@id": `${url}#organization`,
      name,
      url,
      logo: {
        "@type": "ImageObject",
        url: logo,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildCanonicalUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });
}