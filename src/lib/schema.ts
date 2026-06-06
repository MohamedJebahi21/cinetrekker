import { Media } from "@/types/media";
import {
  buildCanonicalUrl,
  sanitizeExternalImageUrl,
  sanitizeJsonLd,
  sanitizeMetaText,
} from "@/lib/seo";

export function mediaToJsonLd(media: Media) {
  const isMovie =
    media.media_type === "movie" ||
    (media as Media & { title?: string }).title != null;
  const title = isMovie
    ? (media as Media & { title?: string }).title
    : (media as Media & { name?: string }).name;
  const url = buildCanonicalUrl(`/${isMovie ? "movie" : "tv"}/${media.id}`);
  const image = media.poster_path
    ? sanitizeExternalImageUrl(`https://image.tmdb.org/t/p/w500${media.poster_path}`)
    : undefined;

  return sanitizeJsonLd({
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name: sanitizeMetaText(title || "Untitled", 180),
    url,
    image,
    description: media.overview ? sanitizeMetaText(media.overview, 500) : undefined,
    datePublished: media.release_date || media.first_air_date || undefined,
    aggregateRating: media.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: media.vote_average.toString(),
          ratingCount: media.vote_count?.toString() || undefined,
        }
      : undefined,
  });
}

export function websiteJsonLd({
  name = "CineTrekker",
  url = buildCanonicalUrl("/"),
  description = "Track movies and TV shows you love with a structured movie tracker.",
  logo = buildCanonicalUrl("/favicon.ico"),
  alternateName = ["Cine Trekker", "CineTrekker Movie Tracker"],
} = {}) {
  return sanitizeJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    name,
    alternateName,
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
