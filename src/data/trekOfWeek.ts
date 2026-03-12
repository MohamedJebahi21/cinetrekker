export interface TrekOfWeekFeature {
  slug: string;
  title: string;
  region: string;
  description: string;
  heroImage: string;
  items: Array<{
    mediaType: "movie" | "tv";
    mediaId: number;
    title: string;
    note: string;
  }>;
}

const TREK_OF_WEEK_FEATURES: TrekOfWeekFeature[] = [
  {
    slug: "new-zealand-lotr-guide",
    title: "The Best of New Zealand: A Lord of the Rings Guide",
    region: "New Zealand",
    description:
      "From Hobbiton hills to volcanic Mordor terrain, this trek maps the iconic North Island and South Island filming zones that shaped Middle-earth.",
    heroImage:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=80&fm=webp",
    items: [
      {
        mediaType: "movie",
        mediaId: 120,
        title: "The Lord of the Rings: The Fellowship of the Ring",
        note: "Hobbiton, Tongariro, and alpine ridgelines.",
      },
      {
        mediaType: "movie",
        mediaId: 121,
        title: "The Lord of the Rings: The Two Towers",
        note: "Remote valleys and windswept plains.",
      },
      {
        mediaType: "movie",
        mediaId: 122,
        title: "The Lord of the Rings: The Return of the King",
        note: "Epic mountain backdrops and coastal regions.",
      },
    ],
  },
  {
    slug: "tokyo-lost-in-translation",
    title: "Tokyo Through the Lens of Lost in Translation",
    region: "Tokyo, Japan",
    description:
      "A neon-night itinerary through Shinjuku, Shibuya, and hotel interiors that defined modern cinematic melancholy.",
    heroImage:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=2200&q=80&fm=webp",
    items: [
      {
        mediaType: "movie",
        mediaId: 153,
        title: "Lost in Translation",
        note: "City-light isolation and intimate urban moments.",
      },
      {
        mediaType: "movie",
        mediaId: 603,
        title: "The Matrix",
        note: "Tokyo-inspired urban futurism references.",
      },
      {
        mediaType: "tv",
        mediaId: 110316,
        title: "Tokyo Vice",
        note: "Nightlife districts and street-level reportage.",
      },
    ],
  },
];

export function getTrekOfWeek(): TrekOfWeekFeature {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((+now - +start) / 86400000);
  const week = Math.floor(days / 7);
  return TREK_OF_WEEK_FEATURES[week % TREK_OF_WEEK_FEATURES.length];
}
