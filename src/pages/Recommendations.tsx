import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Clock3, EyeOff, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserLists } from "@/contexts/UserListsContext";
import { getRecommendations, getSimilar } from "@/services/tmdb";
import { Media } from "@/types/media";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/MediaCard";
import { MediaGrid } from "@/components/MediaGrid";
import SEO from "@/components/SEO";
import { getMediaTitle } from "@/services/tmdb";
import { trackEngagementEvent } from "@/lib/engagement";
import { ShareButton } from "@/components/ShareButton";

type RecommendationSection = {
  title: string;
  subtitle: string;
  items: Media[];
};

export default function Recommendations() {
  const { t, i18n } = useTranslation();
  const {
    watched,
    watchlist,
    isHiddenFromRecommendations,
    hideFromRecommendations,
  } = useUserLists();
  const language = i18n.language;

  const recentWatched = watched.slice(-6).reverse();

  const { data: groupedSections = [], isLoading } = useQuery({
    queryKey: [
      "recommendations-grouped",
      recentWatched.map((item) => `${item.mediaType}-${item.mediaId}`),
      language,
    ],
    queryFn: async () => {
      const watchedIds = new Set(
        watched.map((item) => `${item.mediaType}-${item.mediaId}`),
      );
      const watchlistIds = new Set(
        watchlist.map((item) => `${item.mediaType}-${item.mediaId}`),
      );

      const sections = await Promise.all(
        recentWatched.slice(0, 3).map(async (item) => {
          let items: Media[] = [];

          try {
            const recs = await getRecommendations(
              item.mediaType,
              item.mediaId,
              language,
            );
            items = (recs.results || []).map((media) => ({
              ...media,
              media_type: item.mediaType,
            }));

            if (items.length < 8) {
              const similar = await getSimilar(
                item.mediaType,
                item.mediaId,
                language,
              );
              const existing = new Set(items.map((media) => media.id));
              items = [
                ...items,
                ...(similar.results || [])
                  .filter((media) => !existing.has(media.id))
                  .map((media) => ({
                    ...media,
                    media_type: item.mediaType,
                  })),
              ];
            }
          } catch {
            items = [];
          }

          const deduped = items
            .filter((media, index, self) => {
              const key = `${media.media_type}-${media.id}`;
              return (
                index ===
                  self.findIndex(
                    (candidate) =>
                      candidate.id === media.id &&
                      candidate.media_type === media.media_type,
                  ) &&
                !watchedIds.has(key) &&
                !watchlistIds.has(key) &&
                !isHiddenFromRecommendations(
                  media.id,
                  media.media_type === "tv" ? "tv" : "movie",
                )
              );
            })
            .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
            .slice(0, 8);

          return {
            title: t("recommendations.becauseYouLiked", {
              defaultValue:
                item.mediaType === "tv"
                  ? "Because you recently tracked this series"
                  : "Because you recently tracked this film",
              title:
                item.mediaType === "tv"
                  ? t("common.tvShow", "TV Show")
                  : t("common.movie", "Movie"),
            }),
            subtitle: t(
              "recommendations.becauseYouLikedDesc",
              "A stronger next watch built from your recent viewing history.",
            ),
            items: deduped,
          } satisfies RecommendationSection;
        }),
      );

      const combined = sections.flatMap((section) => section.items);
      const tonight = combined
        .filter((media) => (media.runtime ?? 0) <= 120 || media.media_type === "movie")
        .slice(0, 8);
      const prestige = [...combined]
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 8);

      return [
        ...sections.filter((section) => section.items.length > 0),
        tonight.length > 0
          ? {
              title: t("recommendations.shortWatchTonight", "Short Watch Tonight"),
              subtitle: t(
                "recommendations.shortWatchTonightDesc",
                "Lower-friction picks when you want something easy to start.",
              ),
              items: tonight,
            }
          : null,
        prestige.length > 0
          ? {
              title: t("recommendations.topRatedForYou", "Top Rated For You"),
              subtitle: t(
                "recommendations.topRatedForYouDesc",
                "High-confidence picks ranked by quality and fit.",
              ),
              items: prestige,
            }
          : null,
      ].filter(Boolean) as RecommendationSection[];
    },
    enabled: recentWatched.length > 0,
  });

  const totalRecommendationCount = useMemo(
    () => groupedSections.reduce((count, section) => count + section.items.length, 0),
    [groupedSections],
  );

  return (
    <>
      <SEO
        title="Recommendations - CineTrekker"
        description="Personalized movie and TV show recommendations based on what you've watched"
        canonical="https://cinetrekker.vercel.app/recommendations"
      />
      <div className="ct-page-shell min-h-screen">
        <div className="page-container space-y-8 pt-20 pb-24 md:pb-10">
          <section className="ct-panel-strong p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="ct-kicker mb-2 text-primary/85">
                  {t("recommendations.updatedToday", "Updated today")}
                </p>
                <h1 className="section-title mb-2 flex items-center gap-3">
                  <Sparkles className="h-7 w-7 text-primary" />
                  {t("recommendations.title", "Recommendations")}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {t(
                    "recommendations.subtitle",
                    "Fresh picks organized by why they fit, so your recommendation feed feels more trustworthy and easier to act on.",
                  )}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t("recommendations.sections", "Sections")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {groupedSections.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t("recommendations.titlesReady", "Titles ready")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {totalRecommendationCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t("recommendations.shareFeed", "Share feed")}
                  </p>
                  <div className="mt-2">
                    <ShareButton
                      title={t("recommendations.shareTitle", "My CineTrekker recommendations")}
                      url={`${window.location.origin}/recommendations`}
                      text={t(
                        "recommendations.shareText",
                        "These are the titles CineTrekker is recommending for me right now.",
                      )}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {isLoading ? (
            <MediaGrid items={[]} isLoading />
          ) : groupedSections.length > 0 ? (
            groupedSections.map((section) => (
              <section key={section.title} className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {section.subtitle}
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t("recommendations.feedbackHint", "Hide anything that misses the mark")}
                  </div>
                </div>
                <div className="media-grid">
                  {section.items.map((media) => (
                    <div
                      key={`${section.title}-${media.media_type}-${media.id}`}
                      className="group relative"
                    >
                      <MediaCard media={media} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 z-20 rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition-opacity md:group-hover:opacity-100"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          hideFromRecommendations(
                            media.id,
                            media.media_type === "tv" ? "tv" : "movie",
                          );
                          trackEngagementEvent("recommendation_hide", {
                            mediaId: media.id,
                            mediaType: media.media_type === "tv" ? "tv" : "movie",
                          });
                        }}
                        aria-label={t("recommendations.hideTitle", {
                          defaultValue: `Hide ${getMediaTitle(media)}`,
                        })}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : watched.length === 0 ? (
            <div className="ct-panel mx-auto max-w-md py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-3 text-2xl font-semibold text-foreground">
                {t("recommendations.empty", "Recommendations aren't ready yet")}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {t(
                  "recommendations.emptyDesc",
                  "Watch a few movies or episodes and CineTrekker will start shaping a more personal recommendation feed.",
                )}
              </p>
              <Link to="/search">
                <Button className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t("common.discoverTrending", "Discover Trending")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="ct-panel mx-auto max-w-md py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20">
                <Clock3 className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                {t("recommendations.watchMore", "Watch a bit more to sharpen your feed")}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {t(
                  "recommendations.watchMoreDesc",
                  "Your feed is already learning. A little more activity will make the recommendation reasons much stronger.",
                )}
              </p>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t("common.backHome", "Back Home")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
