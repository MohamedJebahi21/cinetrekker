export const siteMetadata = {
  siteName: "CineTrekker",
  title: "Movie & TV Show Tracker — Watchlist and Progress | CineTrekker",
  description:
    "Track movies and TV shows, build a watchlist you will actually use, log progress, and discover what to watch next with CineTrekker.",
  canonical: "https://cinetrekker.vercel.app",
  keywords:
    "movie tracker, TV show tracker, watchlist app, track movies, track TV shows, movie watchlist, TV show watchlist, what to watch next",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cinetrekker.vercel.app",
    title: "Movie & TV Show Tracker — Watchlist and Progress | CineTrekker",
    description:
      "Track movies and TV shows, organize a watchlist, log your progress, and find your next great watch with CineTrekker.",
    images: ["https://cinetrekker.vercel.app/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Movie & TV Show Tracker — Watchlist and Progress | CineTrekker",
    description:
      "Track movies and TV shows, build a watchlist, log your progress, and discover your next favorite with CineTrekker.",
    image: "https://cinetrekker.vercel.app/og-image.png",
    imageAlt: "CineTrekker movie and TV show tracker preview image",
  },
} as const;

export type SiteMetadata = typeof siteMetadata;
