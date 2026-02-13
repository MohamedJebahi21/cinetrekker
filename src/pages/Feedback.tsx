import React from 'react';
import SEO from '@/components/SEO';

export default function Feedback() {
  return (
    <div className="page-container pt-20">
      <SEO title="Feedback — CineTrekker" description="Send feedback to CineTrekker" />
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="section-title">Feedback</h1>
        <p className="text-muted-foreground mt-4">We'd love to hear your feedback. Open an issue or send us a message.</p>
      </div>
    </div>
  );
}
