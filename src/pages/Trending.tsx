import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { MediaGrid } from "@/components/MediaGrid";
import { getTrending } from "@/services/tmdb";
import { Media } from "@/types/media";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import { FAQSection } from "@/components/FAQSection";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
} from "@/lib/seo";

function coerceMediaType(items: Media[], type: "movie" | "tv") {
  return items.map((item) => ({ ...item, media_type: type }));
}

export default function Trending() {
  const { i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  const { data: trendingMovies = [], isLoading: loadingMovies } = useQuery({
    queryKey: ["trending-movies", language, includeAdult],
    queryFn: async () => {
      const response = await getTrending("movie", "day", language, 1, includeAdult);
      const items = coerceMediaType((response?.results || []) as Media[], "movie");
      return applySafetyFilter(items, strictFiltering, moderateFiltering);
    },
  });

  const { data: trendingTV = [], isLoading: loadingTV } = useQuery({
    queryKey: ["trending-tv", language, includeAdult],
    queryFn: async () => {
      const response = await getTrending("tv", "day", language, 1, includeAdult);
      const items = coerceMediaType((response?.results || []) as Media[], "tv");
      return applySafetyFilter(items, strictFiltering, moderateFiltering);
    },
  });

  const faqItems = [
    {
      question: "How often does the trending view update?",
      answer:
        "The trending view refreshes regularly so CineTrekker can surface fast-moving movie tracker signals, recent audience interest, and day-by-day viewing momentum.",
    },
    {
      question: "Can I save trending titles to my watchlist?",
      answer:
        "Yes. Every card connects directly to detail pages and watchlist actions, so you can move from discovery to planning without leaving the trending flow.",
    },
  ];

  return (
    <>
      <SEO
        title="Trending Movie Tracker Picks | CineTrekker"
        description="Explore trending movies and trending TV series in CineTrekker, the movie tracker built for fast discovery, watchlists, and follow-up viewing."
        canonical={buildCanonicalUrl("/trending")}
        keywords="trending movies, trending tv series, movie tracker trends, what to watch now"
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Trending", path: "/trending" },
          ]),
          toFaqJsonLd(faqItems),
        ]}
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <Flame className="w-8 h-8 text-primary" />
            Trending
          </h1>
          <p className="text-muted-foreground mt-2">
            What everyone is watching right now.
          </p>
        </div>

        <section className="mb-10 rounded-3xl border border-border/40 bg-card/70 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                What trending data tells you inside a movie tracker
              </h2>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                The trending page helps you spot titles that are actively
                breaking through right now instead of relying on stale lists.
                In a movie tracker, that matters because discovery is most
                useful when you can act on momentum immediately, save a title to
                your watchlist, and come back later with context already in
                place.
              </p>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                CineTrekker separates trending movies from trending TV series so
                you can decide whether you want a quick film, a long-form binge,
                or a title worth following over time. Each card leads deeper
                into structured detail pages, watch provider information,
                internal recommendations, and tracking actions that make the
                trend actually useful.
              </p>
            </article>
            <aside className="rounded-3xl border border-border/40 bg-background/60 p-5 text-sm leading-7 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">
                Quick ways to use this page
              </h3>
              <p className="mt-3">Save a breakout title before the weekend.</p>
              <p>Compare trending films with your watchlist backlog.</p>
              <p>Follow a series if new episodes are driving buzz.</p>
            </aside>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Trending Movies</h2>
          <MediaGrid
            items={trendingMovies as (Media & { watchStatus?: string })[]}
            isLoading={loadingMovies}
            columns="normal"
            gap="md"
            skeletonCount={12}
          />
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-4">Trending TV Series</h2>
          <MediaGrid
            items={trendingTV as (Media & { watchStatus?: string })[]}
            isLoading={loadingTV}
            columns="normal"
            gap="md"
            skeletonCount={12}
          />
        </section>

        <InternalLinksSection
          title="Continue exploring"
          links={[
            {
              to: "/search",
              title: "Advanced search",
              description:
                "Refine trending ideas by genre, language, year, runtime, and sort order.",
            },
            {
              to: "/genres",
              title: "Genre browser",
              description:
                "Turn a broad trending signal into a cleaner genre-based browsing session.",
            },
            {
              to: "/collections",
              title: "Collections",
              description:
                "Move from one trending title into connected franchises and marathon ideas.",
            },
          ]}
        />

        <FAQSection
          title="Trending FAQs"
          items={faqItems}
        />
      </div>
    </>
  );
}
