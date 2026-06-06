import { useParams, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { toDisplayTitle } from "@/lib/displayTitle";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { PaginationDotButton, PaginationDots } from "@/components/ui/pagination-dots";
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
  const castScrollRef = useRef<HTMLDivElement>(null);
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
  const [activeCastPage, setActiveCastPage] = useState(0);
  const [castPageCount, setCastPageCount] = useState(1);
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
    retry: 3,
  });
  const detailsLoadingTimedOut = useLoadingTimeout(isLoading, 15000);

  const { data: seasonDetails } = useQuery({
    queryKey: ["season-details", mediaId, selectedSeason, language],
    queryFn: () => getTVSeasonDetails(mediaId, selectedSeason!, language),
    enabled: !!selectedSeason && mediaType === "tv",
  });

  const { data: watchProviders } = useQuery({
    queryKey: ["watch-providers", mediaType, mediaId, language],
    queryFn: () => getWatchProviders(mediaType, mediaId),
    enabled: !!mediaId,
    retry: 3,
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

  useEffect(() => {
    const container = castScrollRef.current;
    if (!container || !((details?.credits?.cast?.length ?? 0) > 0)) return;

    const updateCastPaging = () => {
      const hasScroll = container.scrollWidth > container.clientWidth;
      const totalPages = hasScroll
        ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
        : 1;
      const cards = Array.from(container.children) as HTMLElement[];
      let nearestChildIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const distance = Math.abs(card.offsetLeft - container.scrollLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestChildIndex = index;
        }
      });

      const nextPage = hasScroll
        ? Math.min(
            totalPages - 1,
            Math.round((nearestChildIndex / Math.max(1, cards.length - 1)) * (totalPages - 1)),
          )
        : 0;

      setCastPageCount(totalPages);
      setActiveCastPage(nextPage);
    };

    updateCastPaging();
    const resizeObserver = new ResizeObserver(updateCastPaging);
    resizeObserver.observe(container);
    container.addEventListener("scroll", updateCastPaging, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", updateCastPaging);
    };
  }, [details?.credits?.cast?.length]);

  // SEO / document title: compute early and set document title via hook
  const _title = details ? details.title || details.name || "" : "";
  const _releaseDate = details
    ? details.release_date || details.first_air_date
    : null;
  const _year = _releaseDate ? new Date(_releaseDate).getFullYear() : null;
  const seoTitle = _title ? `${_title} | CineTrekker` : undefined;
  useDocumentTitle(seoTitle);

  // Compute seasons/availableSeasonNumbers unconditionally (before any early return)
  // so they can safely appear in the useEffect dependency array below.
  const seasons = useMemo(
    () =>
      details?.number_of_seasons
        ? Array.from({ length: details.number_of_seasons }, (_, i) => i + 1)
        : [],
    [details?.number_of_seasons],
  );

  const todayDateKey = new Date().toISOString().slice(0, 10);

  const availableSeasonNumbers = useMemo(() => {
    if (mediaType !== "tv") return [];
    return (
      details?.seasons
        ?.map((season) => season.season_number)
        .filter(
          (seasonNumber, index) =>
            seasonNumber > 0 &&
            (details.seasons?.[index]?.air_date
              ? details.seasons[index].air_date! <= todayDateKey
              : true),
        ) ?? seasons
    ).sort((a, b) => b - a);
  }, [details?.seasons, mediaType, seasons, todayDateKey]);

  // Must be called unconditionally before any early return (Rules of Hooks)
  useEffect(() => {
    if (mediaType !== "tv") return;
    if (selectedSeason && availableSeasonNumbers.includes(selectedSeason)) return;
    if (availableSeasonNumbers.length > 0) {
      setSelectedSeason(availableSeasonNumbers[0]);
      return;
    }
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[seasons.length - 1]);
    }
  }, [availableSeasonNumbers, mediaType, seasons, selectedSeason]);

  if (isLoading && !detailsLoadingTimedOut) {
    return (
      <div className="min-h-screen">
        <div className="relative h-[50vh] overflow-hidden -mt-16 md:h-[70vh]">
          <div className="backdrop-skeleton h-full w-full" />
          <div className="backdrop-fade absolute inset-0" />
          <div className="absolute left-4 top-20 z-10 h-10 w-28 rounded-lg skeleton-shimmer bg-background/60" />
        </div>

        <div className="page-container relative z-10 -mt-16 sm:-mt-24 md:-mt-48 pb-24 md:pb-0">
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

  if (detailsLoadingTimedOut) {
    return (
      <MovieRouteError
        message={t(
          "details.timeout",
          "Loading took too long. Please check your connection and try again.",
        )}
        onRetry={() => refetch()}
      />
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

  const title = toDisplayTitle(details.title || details.name || "");
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

  type PreventableEvent = {
    preventDefault: () => void;
    stopPropagation: () => void;
  };

  const suppressActionNavigation = (event?: PreventableEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
  };

  const handleAddToWatchlist = async (event?: PreventableEvent) => {
    suppressActionNavigation(event);
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

  const handleMarkAsWatched = async (event?: PreventableEvent) => {
    suppressActionNavigation(event);
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
        showName: title,
        posterPath: details?.poster_path,
      });
    }
  };

  const handleTogglePinnedFavorite = () => {
    const alreadyPinned = pinnedFavoriteKeys.includes(currentMediaKey);

    const next = alreadyPinned
      ? pinnedFavoriteKeys.filter((key) => key !== currentMediaKey)
      : [...pinnedFavoriteKeys, currentMediaKey];

    void persistPinnedFavorites(next);

    toast({
      title: alreadyPinned ? t("details.removedFromFavorites", "Removed from favorites") : t("details.pinnedToFavorites", "Pinned to favorites"),
      description: alreadyPinned
        ? t("details.noLongerPinned", "This title is no longer pinned.")
        : t("details.pinnedToFavoritesDesc", "This title was pinned to your profile favorites."),
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

  const shouldShowOverviewToggle = overview.length > 280 || overview.includes("\n");

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

  const publishedEpisodes =
    mediaType === "tv" && seasonDetails?.episodes
      ? seasonDetails.episodes.filter(
          (episode) => episode.air_date && episode.air_date <= todayDateKey,
        )
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
        <h3 className="text-lg font-semibold mb-2">{t("details.whereToWatch", "Where to Watch")}</h3>
        {flatrateProviders.length > 0 && (
          <p className="mb-3 text-sm text-emerald-300/90">
            {t(
              "details.providerUrgencyHint",
              "Available on subscription now. Great moment to start before provider catalogs rotate.",
            )}
          </p>
        )}
        {flatrateProviders.length > 0 && (
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">{t("details.streaming", "Streaming")}</div>
            {renderList(flatrateProviders)}
          </div>
        )}
        {rentProviders.length > 0 && (
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">{t("details.rent", "Rent")}</div>
            {renderList(rentProviders)}
          </div>
        )}
        {buyProviders.length > 0 && (
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">{t("details.buy", "Buy")}</div>
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
        genres={details.genres?.map((g) => g.name)}
        actors={details.credits?.cast?.slice(0, 10).map((person) => ({
          name: person.name,
          image: person.profile_path ? getImageUrl(person.profile_path, "w185") : undefined,
        }))}
        directors={
          mediaType === "movie"
            ? details.credits?.crew
                ?.filter((member) => member.job === "Director")
                .map((member) => ({ name: member.name }))
            : undefined
        }
        creators={
          mediaType === "tv"
            ? details.created_by?.map((creator) => ({ name: creator.name }))
            : undefined
        }
        duration={runtime || undefined}
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

      <div className="page-container relative z-10 -mt-16 sm:-mt-24 md:-mt-48 pb-24 md:pb-0">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {details.poster_path ? (
              <div className="w-48 md:w-64 aspect-[2/3] relative overflow-hidden rounded-xl shadow-2xl bg-muted/20">
                <Image
                  src={posterUrl}
                  srcSet={posterSrcSet || undefined}
                  sizes="(max-width: 768px) 192px, 256px"
                  alt={getMediaAltText(title, mediaType, "poster")}
                  width={500}
                  height={750}
                  loading="lazy"
                  showSkeleton
                  className="w-full h-full object-cover"
                />
              </div>
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
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.42))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className="border-white/15 bg-white/5 text-xs uppercase tracking-[0.18em] text-foreground/90">
                  {mediaType === "movie"
                    ? t("common.movie")
                    : t("common.tvShow")}
                </Badge>
                {year && <span className="text-sm text-foreground/70">{year}</span>}
                {rating > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                    <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold leading-tight md:text-5xl">{title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-foreground/72">
                {runtime && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    <Clock className="w-4 h-4" />
                    {runtime} {t("details.minutes")}
                  </div>
                )}
                {releaseDate && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(releaseDate).toLocaleDateString(language)}
                  </div>
                )}
                {details.number_of_seasons && (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {details.number_of_seasons} {t("details.seasons")}
                  </span>
                )}
                {details.number_of_episodes && (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {details.number_of_episodes} {t("details.episodes")}
                  </span>
                )}
              </div>

              {details.genres && details.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {details.genres.map((genre) => (
                    <Badge
                      key={genre.id}
                      variant="secondary"
                      className="border border-white/10 bg-white/8 text-foreground"
                    >
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                        {t("details.overview", "Overview")}
                      </p>
                      <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-foreground/78 md:text-base">
                        {showFullOverview || !shouldShowOverviewToggle
                          ? overview
                          : `${overview.slice(0, 280).trimEnd()}...`}
                      </p>
                    </div>
                  </div>
                  {shouldShowOverviewToggle ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-3 px-0 text-primary"
                      onClick={() => setShowFullOverview((s) => !s)}
                    >
                      {showFullOverview
                        ? t("common.readLess", "Read Less")
                        : t("common.readMore", "Read More")}
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                    {t("details.watchOptions", "Watch Options")}
                  </p>
                  <div className="mt-3 text-sm text-foreground/72">
                    {renderWatchProviders()}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-card/55 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("details.primaryActions", "Your Next Move")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {t("details.trackThisTitle", "Track this title your way")}
                  </h2>
                </div>
                {!user ? (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "details.guestTrackingHint",
                      "Guest actions save locally now. Create an account later if you want sync.",
                    )}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
              <Button
                variant="default"
                className={cn(
                  "w-full gap-2 sm:w-auto sm:min-w-[180px]",
                  optimisticInWatchlist
                    ? "border-red-500/70 bg-red-600 text-white hover:bg-red-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                onClick={(event) => void handleAddToWatchlist(event)}
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
                    {t("details.watchlist", "Watchlist")}
                  </>
                ) : optimisticInWatchlist ? (
                  <>
                    <Bookmark className="w-4 h-4 fill-current" />
                    {t("details.watchlist", "Watchlist")}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t("details.watchlist", "Watchlist")}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className={cn(
                  "w-full gap-2 sm:w-auto sm:min-w-[160px]",
                  optimisticWatched
                    ? "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
                onClick={(event) => void handleMarkAsWatched(event)}
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
                    {t("details.watched", "Watched")}
                  </>
                ) : optimisticWatched ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t("details.watched", "Watched")}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t("details.watched", "Watched")}
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

              <Button
                variant={isPinnedFavorite ? "secondary" : "ghost"}
                className="gap-2"
                onClick={handleTogglePinnedFavorite}
                aria-label={
                  isPinnedFavorite ? "Unpin from favorites" : "Pin to favorites"
                }
              >
                <Pin className="w-4 h-4" />
                {isPinnedFavorite ? "Pinned" : "Pin"}
              </Button>

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

              {user && (
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
                    ? t("details.ratingReviewWithScore", "{{rating}}/10 Review", {
                        rating: watchedItem.rating,
                      })
                    : t("details.addRating", "Add Rating & Review")}
                </Button>
              )}
              </div>
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

            <div className="ct-panel p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("details.yourRatingReview", "Your Rating & Review")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user
                      ? t(
                          "details.ratingReviewSignedInPrompt",
                          "Keep a personal score and short note for this title.",
                        )
                      : t(
                          "details.ratingReviewGuestPrompt",
                          "Sign in to rate this title and save a personal review.",
                        )}
                  </p>
                  {user && watchedItem ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(
                        "details.ratingReviewSavedEntryHint",
                        "Your saved entry is shown below. Edit it any time to update the score, note, or watch status.",
                      )}
                    </p>
                  ) : null}
                </div>

                {user ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleOpenStatusDialog}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {watchedItem
                      ? t("details.editRating", "Edit Saved Rating & Review")
                      : t("details.addRating", "Add Rating & Review")}
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link to="/login">{t("details.signInToReview", "Sign In to Review")}</Link>
                  </Button>
                )}
              </div>

              {user && watchedItem ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">{watchedItem.status || "completed"}</Badge>
                    {typeof watchedItem.rating === "number" ? (
                      <Badge variant="outline">{watchedItem.rating}/10</Badge>
                    ) : (
                      <Badge variant="outline">{t("details.noRatingYet", "No rating yet")}</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {watchedItem.note?.trim()
                      ? watchedItem.note
                      : t("details.noNoteYet", "No note yet. Add a short review so you remember what stood out.")}
                  </p>
                </div>
              ) : null}
            </div>

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

            {mediaType === "tv" && seasons.length > 0 ? (
              <section className="ct-panel p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t("details.availableEpisodes", "Available Episodes")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        "details.availableEpisodesDescription",
                        "Browse published episodes and read each episode summary directly from the series page.",
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(availableSeasonNumbers.length > 0
                      ? availableSeasonNumbers
                      : seasons.slice().reverse()
                    ).map((seasonNum) => (
                      <Button
                        key={`season-chip-${seasonNum}`}
                        type="button"
                        size="sm"
                        variant={
                          selectedSeason === seasonNum ? "secondary" : "outline"
                        }
                        onClick={() => setSelectedSeason(seasonNum)}
                      >
                        {t("details.seasonLabel", "Season {{season}}", {
                          season: seasonNum,
                        })}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  {!selectedSeason ? (
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "details.selectSeasonPrompt",
                        "Select a season to view released episodes.",
                      )}
                    </p>
                  ) : !seasonDetails ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t(
                        "details.loadingSeasonEpisodes",
                        "Loading season episodes...",
                      )}
                    </div>
                  ) : publishedEpisodes.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-background/30 px-4 py-5 text-sm text-muted-foreground">
                      {t(
                        "details.noPublishedEpisodes",
                        "No published episodes are available for this season yet.",
                      )}
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {publishedEpisodes.map((episode) => (
                        <AccordionItem
                          key={`available-episode-${episode.id}`}
                          value={`episode-${episode.id}`}
                        >
                          <AccordionTrigger className="gap-4 text-left md:hover:no-underline">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                S{episode.season_number}E{episode.episode_number}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-foreground">
                                {episode.name}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {episode.air_date
                                  ? new Date(
                                      episode.air_date,
                                    ).toLocaleDateString(language)
                                  : t(
                                      "details.releaseDateUnavailable",
                                      "Release date unavailable",
                                    )}
                                {episode.runtime
                                  ? ` • ${episode.runtime} ${t("details.minutes")}`
                                  : ""}
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {episode.overview?.trim()
                                  ? episode.overview
                                  : t(
                                      "details.noEpisodeDescription",
                                      "No description is available for this episode yet.",
                                    )}
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </section>
            ) : null}

          </div>
        </div>

        {details.credits?.cast && details.credits.cast.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title">{t("details.cast")}</h2>
            <div
              ref={castScrollRef}
              className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth snap-x snap-mandatory"
            >
              {details.credits?.cast.slice(0, 10).map((person) => (
                <Link
                  key={person.id}
                  to={buildPersonPath(person.id, person.name)}
                  className="flex-shrink-0 w-24 text-center group snap-start"
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
            {castPageCount > 1 && (
              <PaginationDots className="mt-1">
                {Array.from({ length: castPageCount }).map((_, index) => (
                  <PaginationDotButton
                    key={`cast-page-${index}`}
                    onClick={() => {
                      const castContainer = castScrollRef.current;
                      if (!castContainer) return;

                      const cards = Array.from(castContainer.children) as HTMLElement[];
                      const targetChildIndex =
                        castPageCount <= 1 || cards.length <= 1
                          ? 0
                          : Math.round((index * (cards.length - 1)) / (castPageCount - 1));

                      cards[targetChildIndex]?.scrollIntoView({
                        behavior: "smooth",
                        inline: "start",
                        block: "nearest",
                      });
                    }}
                    active={index === activeCastPage}
                    aria-label={t("details.goToCastPage", "Go to cast page {{page}}", { page: index + 1 })}
                    aria-current={index === activeCastPage ? "true" : undefined}
                  />
                ))}
              </PaginationDots>
            )}
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
