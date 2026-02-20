import React from 'react';
import SEO from '@/components/SEO';

export default function About() {
  return (
    <div className="page-container pt-20 pb-24 md:pb-0">
      <SEO title="About — CineTrekker" description="About CineTrekker" />
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="section-title">About CineTrekker</h1>
        <p className="text-muted-foreground mt-4">
          CineTrekker helps you discover, track, and organize movies and TV shows you love.
        </p>
      </div>
    </div>
  );
}
