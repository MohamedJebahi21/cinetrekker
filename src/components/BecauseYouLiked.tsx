import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLastViewed } from "@/hooks/useLastViewed";
import { useUserLists } from "@/contexts/user-lists-context";
import { getRecommendations, getSimilar } from "@/services/tmdb";
import { MediaCard, MediaCardSkeleton } from "./MediaCard";
import { Button } from "@/components/ui/button";
import { Media, UserMediaItem } from "@/types/media";

type RecommendationSeed = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  sourceTs: number;
  useGenericHeading?: boolean;
};

function parseIsoToTs(value?: string): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function getActivityTimestamp(item: UserMediaItem): number {
  return parseIsoToTs(item.watchedAt || item.addedAt);
}

export function BecauseYouLiked() {
  const { t, i18n } = useTranslation();
  const { lastViewed } = useLastViewed();
  const { watched, watchlist } = useUserLists();
  const language = i18n.language;

  const seed = useMemo<RecommendationSeed | null>(() => {
    const latestWatched = watched.reduce<UserMediaItem | null>(
      (latest, item) => {
        if (!latest) return item;
        return getActivityTimestamp(item) > getActivityTimestamp(latest)
          ? item
          : latest;
      },
      null,
    );

    const latestWatchlist = watchlist.reduce<UserMediaItem | null>(
      (latest, item) => {
        if (!latest) return item;
        return parseIsoToTs(item.addedAt) > parseIsoToTs(latest.addedAt)
          ? item
          : latest;
      },
      null,
    );

    const watchedTs = latestWatched ? getActivityTimestamp(latestWatched) : 0;
    const watchlistTs = latestWatchlist
      ? parseIsoToTs(latestWatchlist.addedAt)
      : 0;

    const latestActivity =
      watchedTs >= watchlistTs ? latestWatched : latestWatchlist;
    const latestActivityTs = Math.max(watchedTs, watchlistTs);

    if (latestActivity && latestActivityTs > 0) {
      const titleFromLastViewed =
        lastViewed &&
        lastViewed.id === latestActivity.mediaId &&
        lastViewed.mediaType === latestActivity.mediaType
          ? lastViewed.title
          : "";

      return {
        id: latestActivity.mediaId,
        mediaType: latestActivity.mediaType,
        title:
          titleFromLastViewed || t("home.recentActivity", "Recent Activity"),
        sourceTs: latestActivityTs,
        useGenericHeading: !titleFromLastViewed,
      };
    }

    if (!lastViewed) return null;
    return {
      id: lastViewed.id,
      mediaType: lastViewed.mediaType,
      title: lastViewed.title,
      sourceTs: lastViewed.timestamp,
    };
  }, [watched, watchlist, lastViewed, t]);

  // Create a set of watched IDs for filtering
  const watchedIds = useMemo(
    () => new Set(watched.map((w) => `${w.mediaType}-${w.mediaId}`)),
    [watched],
  );

  const { data: recommendations, isLoading } = useQuery({
    queryKey: [
      "because-you-liked",
      seed?.id,
      seed?.mediaType,
      seed?.sourceTs,
      language,
    ],
    queryFn: async () => {
      if (!seed) return null;

      // Fetch recommendations first (collaborative filtering - better quality)
      const recsResponse = await getRecommendations(
        seed.mediaType,
        seed.id,
        language,
      );
      let results = recsResponse.results || [];

      // Fallback: If recommendations < 10, merge with similar
      if (results.length < 10) {
        try {
          const similarResponse = await getSimilar(
            seed.mediaType,
            seed.id,
            language,
          );
          const similarResults = similarResponse.results || [];

          // Deduplicate and merge
          const existingIds = new Set(results.map((r) => r.id));
          const uniqueSimilar = similarResults.filter(
            (s) => !existingIds.has(s.id),
          );
          results = [...results, ...uniqueSimilar];
        } catch {
          // Ignore similar fetch errors
        }
      }

      return results;
    },
    enabled: !!seed,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't render if no source item or no recommendations
  if (
    !seed ||
    (!isLoading && (!recommendations || recommendations.length === 0))
  ) {
    return null;
  }

  // Filter out watched items and ensure type consistency
  const filteredResults =
    recommendations
      ?.filter((item) => {
        const itemType = item.media_type || seed.mediaType;
        const key = `${itemType}-${item.id}`;
        // Filter out watched items and source item, and keep same media type family.
        return (
          !watchedIds.has(key) &&
          !(itemType === seed.mediaType && item.id === seed.id) &&
          itemType === seed.mediaType
        );
      })
      .slice(0, 12) || [];

  if (!isLoading && filteredResults.length === 0) {
    return null;
  }

  const sectionTitle = seed.useGenericHeading
    ? "Based on Your Recent Activity"
    : t("home.becauseYouLiked", { title: seed.title });

  return (
    <section className="animate-fade-in section-after-hero">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title-responsive font-bold title-display">
          {sectionTitle}
        </h2>
        <Link to={`/${seed.mediaType}/${seed.id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            {t("common.seeAll")}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="scroll-row">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[140px] md:w-[160px]">
                <MediaCardSkeleton />
              </div>
            ))
          : filteredResults.map((item) => (
              <div
                key={`${item.id}-${item.media_type}`}
                className="w-[140px] md:w-[160px]"
              >
                <MediaCard
                  media={{ ...item, media_type: seed.mediaType } as Media}
                  showType={false}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
