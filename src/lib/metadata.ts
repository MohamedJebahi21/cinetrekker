export const siteMetadata = {
  siteName: "CineTrekker",
  title: "CineTrekker Movie Tracker | Track Movies, TV Shows, and Watchlists",
  description:
    "CineTrekker is a movie tracker for building watchlists, tracking movies and TV shows, discovering trending titles, and following updates from one fast, mobile-friendly hub.",
  canonical: "https://cinetrekker.vercel.app",
  keywords:
    "movie tracker, tv show tracker, watchlist app, movie discovery, film tracking, trending movies, personalized recommendations",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cinetrekker.vercel.app",
    title: "CineTrekker Movie Tracker | Track Movies, TV Shows, and Watchlists",
    description:
      "Use CineTrekker as your movie tracker to organize watchlists, follow new releases, and discover movies and series faster.",
    images: ["https://cinetrekker.vercel.app/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CineTrekker Movie Tracker | Track Movies, TV Shows, and Watchlists",
    description:
      "Track movies, TV shows, and watchlist progress with a movie tracker built for discovery, organization, and fast browsing.",
    image: "https://cinetrekker.vercel.app/og-image.png",
    imageAlt: "CineTrekker movie tracker preview image",
  },
} as const;

export type SiteMetadata = typeof siteMetadata;
