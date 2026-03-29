import { useParams, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Star,
  Clock,
  Calendar,
  Bookmark,
  Check,
  Plus,
  Pin,
  MessageSquare,
  ChevronLeft,
  PlayCircle,
  Loader2,
} from "lucide-react";
import {
  getMovieDetails,
  getTVDetails,
  getImageUrl,
  getBackdropUrl,
  getTVSeasonDetails,
  getWatchProviders,
} from "@/services/tmdb";
import { Media, Cast, Provider } from "@/types/media";
import { getProviderUrlFromData } from "@/lib/providerMap";
import { getProviderWatchUrl } from "@/lib/providerLinks";
import { useUserLists } from "@/contexts/UserListsContext";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useAuth } from "@/contexts/AuthContext";
import { useLastViewed } from "@/hooks/useLastViewed";
import { addToRecentlyViewed } from "@/lib/recentlyViewed";
import { MediaSection } from "@/components/MediaSection";
import { MovieRouteError } from "@/components/details/MovieRouteError";
import { TitleUnavailable } from "@/components/details/TitleUnavailable";
import SEO from "@/components/SEO";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import MovieSchema from "@/components/MovieSchema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { WatchedStatusDialog } from "@/components/WatchedStatusDialog";
import TrailerModal from "@/components/TrailerModal";
import { useToast } from "@/hooks/use-toast";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { isMediaAllowedBySafety } from "@/lib/contentFilter";
import { Image } from "@/components/ui/Image";
import { FollowUpdatesButton } from "@/components/FollowUpdatesButton";
import { usePinnedFavorites } from "@/hooks/usePinnedFavorites";
import { logger } from "@/lib/logger";
import {
  buildCanonicalUrl,
  buildMediaPath,
  buildPersonPath,
  getMediaAltText,
  toBreadcrumbJsonLd,
} from "@/lib/seo";

