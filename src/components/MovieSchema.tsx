import React from 'react';

interface MovieSchemaProps {
  title: string;
  description?: string;
  image?: string;
}

export default function MovieSchema({ title, description, image }: MovieSchemaProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title,
    description: description || undefined,
    image: image || undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
