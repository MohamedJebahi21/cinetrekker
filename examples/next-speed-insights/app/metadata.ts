import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Track Movies & TV Shows",
    template: "%s | CineTrekker",
  },
  description:
    "CineTrekker helps you organize watchlists, track episode progress, and discover personalized movie and TV recommendations faster.",
  openGraph: {
    title: "CineTrekker | Track Movies & TV Shows",
    description:
      "CineTrekker helps you organize watchlists, track episode progress, and discover personalized movie and TV recommendations faster.",
    siteName: "CineTrekker",
    type: "website",
    url: "https://cinetrekker.vercel.app",
  },
};
