import React from 'react';

interface MovieSchemaProps {
  title: string;
  description?: string;
  image?: string;
  releaseDate?: string;
  rating?: number;
  ratingCount?: number;
  url?: string;
}

export default function MovieSchema({
  title,
  description,
  image,
  releaseDate,
  rating,
  ratingCount,
  url,
}: MovieSchemaProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title,
    description: description || undefined,
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