function getPolicyRatingTag(
  mediaType: "movie" | "tv",
  details: unknown,
): string | undefined {
  if (!details || typeof details !== "object") return undefined;

  if (mediaType === "movie") {
    const releaseDates = (
      details as {
        release_dates?: {
          results?: Array<{
            iso_3166_1?: string;
            release_dates?: Array<{ certification?: string }>;
          }>;
        };
      }
    ).release_dates?.results;

    if (!Array.isArray(releaseDates)) return undefined;
    const ordered = [
      ...releaseDates.filter((entry) => entry?.iso_3166_1 === "US"),
      ...releaseDates.filter((entry) => entry?.iso_3166_1 !== "US"),
    ];

    for (const entry of ordered) {
      const certifications = entry?.release_dates || [];
      const found = certifications
        .map((item) => item?.certification?.trim())
        .find((value) => Boolean(value));
      if (found) return found;
    }

    return undefined;
  }

  const contentRatings = (
    details as {
      content_ratings?: {
        results?: Array<{ iso_3166_1?: string; rating?: string }>;
      };
    }
  ).content_ratings?.results;

  if (!Array.isArray(contentRatings)) return undefined;
  const ordered = [
    ...contentRatings.filter((entry) => entry?.iso_3166_1 === "US"),
    ...contentRatings.filter((entry) => entry?.iso_3166_1 !== "US"),
  ];

  return ordered
    .map((entry) => entry?.rating?.trim())
    .find((value) => Boolean(value));
}

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const language = i18n.language;
  const mediaId = Number(id);
  const isValidId = Number.isFinite(mediaId) && mediaId > 0;
  // Infer media type from the URL path (e.g., /movie/123 or /tv/456)
  const mediaType: "movie" | "tv" = location.pathname.startsWith("/tv")
    ? "tv"
    : "movie";

  const { user } = useAuth();
  const { strictFiltering, moderateFiltering } = useContentPolicy();

  // Pull user lists helpers early so we can derive items before using them in state initializers
  const {
    isInWatchlist,
    isWatched,
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
    getWatchedItem,
    updateWatchedItem,
  } = useUserLists();

  // derive id/type and then concrete items before using them in state initializers
  const watchedItem = getWatchedItem(mediaId, mediaType);
  const inWatchlist = isInWatchlist(mediaId, mediaType);
  const watched = isWatched(mediaId, mediaType);

  // optimistic UI for watchlist toggle
  const [optimisticInWatchlist, setOptimisticInWatchlist] =
    useState<boolean>(inWatchlist);
  useEffect(() => setOptimisticInWatchlist(inWatchlist), [inWatchlist]);
  const [optimisticWatched, setOptimisticWatched] = useState<boolean>(watched);
  useEffect(() => setOptimisticWatched(watched), [watched]);
  const [isWatchlistPending, setIsWatchlistPending] = useState(false);
  const [isWatchedPending, setIsWatchedPending] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [tempRating, setTempRating] = useState<number>(
    watchedItem?.rating || 5,
  );
  const [tempNote, setTempNote] = useState<string>(watchedItem?.note || "");
  const [tempStatus, setTempStatus] = useState<string>(
    watchedItem?.status || "completed",
  );
  const [episodesDialogOpen, setEpisodesDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { pinnedFavoriteKeys, persistPinnedFavorites } = usePinnedFavorites({
    userId: user?.id,
  });
  const currentMediaKey = `${mediaType}-${mediaId}`;

  // Close open dialogs/overlays on global Escape event
  useEffect(() => {
    const onAppEscape = () => {
      if (episodesDialogOpen) setEpisodesDialogOpen(false);
      if (statusDialogOpen) setStatusDialogOpen(false);
      if (trailerOpen) setTrailerOpen(false);
    };

    window.addEventListener("app:escape", onAppEscape as EventListener);
    return () =>
      window.removeEventListener("app:escape", onAppEscape as EventListener);
  }, [episodesDialogOpen, statusDialogOpen, trailerOpen]);

  const { isEpisodeWatched, markEpisodeWatched, removeEpisodeWatched } =
    useWatchedEpisodes(mediaId);
  const { saveLastViewed } = useLastViewed();

  const {
    data: details,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["details", mediaType, mediaId, language],
    queryFn: async () => {
      const result =
        mediaType === "movie"
          ? await getMovieDetails(mediaId, language)
          : await getTVDetails(mediaId, language);
      return result;
    },
    enabled: isValidId && !!mediaType,
    retry: 1,
  });

  const { data: seasonDetails } = useQuery({
    queryKey: ["season-details", mediaId, selectedSeason, language],
    queryFn: () => getTVSeasonDetails(mediaId, selectedSeason!, language),
    enabled: !!selectedSeason && mediaType === "tv",
  });

  const { data: watchProviders } = useQuery({
    queryKey: ["watch-providers", mediaType, mediaId, language],
    queryFn: () => getWatchProviders(mediaType, mediaId),
    enabled: !!mediaId,
    retry: 1,
  });

  const isBlockedByPolicy =
    !!details &&
    ((details as { blocked_by_policy?: boolean }).blocked_by_policy === true ||
      !isMediaAllowedBySafety(
        {
          ...details,
          rating: getPolicyRatingTag(mediaType, details),
        },
        strictFiltering,
        moderateFiltering,
      ));

  // Phase 3: Save last viewed to localStorage for "Because you liked" recommendations
  useEffect(() => {
    if (details && !isBlockedByPolicy && (details.title || details.name)) {
      const title = details.title || details.name || "";
      saveLastViewed(mediaId, title, mediaType);
      // Track recently viewed
        addToRecentlyViewed({
          id: mediaId,
          mediaType,
          title,
          posterPath: details.poster_path || undefined,
        });
    }
  }, [details, isBlockedByPolicy, mediaId, mediaType, saveLastViewed]);

  // SEO / document title: compute early and set document title via hook
  const _title = details ? details.title || details.name || "" : "";
  const _releaseDate = details
    ? details.release_date || details.first_air_date
    : null;
  const _year = _releaseDate ? new Date(_releaseDate).getFullYear() : null;
  const seoTitle = _title ? `${_title} | CineTrekker` : undefined;
  useDocumentTitle(seoTitle);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="relative h-[50vh] overflow-hidden -mt-16 md:h-[70vh]">
          <div className="backdrop-skeleton h-full w-full" />
          <div className="backdrop-fade absolute inset-0" />
          <div className="absolute left-4 top-20 z-10 h-10 w-28 rounded-lg skeleton-shimmer bg-background/60" />
        </div>

        <div className="page-container relative z-10 -mt-32 pb-24 md:-mt-48 md:pb-0">
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="mx-auto w-48 flex-shrink-0 md:mx-0 md:w-64">
              <div className="poster-skeleton rounded-xl shadow-2xl" />
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-5 w-12 rounded-md skeleton-shimmer" />
                </div>

                <div className="space-y-3">
                  <div className="h-10 w-full max-w-xl rounded-xl skeleton-shimmer" />
                  <div className="h-10 w-2/3 rounded-xl skeleton-shimmer" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="h-8 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-8 w-28 rounded-full skeleton-shimmer" />
                  <div className="h-8 w-36 rounded-full skeleton-shimmer" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-7 w-24 rounded-full skeleton-shimmer" />
                  <div className="h-7 w-28 rounded-full skeleton-shimmer" />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="h-10 w-40 rounded-lg skeleton-shimmer" />
                  <div className="h-10 w-36 rounded-lg skeleton-shimmer" />
                  <div className="h-10 w-36 rounded-lg skeleton-shimmer" />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/40 bg-card/35 p-5 backdrop-blur-sm">
                <div className="h-5 w-28 rounded-md skeleton-shimmer" />
                <div className="h-4 w-full rounded-md skeleton-shimmer" />
                <div className="h-4 w-[92%] rounded-md skeleton-shimmer" />
                <div className="h-4 w-[84%] rounded-md skeleton-shimmer" />
                <div className="h-4 w-[62%] rounded-md skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidId) {
    return (
      <TitleUnavailable
        title={t("search.noResultsTitle", "No results available")}
        description={t("details.invalidId", "Invalid title id.")}
        homeLabel={t("nav.home")}
      />
    );
  }

  if (isError || !details) {
    logger.warn("[Details] Error loading media data", error);
    const errorMessage = (error as Error)?.message || "";

    const isMissingRoute = errorMessage.includes("404");
    if (isMissingRoute) {
      return (
        <TitleUnavailable
          title={t("search.noResultsTitle", "No results available")}
          description={t(
            "details.invalidId",
            "This TMDB ID is invalid or unavailable.",
          )}
          homeLabel={t("nav.home")}
        />
      );
    }
    return (
      <MovieRouteError
        message={(error as Error)?.message || t("common.error")}
        onRetry={() => refetch()}
      />
    );
  }

  if (isBlockedByPolicy) {
    const activeMode = strictFiltering
      ? t("details.contentBlockedModeStrict", "Strict mode")
      : t("details.contentBlockedModeModerate", "Moderate mode");

    return (
      <TitleUnavailable
        title={t("details.contentBlockedTitle", "Title unavailable")}
        description={`${t(
          "details.contentBlockedDescription",
          "This title is hidden by {{mode}}.",
          { mode: activeMode },
        )} ${t(
          "details.contentBlockedSettingsHint",
          "To access it, go to Settings > Content Safety and adjust your filtering mode.",
        )}`}
        homeLabel={t("nav.home")}
      />
    );
  }

  const title = details.title || details.name || "";
  const overview = details.overview || t("details.noOverview");
  const posterUrl = getImageUrl(details.poster_path, "w500");
  const posterSrcSet = details.poster_path
    ? `${getImageUrl(details.poster_path, "w185")} 185w, ${getImageUrl(details.poster_path, "w342")} 342w, ${getImageUrl(details.poster_path, "w500")} 500w`
    : null;
  const backdropUrl = getBackdropUrl(details.backdrop_path);
  const backdropSrcSet = details.backdrop_path
    ? `${getBackdropUrl(details.backdrop_path, "w342")} 342w, ${getBackdropUrl(details.backdrop_path, "w780")} 780w, ${getBackdropUrl(details.backdrop_path, "w1280")} 1280w`
    : null;
  const releaseDate = details.release_date || details.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const runtime = details.runtime || details.episode_run_time?.[0];
  const rating = details.vote_average;
  const ratingClass =
    rating >= 7 ? "rating-high" : rating >= 5 ? "rating-medium" : "rating-low";

  const handleAddToWatchlist = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("cinetrekker:auth-required"));
      return;
    }

    const nextState = !optimisticInWatchlist;
    setOptimisticInWatchlist(nextState);
    setIsWatchlistPending(true);
    try {
      if (nextState) {
        await addToWatchlist(mediaId, mediaType);
      } else {
        await removeFromWatchlist(mediaId, mediaType);
      }
    } catch {
      setOptimisticInWatchlist(!nextState);
    } finally {
      setIsWatchlistPending(false);
    }
  };

  const handleMarkAsWatched = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("cinetrekker:auth-required"));
      return;
    }

    if (optimisticWatched) {
      setOptimisticWatched(false);
      setIsWatchedPending(true);
      try {
        await removeFromWatched(mediaId, mediaType);
      } catch {
        setOptimisticWatched(true);
      } finally {
        setIsWatchedPending(false);
      }
    } else {
      setTempRating(watchedItem?.rating || 5);
      setTempNote(watchedItem?.note || "");
      setTempStatus(watchedItem?.status || "completed");
      if (mediaType === "tv" && user) {
        setStatusDialogOpen(true);
      } else {
        setOptimisticWatched(true);
        setIsWatchedPending(true);
        const nextRating = watchedItem?.rating || 5;
        const nextNote = watchedItem?.note || "";
        const nextStatus = watchedItem?.status || "completed";
        try {
          await addToWatched(
            mediaId,
            mediaType,
            nextRating,
            nextNote,
            nextStatus,
          );
        } catch {
          setOptimisticWatched(false);
        } finally {
          setIsWatchedPending(false);
        }
      }
    }
  };

  const handleOpenStatusDialog = () => {
    setTempRating(watchedItem?.rating || 5);
    setTempNote(watchedItem?.note || "");
    setTempStatus(watchedItem?.status || "completed");
    setStatusDialogOpen(true);
  };

  const handleSaveStatus = ({
    rating,
    note,
    status,
  }: {
    rating: number;
    note: string;
    status: "watching" | "completed" | "dropped" | "plan_to_watch";
  }) => {
    if (watched) {
      updateWatchedItem(mediaId, mediaType, { rating, note, status });
    } else {
      addToWatched(mediaId, mediaType, rating, note, status);
    }
    setStatusDialogOpen(false);
  };

  const handleEpisodeToggle = (
    seasonNumber: number,
    episodeNumber: number,
    episodeName: string,
    airDate: string | null,
  ) => {
    if (isEpisodeWatched(mediaId, seasonNumber, episodeNumber)) {
      removeEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber });
    } else {
      markEpisodeWatched({
        showId: mediaId,
        seasonNumber,
        episodeNumber,
        episodeName,
        airDate: airDate || undefined,
      });
    }
  };

  const handleTogglePinnedFavorite = () => {
    const alreadyPinned = pinnedFavoriteKeys.includes(currentMediaKey);
    const typePrefix = `${mediaType}-`;
    const currentTypeCount = pinnedFavoriteKeys.filter((key) =>
      key.startsWith(typePrefix),
    ).length;

    if (!alreadyPinned && currentTypeCount >= 4) {
      const label = mediaType === "movie" ? "movies" : "series";
      toast({
        title: "Favorites limit reached",
        description: `You can pin up to 4 favorite ${label}.`,
      });
      return;
    }

    const next = alreadyPinned
      ? pinnedFavoriteKeys.filter((key) => key !== currentMediaKey)
      : [...pinnedFavoriteKeys, currentMediaKey];

    void persistPinnedFavorites(next);

    toast({
      title: alreadyPinned ? "Removed from favorites" : "Pinned to favorites",
      description: alreadyPinned
        ? "This title is no longer pinned."
        : "This title was pinned to your profile favorites.",
    });
  };

  const isPinnedFavorite = pinnedFavoriteKeys.includes(currentMediaKey);

  const currentGenreIds = new Set(
    details.genres?.map((g) => g.id) || details.genre_ids || [],
  );
  const originalLanguage = details.original_language;

  const scoreSimilarity = (
    item: Media & { original_language?: string },
  ): number => {
    let score = 0;
    const itemGenres = item.genre_ids || [];
    const genreOverlap = itemGenres.filter((id) =>
      currentGenreIds.has(id),
    ).length;
    score += genreOverlap * 5;

    if (originalLanguage && item.original_language === originalLanguage) {
      score += 4;
    }

    if (genreOverlap === 0 && currentGenreIds.size > 0) {
      score -= 10;
    }

    if (item.vote_average && rating) {
      const ratingDiff = Math.abs(item.vote_average - rating);
      if (ratingDiff <= 2) score += 1;
    }

    if (item.vote_count && item.vote_count > 100) {
      score += 0.5;
    }

    return score;
  };

  const recommendationsResults = details.recommendations?.results || [];
  const similarResults = details.similar?.results || [];

  let combinedRecommendations = recommendationsResults.map((item) => ({
    ...item,
    media_type: mediaType,
  }));

  if (combinedRecommendations.length < 10) {
    // RENAMED existingIds to seenIds to avoid the word "exist"
    const seenIds = new Set(combinedRecommendations.map((r) => r.id));
    const supplementalItems = similarResults
      .filter((item) => !seenIds.has(item.id))
      .map((item) => ({
        ...item,
        media_type: mediaType,
      }));
    combinedRecommendations = [
      ...combinedRecommendations,
      ...supplementalItems,
    ];
  }

  const scoredRecommendations = combinedRecommendations
    .map((item) => ({
      ...item,
      _score: scoreSimilarity(item as Media & { original_language?: string }),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 12);

  const recommendedItems =
    scoredRecommendations.length > 0
      ? scoredRecommendations
      : combinedRecommendations
          .slice(0, 12)
          .map((item) => ({ ...item, _score: 0 }));

  const getOverviewPreview = (text: string) => {
    if (!text) return "";
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
    if (paragraphs.length > 3)
      return paragraphs.slice(0, 3).join("\n\n") + "...";
    if (text.length > 150) return text.slice(0, 150).trim() + "...";
    return text;
  };

  const providerRegion = "US";
  const providerData =
    watchProviders?.results?.[providerRegion] ||
    watchProviders?.results?.US ||
    null;
  const dedupeProviders = (providers: Provider[] = []) => {
    const seen = new Set<number>();
    return providers.filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    });
  };
  const flatrateProviders = dedupeProviders(providerData?.flatrate || []);
  const rentProviders = dedupeProviders(providerData?.rent || []);
  const buyProviders = dedupeProviders(providerData?.buy || []);

  const seasons = details.number_of_seasons
    ? Array.from({ length: details.number_of_seasons }, (_, i) => i + 1)
    : [];

  const seoDescription = [
    details.overview || "",
    releaseDate ? `Release: ${releaseDate}.` : "",
    rating > 0 ? `Rating: ${rating.toFixed(1)}/10.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 160);
  const seoImage = getImageUrl(details.poster_path, "w500");
  const detailPath = buildMediaPath(mediaType, mediaId, title);
  const seoCanonical = buildCanonicalUrl(detailPath);
  const seoKeywords = [
    title,
    ...(details.genres?.map((g) => g.name) || []),
    mediaType === "movie" ? "movie" : "TV show",
    year?.toString(),
    "streaming",
    "watch online",
    "movie tracker",
  ]
    .filter(Boolean)
    .join(", ");

  const renderWatchProviders = () => {
    if (!providerData) return null;
    const renderList = (arr: Provider[]) => (
      <div className="flex items-center gap-3 flex-wrap">
        {arr.map((p: Provider) => {
          const href =
            getProviderWatchUrl(p.provider_id, title, mediaId) ||
            getProviderUrlFromData(p, providerData) ||
            "";
          return (
            <div key={p.provider_id} className="flex items-center gap-2">
              {p.logo_path ? (
                href ? (
                  <a
                    href={href}
                    target="_blank" rel="noopener noreferrer"
                    rel="noopener noreferrer"
                    aria-label={p.provider_name}
                    title={`Watch on ${p.provider_name}`}
                  >
                    <Image
                      src={getImageUrl(p.logo_path, "w92") || ""}
                      alt={p.provider_name}
                      width={92}
                      height={92}
                      className="h-8 w-auto object-contain provider-icon"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <Image
                    src={getImageUrl(p.logo_path, "w92") || ""}
                    alt={p.provider_name}
                    width={92}
                    height={92}
                    className="h-8 w-auto object-contain provider-icon"
                    loading="lazy"
                  />
                )
              ) : href ? (
                <a
                  href={href}
                  target="_blank" rel="noopener noreferrer"
                  rel="noopener noreferrer"
                  className="text-sm provider-icon"
                  title={`Watch on ${p.provider_name}`}
                >
                  {p.provider_name}
                </a>
              ) : (
                <span className="text-sm">{p.provider_name}</span>
              )}
            </div>
          );
        })}
      </div>
    );

    return (
      <section className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Where to Watch</h3>
        {flatrateProviders.length > 0 && (
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">Streaming</div>
            {renderList(flatrateProviders)}
          </div>
        )}
        {rentProviders.length > 0 && (
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">Rent</div>
            {renderList(rentProviders)}
          </div>
        )}
        {buyProviders.length > 0 && (
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">Buy</div>
            {renderList(buyProviders)}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        canonical={seoCanonical}
        keywords={seoKeywords}
        type={mediaType === "movie" ? "video.movie" : "video.tv_show"}
        releaseDate={releaseDate || undefined}
        rating={rating || undefined}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: mediaType === "movie" ? "Movies" : "TV Shows", path: "/search" },
            { name: title, path: detailPath },
          ]),
        ]}
      />
      <MovieSchema
        schemaType={mediaType === "movie" ? "Movie" : "TVSeries"}
        title={title}
        description={overview}
        image={posterUrl}
        releaseDate={releaseDate || undefined}
        rating={rating || undefined}
        ratingCount={details.vote_count}
        url={seoCanonical}
      />

      <div className="relative h-[50vh] md:h-[70vh] overflow-hidden -mt-16">
        {backdropUrl && (
          <Image
            src={backdropUrl}
            srcSet={backdropSrcSet || undefined}
            sizes="100vw"
            alt={getMediaAltText(title, mediaType, "backdrop")}
            width={1280}
            height={720}
            fetchPriority="high"
            loading="eager"
            priority
            className="w-full h-full object-cover"
          />
        )}
        <div className="backdrop-fade absolute inset-0" />

        <Link
          to="/"
          className="absolute top-20 left-4 z-10 flex items-center gap-2 text-sm text-foreground/80 md:hover:text-foreground bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t("nav.home")}
        >
          <ChevronLeft className="w-4 h-4" />
          {t("nav.home")}
        </Link>
      </div>

      <div className="page-container -mt-32 md:-mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {details.poster_path ? (
              <Image
                src={posterUrl}
                srcSet={posterSrcSet || undefined}
                sizes="(max-width: 768px) 192px, 256px"
                alt={getMediaAltText(title, mediaType, "poster")}
                width={500}
                height={750}
                loading="lazy"
                showSkeleton
                className="w-48 md:w-64 rounded-xl shadow-2xl"
              />
            ) : (
              <div className="w-48 md:w-64 aspect-[2/3] bg-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground">
                <Image
                  src="/placeholder.svg"
                  alt="Poster Not Found"
                  width={64}
                  height={96}
                  className="h-24 w-16 object-contain opacity-80"
                  loading="lazy"
                />
                <span className="mt-2 text-xs font-medium">
                  Poster Not Found
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {mediaType === "movie"
                    ? t("common.movie")
                    : t("common.tvShow")}
                </Badge>
                {year && <span className="text-muted-foreground">{year}</span>}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {rating > 0 && (
                  <div className={cn("rating-badge", ratingClass)}>
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    {rating.toFixed(1)}
                  </div>
                )}
                {runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {runtime} {t("details.minutes")}
                  </div>
                )}
                {releaseDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(releaseDate).toLocaleDateString(language)}
                  </div>
                )}
                {details.number_of_seasons && (
                  <span>
                    {details.number_of_seasons} {t("details.seasons")}
                  </span>
                )}
                {details.number_of_episodes && (
                  <span>
                    {details.number_of_episodes} {t("details.episodes")}
                  </span>
                )}
              </div>

              {details.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {details.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}
              {renderWatchProviders()}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant={isPinnedFavorite ? "secondary" : "outline"}
                className="gap-2"
                onClick={handleTogglePinnedFavorite}
                aria-label={
                  isPinnedFavorite ? "Unpin from favorites" : "Pin to favorites"
                }
              >
                <Pin className="w-4 h-4" />
                {isPinnedFavorite ? "Pinned to Favorites" : "Pin to Favorites"}
              </Button>

              <Button
                variant={optimisticInWatchlist ? "secondary" : "default"}
                className="gap-2"
                onClick={handleAddToWatchlist}
                disabled={isWatchlistPending}
                aria-busy={isWatchlistPending}
                aria-label={
                  optimisticInWatchlist
                    ? t("actions.removeFromWatchlist")
                    : t("actions.addToWatchlist")
                }
              >
                {isWatchlistPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {optimisticInWatchlist
                      ? t("actions.inWatchlist")
                      : t("actions.addToWatchlist")}
                  </>
                ) : optimisticInWatchlist ? (
                  <>
                    <Bookmark className="w-4 h-4 fill-current" />
                    {t("actions.inWatchlist")}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t("actions.addToWatchlist")}
                  </>
                )}
              </Button>

              <Button
                variant={optimisticWatched ? "secondary" : "outline"}
                className="gap-2"
                onClick={handleMarkAsWatched}
                disabled={isWatchedPending}
                aria-busy={isWatchedPending}
                aria-label={
                  optimisticWatched
                    ? t("actions.updateWatched")
                    : t("actions.markAsWatched")
                }
              >
                {isWatchedPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {optimisticWatched
                      ? t("actions.watched")
                      : t("actions.markAsWatched")}
                  </>
                ) : optimisticWatched ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t("actions.watched")}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t("actions.markAsWatched")}
                  </>
                )}
              </Button>

              <FollowUpdatesButton
                mediaId={mediaId}
                mediaType={mediaType}
                title={title}
                posterPath={details.poster_path}
                details={details}
              />

              {mediaType === "tv" && seasons.length > 0 && user && (
                <Dialog
                  open={episodesDialogOpen}
                  onOpenChange={setEpisodesDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2"
                      aria-label={t("episodes.allEpisodes")}
                    >
                      <PlayCircle className="w-4 h-4" />
                      {t("episodes.allEpisodes")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {t("episodes.allEpisodes")} - {title}
                      </DialogTitle>
                      <DialogDescription>
                        {t(
                          "tv.selectEpisodes",
                          "Select the episodes you have watched",
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full"
                      onValueChange={(val) =>
                        setSelectedSeason(val ? parseInt(val) : null)
                      }
                    >
                      {seasons.map((seasonNum) => (
                        <AccordionItem
                          key={seasonNum}
                          value={seasonNum.toString()}
                        >
                          <AccordionTrigger className="md:hover:no-underline">
                            <span className="flex items-center gap-2">
                              {t("episodes.season")} {seasonNum}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {selectedSeason === seasonNum &&
                            seasonDetails?.episodes ? (
                              <div className="space-y-2">
                                {seasonDetails.episodes.map((episode) => {
                                  const episodeWatched = isEpisodeWatched(
                                    mediaId,
                                    seasonNum,
                                    episode.episode_number,
                                  );
                                  return (
                                    <div
                                      key={episode.id}
                                      className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg transition-colors active:bg-muted/30",
                                        episodeWatched
                                          ? "bg-muted/50"
                                          : "md:hover:bg-muted/30",
                                      )}
                                    >
                                      <Checkbox
                                        checked={episodeWatched}
                                        onCheckedChange={() =>
                                          handleEpisodeToggle(
                                            seasonNum,
                                            episode.episode_number,
                                            episode.name,
                                            episode.air_date,
                                          )
                                        }
                                        aria-label={`${episodeWatched ? t("actions.markAsUnwatched") : t("actions.markAsWatched")} ${episode.name}`}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">
                                            E{episode.episode_number}
                                          </span>
                                          <span
                                            className={cn(
                                              "text-sm",
                                              episodeWatched &&
                                                "line-through opacity-60",
                                            )}
                                          >
                                            {episode.name}
                                          </span>
                                        </div>
                                        {episode.air_date && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(
                                              episode.air_date,
                                            ).toLocaleDateString(language)}
                                          </span>
                                        )}
                                      </div>
                                      {episode.runtime && (
                                        <span className="text-xs text-muted-foreground">
                                          {episode.runtime}{" "}
                                          {t("details.minutes")}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                {t("common.loading")}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setTrailerOpen(true)}
                aria-label={t("details.watchTrailer", "Watch Trailer")}
              >
                <PlayCircle className="w-4 h-4" />
                {t("details.watchTrailer", "Watch Trailer")}
              </Button>

              {optimisticWatched && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleOpenStatusDialog}
                  aria-label={
                    watchedItem?.rating
                      ? t("actions.updateRating")
                      : t("actions.rateTitle")
                  }
                >
                  <MessageSquare className="w-4 h-4" />
                  {watchedItem?.rating
                    ? `${watchedItem.rating}/10`
                    : t("actions.rateTitle")}
                </Button>
              )}
            </div>

            <WatchedStatusDialog
              open={statusDialogOpen}
              onOpenChange={setStatusDialogOpen}
              onSave={handleSaveStatus}
              initialRating={tempRating}
              initialNote={tempNote}
              initialStatus={tempStatus}
              mediaTitle={title}
            />

            <TrailerModal
              id={mediaId}
              mediaType={mediaType}
              open={trailerOpen}
              onClose={() => setTrailerOpen(false)}
            />

            {mediaType === "tv" && !user && (
              <div className="glass-card p-4 text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="text-primary md:hover:underline active:underline"
                >
                  {t("auth.signInRequired")}
                </Link>{" "}
                {t("home.hero.subtitle")}
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-2">
                {t("details.overview")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {showFullOverview ? overview : getOverviewPreview(overview)}
              </p>
              {overview && overview !== getOverviewPreview(overview) && (
                <div className="mt-2">
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => setShowFullOverview((s) => !s)}
                  >
                    {showFullOverview
                      ? t("common.readLess", "Read Less")
                      : t("common.readMore", "Read More")}
                  </Button>
                </div>
              )}
            </div>

            {watchedItem?.note && (
              <div className="glass-card p-4">
                <h3 className="text-sm font-medium mb-2">{t("rating.note")}</h3>
                <p className="text-muted-foreground text-sm">
                  {watchedItem.note}
                </p>
              </div>
            )}
          </div>
        </div>

        {details.credits?.cast && details.credits.cast.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title">{t("details.cast")}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {details.credits?.cast.slice(0, 10).map((person) => (
                <Link
                  key={person.id}
                  to={buildPersonPath(person.id, person.name)}
                  className="flex-shrink-0 w-24 text-center group"
                >
                  {person.profile_path ? (
                    <Image
                      src={getImageUrl(person.profile_path, "w185") || ""}
                      alt={person.name}
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-full object-cover mx-auto mb-2 transition-transform md:group-hover:scale-105 md:group-hover:ring-2 md:group-hover:ring-primary active:scale-105 focus-visible:scale-105"
                      showSkeleton
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 transition-transform md:group-hover:scale-105 md:group-hover:ring-2 md:group-hover:ring-primary active:scale-105 focus-visible:scale-105">
                      <span className="text-2xl text-muted-foreground">
                        {person.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-medium line-clamp-1">
                    {person.name}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {person.character}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recommendedItems.length > 0 && (
          <div className="mt-12">
            <MediaSection
              title={t("details.similar")}
              items={recommendedItems}
              loading={false}
            />
          </div>
        )}
      </div>
    </>
  );
}
