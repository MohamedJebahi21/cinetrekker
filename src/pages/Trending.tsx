import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { MediaGrid } from "@/components/MediaGrid";
import { getTrending } from "@/services/tmdb";
import { Media } from "@/types/media";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";

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

  return (
    <>
      <SEO
        title="Trending - CineTrekker"
        description="Discover trending movies and trending TV series right now."
        canonical="https://cinetrekker.vercel.app/trending"
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
      </div>
    </>
  );
}
