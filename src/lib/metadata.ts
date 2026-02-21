export const siteMetadata = {
  siteName: 'CineTrekker',
  title: 'CineTrekker | Track Movies & TV Shows',
  description:
    'Track movies and TV shows with CineTrekker: build watchlists, mark progress, discover trending titles, and get personalized recommendations in one place.',
  canonical: 'https://cinetrekker.vercel.app',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cinetrekker.vercel.app',
    title: 'CineTrekker | Track Movies & TV Shows',
    description:
      'Track movies and TV shows, manage watchlists, and discover personalized recommendations with CineTrekker.',
    images: ['https://cinetrekker.vercel.app/ct-icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineTrekker | Track Movies & TV Shows',
    description:
      'Track movies and TV shows, manage watchlists, and discover personalized recommendations with CineTrekker.',
    image: 'https://cinetrekker.vercel.app/ct-icon.png',
    imageAlt: 'CineTrekker branding image',
  },
} as const;

export type SiteMetadata = typeof siteMetadata;