import React, { useEffect, useId } from "react";
import { sanitizeJsonLd, sanitizeMetaText } from "@/lib/seo";

interface MovieSchemaProps {
  schemaType?: "Movie" | "TVSeries";
  title: string;
  description?: string;
  image?: string;
  releaseDate?: string;
  rating?: number;
  ratingCount?: number;
  url?: string;
  genres?: string[];
  actors?: Array<{ name: string; image?: string }>;
  directors?: Array<{ name: string }>;
  creators?: Array<{ name: string }>;
  duration?: number; // in minutes
}

export default function MovieSchema({
  schemaType = "Movie",
  title,
  description,
  image,
  releaseDate,
  rating,
  ratingCount,
  url,
  genres,
  actors,
  directors,
  creators,
  duration,
}: MovieSchemaProps) {
  const id = useId().replace(/:/g, "-");
  const jsonLd = sanitizeJsonLd({
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: sanitizeMetaText(title, 180),
    description: description ? sanitizeMetaText(description, 500) : undefined,
    image: image || undefined,
    url: url || undefined,
    datePublished: releaseDate || undefined,
    genre: genres && genres.length > 0 ? genres : undefined,
    actor: actors && actors.length > 0
      ? actors.map(a => ({
          '@type': 'Person',
          name: a.name,
          image: a.image || undefined
        }))
      : undefined,
    director: directors && directors.length > 0
      ? directors.map(d => ({
          '@type': 'Person',
          name: d.name
        }))
      : undefined,
    creator: creators && creators.length > 0
      ? creators.map(c => ({
          '@type': 'Person',
          name: c.name
        }))
      : undefined,
    duration: duration ? `PT${duration}M` : undefined,
    aggregateRating:
      typeof rating === 'number' && Number.isFinite(rating)
        ? {
            '@type': 'AggregateRating',
            ratingValue: rating.toFixed(1),
            bestRating: '10',
            ratingCount:
              typeof ratingCount === 'number' && Number.isFinite(ratingCount)
                ? Math.max(1, Math.floor(ratingCount))
                : 1,
          }
        : undefined,
  });

  useEffect(() => {
    const scriptId = `movie-schema-${id}`;
    const existing = document.getElementById(scriptId);
    existing?.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.dataset.cinetrekkerJsonld = "true";
    script.text = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
    document.head.appendChild(script);

    return () => script.remove();
  }, [id, jsonLd]);

  return null;
}
