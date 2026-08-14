import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { MediaGrid } from "@/components/MediaGrid";
import { getTrending } from "@/services/tmdb";
import { Media } from "@/types/media";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
} from "@/lib/seo";

function coerceMediaType(items: Media[], type: "movie" | "tv") {
  return items.map((item) => ({ ...item, media_type: type }));
}

interface TrendingRecoveryStateProps {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}

function TrendingRecoveryState({
  title,
  description,
  retryLabel,
  onRetry,
}: TrendingRecoveryStateProps) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-border/60 bg-muted/30 px-6 py-10 text-center"
    >
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

export default function Trending() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  const {
    data: trendingMovies = [],
    isLoading: loadingMovies,
    isError: moviesUnavailable,
    refetch: refetchMovies,
  } = useQuery({
    queryKey: ["trending-movies", language, includeAdult],
    queryFn: async () => {
      const response = await getTrending("movie", "day", language, 1, includeAdult);
      const items = coerceMediaType((response?.results || []) as Media[], "movie");
      return applySafetyFilter(items, strictFiltering, moderateFiltering);
    },
  });

  const {
    data: trendingTV = [],
    isLoading: loadingTV,
    isError: tvUnavailable,
    refetch: refetchTV,
  } = useQuery({
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
        title={t("trending.seoTitle", "Trending Movie Tracker Picks | CineTrekker")}
        description={t(
          "trending.seoDescription",
          "Explore trending movies and trending TV series in CineTrekker, the movie tracker built for fast discovery, watchlists, and follow-up viewing.",
        )}
        canonical={buildCanonicalUrl("/trending")}
        keywords="trending movies, trending tv series, movie tracker trends, what to watch now"
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Trending", path: "/trending" },
          ]),
        ]}
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <Flame className="w-8 h-8 text-primary" />
            {t("nav.trending")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("trending.subtitle", "What everyone is watching right now.")}
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-4">{t("trending.movies", "Trending Movies")}</h2>
          {moviesUnavailable ? (
            <TrendingRecoveryState
              title={t("trending.moviesUnavailableTitle", "Trending movies are temporarily unavailable")}
              description={t(
                "trending.moviesUnavailableDescription",
                "We're reconnecting to movie data. Please try again in a moment.",
              )}
              onRetry={() => void refetchMovies()}
              retryLabel={t("common.tryAgain", "Try again")}
            />
          ) : (
            <MediaGrid
              items={trendingMovies as (Media & { watchStatus?: string })[]}
              isLoading={loadingMovies}
              columns="normal"
              gap="md"
              skeletonCount={12}
            />
          )}
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-4">{t("trending.tv", "Trending TV Series")}</h2>
          {tvUnavailable ? (
            <TrendingRecoveryState
              title={t("trending.tvUnavailableTitle", "Trending TV is temporarily unavailable")}
              description={t(
                "trending.tvUnavailableDescription",
                "We're reconnecting to movie data. Please try again in a moment.",
              )}
              onRetry={() => void refetchTV()}
              retryLabel={t("common.tryAgain", "Try again")}
            />
          ) : (
            <MediaGrid
              items={trendingTV as (Media & { watchStatus?: string })[]}
              isLoading={loadingTV}
              columns="normal"
              gap="md"
              skeletonCount={12}
            />
          )}
        </section>
      </div>
    </>
  );
}
