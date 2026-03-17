import { Media } from "@/types/media";

export function mediaToJsonLd(media: Media) {
  const isMovie =
    media.media_type === "movie" ||
    (media as Media & { title?: string }).title != null;
  const title = isMovie
    ? (media as Media & { title?: string }).title
    : (media as Media & { name?: string }).name;
  const url = `https://cinetrekker.vercel.app/${isMovie ? "movie" : "tv"}/${media.id}`;
  const image = media.poster_path
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name: title,
    url,
    image,
    description: media.overview || undefined,
    datePublished: media.release_date || media.first_air_date || undefined,
    aggregateRating: media.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: media.vote_average.toString(),
          ratingCount: media.vote_count?.toString() || undefined,
        }
      : undefined,
  };
}

export function websiteJsonLd({
  name = "CineTrekker",
  url = "https://cinetrekker.vercel.app",
  description = "Track movies and TV shows you love",
  logo = "https://cinetrekker.vercel.app/favicon.ico",
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    publisher: {
      "@type": "Organization",
      name,
      logo: {
        "@type": "ImageObject",
        url: logo,
      },
    },
  };
}
