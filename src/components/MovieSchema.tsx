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
