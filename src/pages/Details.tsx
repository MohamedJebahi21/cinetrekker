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
  Bell,
  Share2,
  ExternalLink,
  Globe,
  Film,
  Tv,
  TrendingUp,
  Award,
  Users,
  ChevronRight,
  X,
} from "lucide-react";
import {
  getMovieDetails,
  getTVDetails,
  getImageUrl,
  getBackdropUrl,
  getTVSeasonDetails,
  getWatchProviders,
  getSimilar,
} from "@/services/tmdb";
import { Media, Cast, Provider, MediaVideoResult, Keyword, ProductionCompany } from "@/types/media";
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
import { MediaComments } from "@/components/MediaComments";
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

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "returning series": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    case "in production": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    case "ended": return "bg-slate-500/20 text-slate-400 border-slate-500/40";
    case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/40";
    case "released": return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    case "post production": return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    default: return "bg-white/10 text-foreground/70 border-white/20";
  }
}

// ─────────────────────────────────────────
// VideoCard — shows a YouTube thumbnail with play-in-modal
// ─────────────────────────────────────────
function VideoCard({ video, onPlay }: { video: MediaVideoResult; onPlay: (key: string) => void }) {
  const thumb = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;
  return (
    <button
      type="button"
      onClick={() => onPlay(video.key)}
      className="group relative flex-shrink-0 w-52 rounded-xl overflow-hidden border border-white/10 hover:border-primary/60 transition-all duration-200 hover:scale-[1.03] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Play ${video.name}`}
    >
      <div className="aspect-video relative">
        <img
          src={thumb}
          alt={video.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <PlayCircle className="w-5 h-5 text-black fill-black" />
          </div>
        </div>
      </div>
      <div className="p-2 bg-card/80">
        <p className="text-xs font-semibold text-foreground/90 line-clamp-1">{video.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{video.type}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────
// StarRating — animated interactive star component
// ─────────────────────────────────────────
function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95 disabled:cursor-not-allowed"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={value >= star}
        >
          <Star
            className={cn(
              "w-8 h-8 transition-all duration-150",
              display >= star
                ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]"
                : "text-gray-600 hover:text-yellow-400/70"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function Details() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const language = i18n.language;
  const mediaId = Number(id);
  const isValidId = Number.isFinite(mediaId) && mediaId > 0;
  const castScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});
  const backdropRef = useRef<HTMLDivElement>(null);

  const mediaType: "movie" | "tv" = location.pathname.startsWith("/tv")
    ? "tv"
    : "movie";

  const { user } = useAuth();
  const { strictFiltering, moderateFiltering } = useContentPolicy();

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

  const watchedItem = getWatchedItem(mediaId, mediaType);
  const inWatchlist = isInWatchlist(mediaId, mediaType);
  const watched = isWatched(mediaId, mediaType);

  const [optimisticInWatchlist, setOptimisticInWatchlist] = useState<boolean>(inWatchlist);
  useEffect(() => setOptimisticInWatchlist(inWatchlist), [inWatchlist]);
  const [optimisticWatched, setOptimisticWatched] = useState<boolean>(watched);
  useEffect(() => setOptimisticWatched(watched), [watched]);
  const [isWatchlistPending, setIsWatchlistPending] = useState(false);
  const [isWatchedPending, setIsWatchedPending] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [tempRating, setTempRating] = useState<number>(watchedItem?.rating || 5);
  const [tempNote, setTempNote] = useState<string>(watchedItem?.note || "");
  const [tempStatus, setTempStatus] = useState<string>(watchedItem?.status || "completed");
  const [inlineStarRating, setInlineStarRating] = useState<number>(
    watchedItem?.rating ? Math.round(watchedItem.rating / 2) : 0,
  );
  const [inlineReviewText, setInlineReviewText] = useState<string>(watchedItem?.note || "");
  const [hasInteractedWithStars, setHasInteractedWithStars] = useState<boolean>(false);
  const [showReviewTextarea, setShowReviewTextarea] = useState<boolean>(watchedItem?.note ? true : false);
  const [episodesDialogOpen, setEpisodesDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerVideoKey, setTrailerVideoKey] = useState<string | undefined>(undefined);
  const [activeCastPage, setActiveCastPage] = useState(0);
  const [castPageCount, setCastPageCount] = useState(1);
  const [isStickyNavVisible, setIsStickyNavVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [showFactsSidebar, setShowFactsSidebar] = useState(false);
  const { pinnedFavoriteKeys, persistPinnedFavorites } = usePinnedFavorites({ userId: user?.id });
  const currentMediaKey = `${mediaType}-${mediaId}`;

  // ── Parallax effect on backdrop ──
  useEffect(() => {
    const handleScroll = () => {
      if (!backdropRef.current) return;
      const scrollY = window.scrollY;
      backdropRef.current.style.transform = `translateY(${scrollY * 0.35}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Escape handler ──
  useEffect(() => {
    const onAppEscape = () => {
      if (episodesDialogOpen) setEpisodesDialogOpen(false);
      if (statusDialogOpen) setStatusDialogOpen(false);
      if (trailerOpen) setTrailerOpen(false);
    };
    window.addEventListener("app:escape", onAppEscape as EventListener);
    return () => window.removeEventListener("app:escape", onAppEscape as EventListener);
  }, [episodesDialogOpen, statusDialogOpen, trailerOpen]);

  // ── Sticky nav from hero scroll ──
  useEffect(() => {
    const heroElement = heroRef.current;
    if (!heroElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStickyNavVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(heroElement);
    return () => observer.disconnect();
  }, []);

  // ── Active section highlighting ──
  useEffect(() => {
    const sections = ["overview", "videos", "cast", "episodes", "similar", "reviews"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace("section-", ""));
          }
        });
      },
      { threshold: 0.2 }
    );
    sections.forEach((s) => {
      const el = sectionRefs.current[s];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const { isEpisodeWatched, markEpisodeWatched, removeEpisodeWatched, watchedEpisodes, markSeasonWatched, markAllSeasonsWatched } =
    useWatchedEpisodes(mediaId);
  const { saveLastViewed } = useLastViewed();

  const { data: details, isLoading, error, isError, refetch } = useQuery({
    queryKey: ["details", mediaType, mediaId, language],
    queryFn: async () => {
      return mediaType === "movie"
        ? await getMovieDetails(mediaId, language)
        : await getTVDetails(mediaId, language);
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

  const personalStats = useMemo(() => {
    if (!user || mediaType === "movie" || !details) return null;
    const watchedCount = watchedEpisodes.length;
    const totalEpisodes = details.number_of_episodes || 0;
    const percentageComplete = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
    let totalMinutes = 0;
    watchedEpisodes.forEach(ep => {
      const episode = seasonDetails?.episodes?.find(
        e => e.season_number === ep.season_number && e.episode_number === ep.episode_number
      );
      if (episode?.runtime) totalMinutes += episode.runtime;
    });
    return {
      episodesWatched: watchedCount,
      totalHours: (totalMinutes / 60).toFixed(1),
      percentageComplete,
      dateAdded: watchedItem ? new Date(watchedItem.addedAt || Date.now()).toLocaleDateString() : null,
    };
  }, [user, mediaType, watchedEpisodes, details?.number_of_episodes, seasonDetails?.episodes, watchedItem]);

  const { data: similarTitles, isLoading: isSimilarLoading } = useQuery({
    queryKey: ["similar-titles", mediaType, mediaId, language],
    queryFn: () => getSimilar(mediaType, mediaId, language),
    enabled: !!mediaId,
    retry: 3,
  });

  const isBlockedByPolicy =
    !!details &&
    ((details as { blocked_by_policy?: boolean }).blocked_by_policy === true ||
      !isMediaAllowedBySafety(
        { ...details, rating: getPolicyRatingTag(mediaType, details) },
        strictFiltering,
        moderateFiltering,
      ));

  useEffect(() => {
    if (details && !isBlockedByPolicy && (details.title || details.name)) {
      const title = details.title || details.name || "";
      saveLastViewed(mediaId, title, mediaType);
      addToRecentlyViewed({ id: mediaId, mediaType, title, posterPath: details.poster_path || undefined });
    }
  }, [details, isBlockedByPolicy, mediaId, mediaType, saveLastViewed]);

  // Cast pagination
  useEffect(() => {
    const container = castScrollRef.current;
    if (!container || !((details?.credits?.cast?.length ?? 0) > 0)) return;

    const updateCastPaging = () => {
      const hasScroll = container.scrollWidth > container.clientWidth;
      const totalPages = hasScroll ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth)) : 1;
      const cards = Array.from(container.children) as HTMLElement[];
      let nearestChildIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const distance = Math.abs(card.offsetLeft - container.scrollLeft);
        if (distance < nearestDistance) { nearestDistance = distance; nearestChildIndex = index; }
      });
      const nextPage = hasScroll
        ? Math.min(totalPages - 1, Math.round((nearestChildIndex / Math.max(1, cards.length - 1)) * (totalPages - 1)))
        : 0;
      setCastPageCount(totalPages);
      setActiveCastPage(nextPage);
    };

    updateCastPaging();
    const resizeObserver = new ResizeObserver(updateCastPaging);
    resizeObserver.observe(container);
    container.addEventListener("scroll", updateCastPaging, { passive: true });
    return () => { resizeObserver.disconnect(); container.removeEventListener("scroll", updateCastPaging); };
  }, [details?.credits?.cast?.length]);

  // SEO
  const _title = details ? details.title || details.name || "" : "";
  const _releaseDate = details ? details.release_date || details.first_air_date : null;
  const _year = _releaseDate ? new Date(_releaseDate).getFullYear() : null;
  const seoTitle = _title ? `${_title} | CineTrekker` : undefined;
  useDocumentTitle(seoTitle);

  const seasons = useMemo(
    () => details?.number_of_seasons ? Array.from({ length: details.number_of_seasons }, (_, i) => i + 1) : [],
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

  const seasonProgress = useMemo(() => {
    if (!seasonDetails?.episodes || mediaType !== "tv") return {};
    const progress: Record<number, { watched: number; total: number; percentage: number }> = {};
    seasons.forEach((seasonNum) => {
      const seasonEpisodes = seasonDetails.episodes.filter(
        ep => ep.season_number === seasonNum && ep.air_date && ep.air_date <= todayDateKey
      );
      const totalEpisodes = seasonEpisodes.length;
      const watchedCount = seasonEpisodes.filter(ep =>
        isEpisodeWatched(mediaId, ep.season_number, ep.episode_number)
      ).length;
      progress[seasonNum] = { watched: watchedCount, total: totalEpisodes, percentage: totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0 };
    });
    return progress;
  }, [seasonDetails?.episodes, seasons, mediaType, isEpisodeWatched, mediaId, todayDateKey]);

  useEffect(() => {
    if (mediaType !== "tv" || !seasonDetails?.episodes) return;
    let lastWatchedSeason = 1;
    let maxWatchedEpisodes = 0;
    Object.entries(seasonProgress).forEach(([seasonNum, progress]) => {
      if (progress.watched > maxWatchedEpisodes) { maxWatchedEpisodes = progress.watched; lastWatchedSeason = parseInt(seasonNum); }
    });
    setExpandedSeason((maxWatchedEpisodes > 0 ? lastWatchedSeason : 1).toString());
  }, [seasonProgress, seasonDetails?.episodes, mediaType]);

  useEffect(() => {
    if (mediaType !== "tv") return;
    if (selectedSeason && availableSeasonNumbers.includes(selectedSeason)) return;
    if (availableSeasonNumbers.length > 0) { setSelectedSeason(availableSeasonNumbers[0]); return; }
    if (!selectedSeason && seasons.length > 0) setSelectedSeason(seasons[seasons.length - 1]);
  }, [availableSeasonNumbers, mediaType, seasons, selectedSeason]);

  // ─────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────
  if (isLoading && !detailsLoadingTimedOut) {
    return (
      <div className="min-h-screen">
        <div className="relative h-[60vh] overflow-hidden -mt-16">
          <div className="backdrop-skeleton h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/80" />
          <div className="absolute left-4 top-20 z-10 h-10 w-28 rounded-lg skeleton-shimmer bg-background/60" />
        </div>
        <div className="page-container relative z-10 -mt-32 pb-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <div className="mx-auto w-48 flex-shrink-0 md:mx-0 md:w-64">
              <div className="poster-skeleton rounded-2xl shadow-2xl" />
            </div>
            <div className="flex-1 space-y-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-5 w-12 rounded-md skeleton-shimmer" />
                </div>
                <div className="space-y-3">
                  <div className="h-12 w-full max-w-xl rounded-xl skeleton-shimmer" />
                  <div className="h-6 w-2/3 rounded-xl skeleton-shimmer" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {[1,2,3].map(i => <div key={i} className="h-8 w-20 rounded-full skeleton-shimmer" />)}
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  {[1,2,3].map(i => <div key={i} className="h-10 w-40 rounded-lg skeleton-shimmer" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (detailsLoadingTimedOut) {
    return <MovieRouteError message={t("details.timeout", "Loading took too long. Please check your connection and try again.")} onRetry={() => refetch()} />;
  }

  if (!isValidId) {
    return <TitleUnavailable title={t("search.noResultsTitle", "No results available")} description={t("details.invalidId", "Invalid title id.")} homeLabel={t("nav.home")} />;
  }

  if (isError || !details) {
    logger.warn("[Details] Error loading media data", error);
    const errorMessage = (error as Error)?.message || "";
    if (errorMessage.includes("404")) {
      return <TitleUnavailable title={t("search.noResultsTitle", "No results available")} description={t("details.invalidId", "This TMDB ID is invalid or unavailable.")} homeLabel={t("nav.home")} />;
    }
    return <MovieRouteError message={(error as Error)?.message || t("common.error")} onRetry={() => refetch()} />;
  }

  if (isBlockedByPolicy) {
    const activeMode = strictFiltering ? t("details.contentBlockedModeStrict", "Strict mode") : t("details.contentBlockedModeModerate", "Moderate mode");
    return (
      <TitleUnavailable
        title={t("details.contentBlockedTitle", "Title unavailable")}
        description={`${t("details.contentBlockedDescription", "This title is hidden by {{mode}}.", { mode: activeMode })} ${t("details.contentBlockedSettingsHint", "To access it, go to Settings > Content Safety and adjust your filtering mode.")}`}
        homeLabel={t("nav.home")}
      />
    );
  }

  // ─────────────────────────────────────────
  // DERIVE DATA
  // ─────────────────────────────────────────
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
  const contentRatingTag = getPolicyRatingTag(mediaType, details);

  // Directors & crew
  const directors = details.credits?.crew?.filter(c => c.job === "Director") ?? [];
  const writers = details.credits?.crew?.filter(c => c.job === "Screenplay" || c.job === "Writer" || c.job === "Story") ?? [];
  const composers = details.credits?.crew?.filter(c => c.department === "Sound" && (c.job === "Original Music Composer" || c.job === "Music")) ?? [];
  const cinematographers = details.credits?.crew?.filter(c => c.job === "Director of Photography") ?? [];
  const creators = details.created_by ?? [];

  // Keywords
  const keywords: Keyword[] = details.keywords?.keywords ?? details.keywords?.results ?? [];

  // Videos — prefer official trailers first, then teasers, then others
  const allVideos = details.videos?.results?.filter(v => v.site === "YouTube") ?? [];
  const trailers = allVideos.filter(v => v.type === "Trailer");
  const teasers = allVideos.filter(v => v.type === "Teaser");
  const clips = allVideos.filter(v => v.type === "Clip");
  const bts = allVideos.filter(v => v.type === "Behind the Scenes" || v.type === "Featurette");
  const orderedVideos = [...trailers, ...teasers, ...clips, ...bts].slice(0, 12);
  const featuredTrailerKey = trailers[0]?.key ?? teasers[0]?.key;

  // External links
  const imdbId = details.imdb_id ?? details.external_ids?.imdb_id;
  const homepage = details.homepage;

  // Providers
  const providerRegion = "US";
  const providerData = watchProviders?.results?.[providerRegion] || watchProviders?.results?.US || null;
  const dedupeProviders = (providers: Provider[] = []) => {
    const seen = new Set<number>();
    return providers.filter(p => { if (seen.has(p.provider_id)) return false; seen.add(p.provider_id); return true; });
  };
  const flatrateProviders = dedupeProviders(providerData?.flatrate || []);
  const rentProviders = dedupeProviders(providerData?.rent || []);
  const buyProviders = dedupeProviders(providerData?.buy || []);

  const publishedEpisodes =
    mediaType === "tv" && seasonDetails?.episodes
      ? seasonDetails.episodes.filter(ep => ep.air_date && ep.air_date <= todayDateKey)
      : [];

  // Recommendations / Similar
  const currentGenreIds = new Set(details.genres?.map(g => g.id) || details.genre_ids || []);
  const originalLanguage = details.original_language;
  const scoreSimilarity = (item: Media & { original_language?: string }): number => {
    let score = 0;
    const itemGenres = item.genre_ids || [];
    const genreOverlap = itemGenres.filter(gid => currentGenreIds.has(gid)).length;
    score += genreOverlap * 5;
    if (originalLanguage && item.original_language === originalLanguage) score += 4;
    if (genreOverlap === 0 && currentGenreIds.size > 0) score -= 10;
    if (item.vote_average && rating) { const diff = Math.abs(item.vote_average - rating); if (diff <= 2) score += 1; }
    if (item.vote_count && item.vote_count > 100) score += 0.5;
    return score;
  };
  const recommendationsResults = details.recommendations?.results || [];
  const similarResults = details.similar?.results || [];
  let combinedRecommendations = recommendationsResults.map(item => ({ ...item, media_type: mediaType }));
  if (combinedRecommendations.length < 10) {
    const seenIds = new Set(combinedRecommendations.map(r => r.id));
    combinedRecommendations = [...combinedRecommendations, ...similarResults.filter(item => !seenIds.has(item.id)).map(item => ({ ...item, media_type: mediaType }))];
  }
  const recommendedItems = combinedRecommendations
    .map(item => ({ ...item, _score: scoreSimilarity(item as Media & { original_language?: string }) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 12);

  const shouldShowOverviewToggle = overview.length > 280 || overview.includes("\n");
  const isPinnedFavorite = pinnedFavoriteKeys.includes(currentMediaKey);

  // SEO
  const seoDescription = [details.overview || "", releaseDate ? `Release: ${releaseDate}.` : "", rating > 0 ? `Rating: ${rating.toFixed(1)}/10.` : ""].filter(Boolean).join(" ").slice(0, 160);
  const seoImage = getImageUrl(details.poster_path, "w500");
  const detailPath = buildMediaPath(mediaType, mediaId, title);
  const seoCanonical = buildCanonicalUrl(detailPath);
  const seoKeywords = [title, ...(details.genres?.map(g => g.name) || []), mediaType === "movie" ? "movie" : "TV show", year?.toString(), "streaming", "watch online"].filter(Boolean).join(", ");

  // ─────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────
  const handleAddToWatchlist = async () => {
    const nextState = !optimisticInWatchlist;
    setOptimisticInWatchlist(nextState);
    setIsWatchlistPending(true);
    try {
      if (nextState) await addToWatchlist(mediaId, mediaType);
      else await removeFromWatchlist(mediaId, mediaType);
    } catch { setOptimisticInWatchlist(!nextState); }
    finally { setIsWatchlistPending(false); }
  };

  const handleMarkAsWatched = async () => {
    if (optimisticWatched) {
      setOptimisticWatched(false); setIsWatchedPending(true);
      try { await removeFromWatched(mediaId, mediaType); }
      catch { setOptimisticWatched(true); }
      finally { setIsWatchedPending(false); }
    } else {
      setTempRating(watchedItem?.rating || 5);
      setTempNote(watchedItem?.note || "");
      setTempStatus(watchedItem?.status || "completed");
      if (mediaType === "tv" && user) {
        setStatusDialogOpen(true);
      } else {
        setOptimisticWatched(true); setIsWatchedPending(true);
        try { await addToWatched(mediaId, mediaType, watchedItem?.rating || 5, watchedItem?.note || "", watchedItem?.status || "completed"); }
        catch { setOptimisticWatched(false); }
        finally { setIsWatchedPending(false); }
      }
    }
  };

  const handleSaveStatus = ({ rating: r, note: n, status: s }: { rating: number; note: string; status: "watching" | "completed" | "dropped" | "plan_to_watch" }) => {
    if (watched) updateWatchedItem(mediaId, mediaType, { rating: r, note: n, status: s });
    else addToWatched(mediaId, mediaType, r, n, s);
    setStatusDialogOpen(false);
  };

  const handleInlineRatingSubmit = async () => {
    if (!user) return;
    const ratingOutOf10 = inlineStarRating * 2;
    const status = watchedItem?.status || "completed";
    if (watched) updateWatchedItem(mediaId, mediaType, { rating: ratingOutOf10, note: inlineReviewText, status });
    else await addToWatched(mediaId, mediaType, ratingOutOf10, inlineReviewText, status);
    setOptimisticWatched(true);
    toast({ title: t("details.ratingSaved", "Rating saved"), description: t("details.ratingSavedDesc", "Your rating and review have been saved.") });
  };

  const handleStarClick = (r: number) => { setInlineStarRating(r); setHasInteractedWithStars(true); setShowReviewTextarea(true); };

  const handleEpisodeToggle = (seasonNumber: number, episodeNumber: number, episodeName: string, airDate: string | null) => {
    if (isEpisodeWatched(mediaId, seasonNumber, episodeNumber)) {
      removeEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber });
    } else {
      markEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber, episodeName, airDate: airDate || undefined, showName: title, posterPath: details?.poster_path });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${detailPath}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t("details.linkCopied", "Link copied!"), description: t("details.linkCopiedDesc", "The page URL has been copied to your clipboard.") });
    } catch {
      toast({ title: t("details.linkCopyFailed", "Failed to copy link"), variant: "destructive" });
    }
  };

  const handleTogglePinnedFavorite = () => {
    const alreadyPinned = isPinnedFavorite;
    void persistPinnedFavorites(alreadyPinned ? pinnedFavoriteKeys.filter(k => k !== currentMediaKey) : [...pinnedFavoriteKeys, currentMediaKey]);
    toast({ title: alreadyPinned ? t("details.removedFromFavorites", "Removed from favorites") : t("details.pinnedToFavorites", "Pinned to favorites") });
  };

  const handlePlayVideo = (key: string) => { setTrailerVideoKey(key); setTrailerOpen(true); };

  // ─────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────
  const renderProviderGroup = (providers: Provider[], label: string) => {
    if (!providers.length) return null;
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">{label}</p>
        <div className="flex flex-wrap gap-3">
          {providers.map(p => {
            const href = getProviderWatchUrl(p.provider_id, title, mediaId) || getProviderUrlFromData(p, providerData ?? undefined) || "";
            const logoEl = p.logo_path ? (
              <Image src={getImageUrl(p.logo_path, "w92") || ""} alt={p.provider_name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><span className="text-xs font-bold">{p.provider_name.slice(0, 2)}</span></div>
            );
            const inner = (
              <div title={p.provider_name} className="flex flex-col items-center gap-1.5 group">
                <div className="rounded-xl border border-white/10 bg-white/5 p-1 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-200">{logoEl}</div>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors max-w-[52px] text-center leading-tight">{p.provider_name}</span>
              </div>
            );
            return href ? (
              <a key={p.provider_id} href={href} target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-105 active:scale-95" aria-label={`Watch on ${p.provider_name}`}>{inner}</a>
            ) : (
              <div key={p.provider_id} className="opacity-60 cursor-not-allowed">{inner}</div>
            );
          })}
        </div>
      </div>
    );
  };

  const scrollToSection = (sectionId: string) =>
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: "smooth" });

  const navSections = [
    { id: "overview", label: t("details.overview", "Overview"), show: true },
    { id: "videos", label: "Videos", show: orderedVideos.length > 0 },
    { id: "cast", label: t("details.cast", "Cast"), show: (details.credits?.cast?.length ?? 0) > 0 },
    { id: "episodes", label: t("details.episodes", "Episodes"), show: mediaType === "tv" && seasons.length > 0 },
    { id: "similar", label: t("details.similar", "Similar"), show: (similarTitles?.results?.length ?? 0) > 0 },
    { id: "reviews", label: t("details.reviews", "Reviews"), show: true },
  ].filter(s => s.show);

  // ─────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────
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
        jsonLd={[toBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: mediaType === "movie" ? "Movies" : "TV Shows", path: "/search" },
          { name: title, path: detailPath },
        ])]}
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

      {/* ═══════════════════════════════════════
          CINEMATIC HERO
      ═══════════════════════════════════════ */}
      <div ref={heroRef} className="relative overflow-hidden -mt-16" style={{ height: "clamp(400px, 65vh, 700px)" }}>
        {/* Parallax backdrop */}
        <div ref={backdropRef} className="absolute inset-0 will-change-transform" style={{ height: "130%", top: "-15%" }}>
          {backdropUrl ? (
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
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          )}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent pointer-events-none" />

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-20 left-4 z-20 flex items-center gap-2 text-sm text-white/80 hover:text-white bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary border border-white/10"
          aria-label={t("nav.home")}
        >
          <ChevronLeft className="w-4 h-4" />
          {t("nav.home")}
        </Link>

        {/* Hero content — title + meta + play CTA inside the hero */}
        <div className="absolute bottom-0 left-0 right-0 z-10 page-container pb-8 pt-16">
          <div className="flex flex-col gap-3 max-w-3xl">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-white/20 bg-black/40 text-white/90 text-xs uppercase tracking-[0.16em] backdrop-blur-sm">
                {mediaType === "movie" ? t("common.movie") : t("common.tvShow")}
              </Badge>
              {year && <span className="text-sm text-white/70 font-medium">{year}</span>}
              {contentRatingTag && (
                <span className="px-2 py-0.5 text-xs font-bold rounded border border-white/30 bg-black/40 text-white/90 backdrop-blur-sm">
                  {contentRatingTag}
                </span>
              )}
              {details.status && (
                <span className={cn("px-2.5 py-0.5 text-xs font-semibold rounded-full border backdrop-blur-sm", getStatusColor(details.status))}>
                  {details.status}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
              {title}
            </h1>

            {/* Tagline */}
            {details.tagline && (
              <p className="text-base italic text-white/60 md:text-lg">"{details.tagline}"</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
              {rating > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-yellow-400">{rating.toFixed(1)}</span>
                  {details.vote_count > 0 && <span className="text-white/50 text-xs">({details.vote_count.toLocaleString()} votes)</span>}
                </span>
              )}
              {runtime && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{runtime} {t("details.minutes")}</span>
              )}
              {details.number_of_seasons && (
                <span>{details.number_of_seasons} {t("details.seasons")}</span>
              )}
              {/* Director name in hero */}
              {directors.length > 0 && (
                <span className="flex items-center gap-1">
                  <Film className="w-3.5 h-3.5" />
                  {directors.slice(0, 2).map(d => d.name).join(", ")}
                </span>
              )}
            </div>

            {/* Hero CTA */}
            {featuredTrailerKey && (
              <div className="mt-2">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-black hover:bg-white/90 font-bold shadow-2xl transition-transform hover:scale-105 active:scale-95"
                  onClick={() => handlePlayVideo(featuredTrailerKey)}
                >
                  <PlayCircle className="w-5 h-5 fill-black" />
                  Watch Trailer
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          STICKY NAV
      ═══════════════════════════════════════ */}
      {isStickyNavVisible && (
        <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60 shadow-sm">
          <div className="page-container">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 hide-scrollbar">
              {navSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    activeSection === s.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════ */}
      <div className="page-container relative z-10 -mt-4 pb-24 md:pb-0">

        {/* ── Poster + Action row ── */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start">

          {/* Poster */}
          <div className="flex-shrink-0 mx-auto md:mx-0 -mt-20 md:-mt-32 z-10">
            <div className="relative group">
              {details.poster_path ? (
                <Image
                  src={posterUrl}
                  srcSet={posterSrcSet || undefined}
                  sizes="(max-width: 768px) 160px, 220px"
                  alt={getMediaAltText(title, mediaType, "poster")}
                  width={500}
                  height={750}
                  loading="lazy"
                  showSkeleton
                  className="w-40 md:w-56 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-2 border-white/10 group-hover:border-primary/40 transition-all duration-300"
                />
              ) : (
                <div className="w-40 md:w-56 aspect-[2/3] bg-muted rounded-2xl flex flex-col items-center justify-center text-muted-foreground border-2 border-white/10">
                  <Film className="h-12 w-12 opacity-40" />
                  <span className="mt-2 text-xs font-medium">No Poster</span>
                </div>
              )}
              {/* Floating rating badge on poster */}
              {rating > 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-3 py-1 flex items-center gap-1 shadow-lg whitespace-nowrap">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info panel */}
          <div className="flex-1 space-y-5 pb-4 mt-4 md:mt-0">

            {/* Genres */}
            {details.genres && details.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {details.genres.map(genre => (
                  <Badge key={genre.id} variant="secondary" className="border border-white/10 bg-white/8 text-foreground px-3 py-1 rounded-full text-xs font-medium">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Director / Creators */}
            {(directors.length > 0 || creators.length > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">{directors.length > 0 ? "Directed by" : "Created by"}</span>
                <div className="flex flex-wrap gap-x-2">
                  {(directors.length > 0 ? directors : creators).slice(0, 3).map((person, i) => (
                    <Link
                      key={person.id}
                      to={buildPersonPath(person.id, person.name)}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {person.name}{i < Math.min((directors.length > 0 ? directors : creators).length, 3) - 1 ? "," : ""}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Original title if different */}
            {details.original_title && details.original_title !== details.title && (
              <p className="text-xs text-muted-foreground">Original: <span className="text-foreground/80">{details.original_title}</span></p>
            )}
            {details.original_name && details.original_name !== details.name && (
              <p className="text-xs text-muted-foreground">Original: <span className="text-foreground/80">{details.original_name}</span></p>
            )}

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/72">
              {runtime && (
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5" />{runtime} {t("details.minutes")}
                </div>
              )}
              {releaseDate && (
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5" />{new Date(releaseDate).toLocaleDateString(language)}
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
              {/* Networks */}
              {details.networks && details.networks.length > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Tv className="w-3.5 h-3.5" />
                  {details.networks.slice(0, 2).map(n => n.name).join(", ")}
                </div>
              )}
              {/* Language */}
              {details.original_language && (
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {new Intl.DisplayNames([language], { type: "language" }).of(details.original_language) || details.original_language}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="rounded-2xl border border-border/60 bg-card/55 p-5 shadow-lg backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                {t("details.primaryActions", "Your Next Move")}
              </p>
              {!user && (
                <p className="text-xs text-muted-foreground mb-3">
                  {t("details.guestTrackingHint", "Guest actions save locally. Create an account later for sync.")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={optimisticInWatchlist ? "secondary" : "default"}
                  className={cn(
                    "gap-2 sm:min-w-[160px]",
                    optimisticInWatchlist
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                  onClick={handleAddToWatchlist}
                  disabled={isWatchlistPending}
                  aria-label={optimisticInWatchlist ? t("actions.removeFromWatchlist") : t("actions.addToWatchlist")}
                >
                  {isWatchlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> : optimisticInWatchlist ? <Bookmark className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                  {optimisticInWatchlist ? t("details.inWatchlist", "In Watchlist ✓") : t("details.addToWatchlist", "Add to Watchlist")}
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "gap-2 sm:min-w-[140px]",
                    optimisticWatched
                      ? "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-border bg-background text-foreground hover:bg-accent",
                  )}
                  onClick={handleMarkAsWatched}
                  disabled={isWatchedPending}
                  aria-label={optimisticWatched ? t("actions.updateWatched") : t("actions.markAsWatched")}
                >
                  {isWatchedPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t("details.watched", "Watched")}
                </Button>

                <FollowUpdatesButton mediaId={mediaId} mediaType={mediaType} title={title} posterPath={details.poster_path} details={details} />

                <Button variant={isPinnedFavorite ? "secondary" : "ghost"} className="gap-2" onClick={handleTogglePinnedFavorite} aria-label={isPinnedFavorite ? "Unpin from favorites" : "Pin to favorites"}>
                  <Pin className="w-4 h-4" />
                  {isPinnedFavorite ? "Pinned" : "Pin"}
                </Button>

                {featuredTrailerKey && (
                  <Button variant="outline" className="gap-2" onClick={() => handlePlayVideo(featuredTrailerKey)} aria-label={t("details.watchTrailer", "Watch Trailer")}>
                    <PlayCircle className="w-4 h-4" />
                    {t("details.watchTrailer", "Watch Trailer")}
                  </Button>
                )}

                <Button variant="outline" className="gap-2" onClick={handleShare} aria-label={t("details.share", "Share")}>
                  <Share2 className="w-4 h-4" />
                  {t("details.share", "Share")}
                </Button>

                {mediaType === "tv" && seasons.length > 0 && user && (
                  <Dialog open={episodesDialogOpen} onOpenChange={setEpisodesDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2" aria-label={t("episodes.allEpisodes")}>
                        <PlayCircle className="w-4 h-4" />
                        {t("episodes.allEpisodes")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{t("episodes.allEpisodes")} - {title}</DialogTitle>
                        <DialogDescription>{t("tv.selectEpisodes", "Select the episodes you have watched")}</DialogDescription>
                      </DialogHeader>
                      <Accordion type="single" collapsible className="w-full" onValueChange={(val) => setSelectedSeason(val ? parseInt(val) : null)}>
                        {seasons.map(seasonNum => (
                          <AccordionItem key={seasonNum} value={seasonNum.toString()}>
                            <AccordionTrigger className="md:hover:no-underline">
                              <span className="flex items-center gap-2">{t("episodes.season")} {seasonNum}</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              {selectedSeason === seasonNum && seasonDetails?.episodes ? (
                                <div className="space-y-2">
                                  {seasonDetails.episodes.map(episode => {
                                    const episodeWatched = isEpisodeWatched(mediaId, seasonNum, episode.episode_number);
                                    return (
                                      <div key={episode.id} className={cn("flex items-start gap-3 p-3 rounded-lg transition-colors", episodeWatched ? "bg-muted/50" : "md:hover:bg-muted/30")}>
                                        <Checkbox checked={episodeWatched} onCheckedChange={() => handleEpisodeToggle(seasonNum, episode.episode_number, episode.name, episode.air_date)} aria-label={`${episodeWatched ? t("actions.markAsUnwatched") : t("actions.markAsWatched")} ${episode.name}`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">E{episode.episode_number}</span>
                                            <span className={cn("text-sm", episodeWatched && "line-through opacity-60")}>{episode.name}</span>
                                          </div>
                                          {episode.air_date && <span className="text-xs text-muted-foreground">{new Date(episode.air_date).toLocaleDateString(language)}</span>}
                                        </div>
                                        {episode.runtime && <span className="text-xs text-muted-foreground">{episode.runtime} {t("details.minutes")}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">{t("common.loading")}</div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <WatchedStatusDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} onSave={handleSaveStatus} initialRating={tempRating} initialNote={tempNote} initialStatus={tempStatus} mediaTitle={title} />
            <TrailerModal id={mediaId} mediaType={mediaType} open={trailerOpen} onClose={() => { setTrailerOpen(false); setTrailerVideoKey(undefined); }} />
          </div>
        </div>

        {/* ═══════════════════════════════════════
            OVERVIEW + FACTS GRID
        ═══════════════════════════════════════ */}
        <div
          ref={(el) => { if (el) sectionRefs.current.overview = el; }}
          id="section-overview"
          className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]"
        >
          {/* Overview */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55 mb-3">
              {t("details.overview", "Overview")}
            </p>
            <p className={cn("max-w-3xl whitespace-pre-line text-sm leading-7 text-foreground/80 md:text-base", !showFullOverview && shouldShowOverviewToggle && "line-clamp-4")}>
              {overview}
            </p>
            {shouldShowOverviewToggle && (
              <Button variant="link" size="sm" className="mt-2 px-0 text-primary" onClick={() => setShowFullOverview(s => !s)}>
                {showFullOverview ? t("common.readLess", "Read Less") : t("common.readMore", "Read More")}
              </Button>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <div className="mt-5 pt-5 border-t border-white/8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55 mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {(showAllKeywords ? keywords : keywords.slice(0, 12)).map(kw => (
                    <span key={kw.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-foreground/70 hover:border-primary/40 hover:text-foreground transition-colors cursor-default">
                      {kw.name}
                    </span>
                  ))}
                  {keywords.length > 12 && (
                    <button onClick={() => setShowAllKeywords(s => !s)} className="text-xs text-primary hover:underline">
                      {showAllKeywords ? "Show less" : `+${keywords.length - 12} more`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Facts & Details sidebar */}
          <div className="space-y-4">
            {/* Watch Options */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55 mb-4">
                {t("details.whereToWatch", "Where to Watch")}
              </p>
              {(flatrateProviders.length > 0 || rentProviders.length > 0 || buyProviders.length > 0) ? (
                <div>
                  {renderProviderGroup(flatrateProviders, t("details.streaming", "Streaming"))}
                  {renderProviderGroup(rentProviders, t("details.rent", "Rent"))}
                  {renderProviderGroup(buyProviders, t("details.buy", "Buy"))}
                  <p className="text-[10px] text-muted-foreground mt-2">Watch options data by JustWatch</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("details.notAvailableInRegion", "Not available in your region")}</p>
              )}
            </div>

            {/* Facts panel */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55 mb-4">Details</p>
              <dl className="space-y-2.5 text-sm">
                {details.status && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className={cn("font-medium text-right px-2 py-0.5 rounded text-xs border", getStatusColor(details.status))}>{details.status}</dd>
                  </div>
                )}
                {releaseDate && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{mediaType === "movie" ? "Release Date" : "First Air Date"}</dt>
                    <dd className="font-medium text-right">{new Date(releaseDate).toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" })}</dd>
                  </div>
                )}
                {runtime && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Runtime</dt>
                    <dd className="font-medium">{Math.floor(runtime / 60) > 0 ? `${Math.floor(runtime / 60)}h ` : ""}{runtime % 60 > 0 ? `${runtime % 60}m` : ""}</dd>
                  </div>
                )}
                {details.original_language && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Language</dt>
                    <dd className="font-medium">{new Intl.DisplayNames([language], { type: "language" }).of(details.original_language) || details.original_language}</dd>
                  </div>
                )}
                {details.production_countries && details.production_countries.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Country</dt>
                    <dd className="font-medium text-right">{details.production_countries.slice(0, 2).map(c => c.name).join(", ")}</dd>
                  </div>
                )}
                {mediaType === "movie" && (details.budget ?? 0) > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd className="font-medium">{formatCurrency(details.budget!)}</dd>
                  </div>
                )}
                {mediaType === "movie" && (details.revenue ?? 0) > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Box Office</dt>
                    <dd className="font-medium text-emerald-400">{formatCurrency(details.revenue!)}</dd>
                  </div>
                )}
                {details.production_companies && details.production_companies.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground shrink-0">Studio</dt>
                    <dd className="font-medium text-right text-xs">{details.production_companies.slice(0, 3).map(c => c.name).join(" · ")}</dd>
                  </div>
                )}
              </dl>
              {/* External links */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/8">
                {imdbId && (
                  <a href={`https://www.imdb.com/title/${imdbId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] text-xs font-bold hover:bg-[#F5C518]/20 transition-colors">
                    IMDb <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {homepage && (
                  <a href={homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-foreground/70 text-xs font-medium hover:bg-white/10 hover:text-foreground transition-colors">
                    Official Site <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* TV Personal stats */}
            {user && personalStats && mediaType === "tv" && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55 mb-4">
                  {t("details.yourStats", "Your Stats")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center rounded-xl bg-white/5 p-3">
                    <p className="text-2xl font-bold text-foreground">{personalStats.episodesWatched}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("details.episodesWatched", "Episodes")}</p>
                  </div>
                  <div className="text-center rounded-xl bg-white/5 p-3">
                    <p className="text-2xl font-bold text-foreground">{personalStats.totalHours}h</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("details.totalWatchTime", "Watch Time")}</p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-white/5 p-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span className="font-bold text-foreground">{personalStats.percentageComplete}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${personalStats.percentageComplete}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            VIDEO GALLERY
        ═══════════════════════════════════════ */}
        {orderedVideos.length > 0 && (
          <section
            ref={(el) => { if (el) sectionRefs.current.videos = el; }}
            id="section-videos"
            className="mt-12"
          >
            <h2 className="section-title mb-4">Videos & Trailers</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth snap-x snap-mandatory">
              {orderedVideos.map(video => (
                <VideoCard key={video.id} video={video} onPlay={handlePlayVideo} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            CAST & CREW
        ═══════════════════════════════════════ */}
        {details.credits?.cast && details.credits.cast.length > 0 && (
          <section
            ref={(el) => { if (el) sectionRefs.current.cast = el; }}
            id="section-cast"
            className="mt-12"
          >
            <h2 className="section-title">{t("details.cast")}</h2>
            <div ref={castScrollRef} className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth snap-x snap-mandatory">
              {details.credits.cast.slice(0, 12).map(person => (
                <Link
                  key={person.id}
                  to={buildPersonPath(person.id, person.name)}
                  className="flex-shrink-0 w-28 md:w-32 group snap-start"
                >
                  {/* Portrait card */}
                  <div className="relative rounded-xl overflow-hidden aspect-[2/3] mb-2 border border-white/10 group-hover:border-primary/50 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-primary/10">
                    {person.profile_path ? (
                      <Image
                        src={getImageUrl(person.profile_path, "w185") || ""}
                        alt={person.name}
                        width={185}
                        height={278}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        showSkeleton
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-3xl font-bold text-muted-foreground">{person.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{person.name}</p>
                  {person.character && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{person.character}</p>}
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
                      const targetChildIndex = castPageCount <= 1 || cards.length <= 1 ? 0 : Math.round((index * (cards.length - 1)) / (castPageCount - 1));
                      cards[targetChildIndex]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
                    }}
                    active={index === activeCastPage}
                    aria-label={t("details.goToCastPage", "Go to cast page {{page}}", { page: index + 1 })}
                    aria-current={index === activeCastPage ? "true" : undefined}
                  />
                ))}
              </PaginationDots>
            )}

            {/* Crew Highlights */}
            {(directors.length > 0 || writers.length > 0 || cinematographers.length > 0 || composers.length > 0 || creators.length > 0) && (
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {directors.slice(0, 2).map(person => (
                  <Link key={`dir-${person.id}`} to={buildPersonPath(person.id, person.name)} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Director</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{person.name}</p>
                  </Link>
                ))}
                {creators.slice(0, 2).map(person => (
                  <Link key={`cr-${person.id}`} to={buildPersonPath(person.id, person.name)} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Creator</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{person.name}</p>
                  </Link>
                ))}
                {writers.slice(0, 2).map(person => (
                  <Link key={`wr-${person.id}`} to={buildPersonPath(person.id, person.name)} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Writer</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{person.name}</p>
                  </Link>
                ))}
                {cinematographers.slice(0, 1).map(person => (
                  <Link key={`dp-${person.id}`} to={buildPersonPath(person.id, person.name)} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cinematography</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{person.name}</p>
                  </Link>
                ))}
                {composers.slice(0, 1).map(person => (
                  <Link key={`co-${person.id}`} to={buildPersonPath(person.id, person.name)} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Music</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{person.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════
            USER RATING & REVIEW
        ═══════════════════════════════════════ */}
        <div className="ct-panel p-6 mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("details.yourRatingReview", "Your Rating & Review")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {user
                  ? t("details.ratingReviewSignedInPrompt", "Keep a personal score and short note for this title.")
                  : t("details.ratingReviewGuestPrompt", "Sign in to rate this title and save a personal review.")}
              </p>
            </div>
            {/* TMDB comparison */}
            {rating > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">TMDB Avg</p>
                  <p className="text-xl font-bold text-foreground">{rating.toFixed(1)}<span className="text-sm text-muted-foreground">/10</span></p>
                  <p className="text-xs text-muted-foreground">{details.vote_count.toLocaleString()} votes</p>
                </div>
                {user && watchedItem?.rating && (
                  <>
                    <div className="w-px h-12 bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Your Rating</p>
                      <p className="text-xl font-bold text-primary">{watchedItem.rating}<span className="text-sm text-muted-foreground">/10</span></p>
                      <p className={cn("text-xs font-medium", watchedItem.rating > rating ? "text-emerald-400" : watchedItem.rating < rating ? "text-red-400" : "text-muted-foreground")}>
                        {watchedItem.rating > rating ? `▲ +${(watchedItem.rating - rating).toFixed(1)}` : watchedItem.rating < rating ? `▼ ${(watchedItem.rating - rating).toFixed(1)}` : "= Avg"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            {!user && <Button asChild variant="outline"><Link to="/login">{t("details.signInToReview", "Sign In to Review")}</Link></Button>}
          </div>

          {user && (
            <div className="space-y-4">
              <StarRating value={inlineStarRating} onChange={handleStarClick} />
              {showReviewTextarea && (
                <div className="space-y-3">
                  <textarea
                    value={inlineReviewText}
                    onChange={e => setInlineReviewText(e.target.value)}
                    placeholder={t("details.reviewPlaceholder", "Write your review here...")}
                    className="w-full min-h-[100px] rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    rows={4}
                  />
                  {hasInteractedWithStars && (
                    <Button type="button" onClick={handleInlineRatingSubmit} className="gap-2" disabled={inlineStarRating === 0}>
                      <MessageSquare className="w-4 h-4" />
                      {watchedItem?.rating ? t("details.updateRating", "Update Rating & Review") : t("details.addRating", "Add Rating & Review")}
                    </Button>
                  )}
                </div>
              )}
              {watchedItem && !hasInteractedWithStars && (
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">{watchedItem.status || "completed"}</Badge>
                    {typeof watchedItem.rating === "number" ? <Badge variant="outline">{watchedItem.rating}/10</Badge> : <Badge variant="outline">{t("details.noRatingYet", "No rating yet")}</Badge>}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {watchedItem.note?.trim() ? watchedItem.note : t("details.noNoteYet", "No note yet. Add a short review so you remember what stood out.")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════
            EPISODES (TV)
        ═══════════════════════════════════════ */}
        {mediaType === "tv" && !user && (
          <div className="glass-card p-4 mt-6 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary md:hover:underline active:underline">{t("auth.signInRequired")}</Link>{" "}{t("home.hero.subtitle")}
          </div>
        )}

        {mediaType === "tv" && seasons.length > 0 && (
          <section
            ref={(el) => { if (el) sectionRefs.current.episodes = el; }}
            id="section-episodes"
            className="ct-panel p-6 mt-12"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("details.availableEpisodes", "Available Episodes")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("details.availableEpisodesDescription", "Browse published episodes and read each episode summary directly from the series page.")}</p>
              </div>
              <div className="flex gap-2 items-center">
                {user && (
                  <Button variant="outline" size="sm" onClick={() => {
                    if (!selectedSeason || !seasonDetails) return;
                    markAllSeasonsWatched({
                      showId: mediaId,
                      allEpisodes: seasonDetails.episodes?.map(ep => ({ season_number: selectedSeason, episode_number: ep.episode_number, name: ep.name, air_date: ep.air_date ?? undefined })) || [],
                      showName: details?.name,
                      posterPath: details?.poster_path,
                    });
                  }} disabled={!selectedSeason || !seasonDetails} className="whitespace-nowrap">
                    <Check className="w-4 h-4 mr-2" />
                    {t("details.markAllSeasonsWatched", "Mark Current Season")}
                  </Button>
                )}
                {/* Season chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {(availableSeasonNumbers.length > 0 ? availableSeasonNumbers : seasons.slice().reverse()).map(seasonNum => {
                    const progress = seasonProgress[seasonNum];
                    const seasonInfo = details.seasons?.find(s => s.season_number === seasonNum);
                    return (
                      <button
                        key={`season-chip-${seasonNum}`}
                        type="button"
                        onClick={() => setSelectedSeason(seasonNum)}
                        className={cn(
                          "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all",
                          selectedSeason === seasonNum
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-background border border-border hover:bg-accent"
                        )}
                      >
                        {t("details.seasonLabel", "Season {{season}}", { season: seasonNum })}
                        {progress && <span className="ml-2 text-xs opacity-75">· {progress.watched}/{progress.total}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-2">
              {!selectedSeason ? (
                <p className="text-sm text-muted-foreground">{t("details.selectSeasonPrompt", "Select a season to view released episodes.")}</p>
              ) : !seasonDetails ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("details.loadingSeasonEpisodes", "Loading season episodes...")}</div>
              ) : publishedEpisodes.length === 0 ? (
                <div className="rounded-2xl border border-border/60 bg-background/30 px-4 py-5 text-sm text-muted-foreground">
                  {t("details.noPublishedEpisodes", "No published episodes are available for this season yet.")}
                </div>
              ) : (
                <div className="space-y-3">
                  {user && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => {
                        const seasonEpisodes = publishedEpisodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name, air_date: ep.air_date ?? undefined }));
                        markSeasonWatched({ showId: mediaId, seasonNumber: selectedSeason!, episodes: seasonEpisodes, showName: details?.name, posterPath: details?.poster_path });
                      }} className="whitespace-nowrap">
                        <Check className="w-4 h-4 mr-2" />
                        {t("details.markSeasonWatched", "Mark All Episodes in Season {{season}}", { season: selectedSeason })}
                      </Button>
                    </div>
                  )}
                  <Accordion type="single" collapsible className="w-full">
                    {publishedEpisodes.map((episode, index) => {
                      const episodeWatched = isEpisodeWatched(mediaId, episode.season_number, episode.episode_number);
                      const isNextEpisode = index > 0 && !isEpisodeWatched(mediaId, publishedEpisodes[index - 1].season_number, publishedEpisodes[index - 1].episode_number);
                      return (
                        <AccordionItem
                          key={`available-episode-${episode.id}`}
                          value={`episode-${episode.id}`}
                          className={isNextEpisode ? "border-l-2 border-l-primary/50" : ""}
                        >
                          <AccordionTrigger className="gap-4 text-left md:hover:no-underline">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Episode still image */}
                              {episode.still_path ? (
                                <div className="flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden hidden sm:block border border-white/10">
                                  <Image
                                    src={getImageUrl(episode.still_path, "w185") || ""}
                                    alt={episode.name}
                                    width={185}
                                    height={104}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              ) : null}
                              {/* Watch toggle */}
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={e => { e.stopPropagation(); handleEpisodeToggle(episode.season_number, episode.episode_number, episode.name, episode.air_date); }}
                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); handleEpisodeToggle(episode.season_number, episode.episode_number, episode.name, episode.air_date); } }}
                                className={cn("mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer", episodeWatched ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-muted text-muted-foreground hover:bg-accent")}
                                aria-label={episodeWatched ? "Mark as unwatched" : "Mark as watched"}
                              >
                                {episodeWatched && <Check className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">S{episode.season_number}E{episode.episode_number}</p>
                                  {isNextEpisode && <Badge variant="outline" className="text-xs">Next Up</Badge>}
                                  {episode.vote_average && episode.vote_average > 0 && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{episode.vote_average.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm font-semibold text-foreground">{episode.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {episode.air_date ? new Date(episode.air_date).toLocaleDateString(language) : t("details.releaseDateUnavailable", "Release date unavailable")}
                                  {episode.runtime ? ` • ${episode.runtime} ${t("details.minutes")}` : ""}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {episode.overview?.trim() ? episode.overview : t("details.noEpisodeDescription", "No description is available for this episode yet.")}
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            MORE LIKE THIS
        ═══════════════════════════════════════ */}
        {recommendedItems.length > 0 && (
          <section
            ref={(el) => { if (el) sectionRefs.current.similar = el; }}
            id="section-similar"
            className="mt-12"
          >
            <h2 className="section-title">{t("details.similar", "More Like This")}</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {recommendedItems.map(item => {
                const itemYear = item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : null;
                const itemRating = item.vote_average ? item.vote_average.toFixed(1) : null;
                return (
                  <Link
                    key={item.id}
                    to={buildMediaPath(mediaType, item.id, item.title || item.name)}
                    className="group relative"
                  >
                    <div className="relative rounded-xl overflow-hidden aspect-[2/3] border border-white/10 group-hover:border-primary/50 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-primary/10">
                      {item.poster_path ? (
                        <Image
                          src={getImageUrl(item.poster_path, "w342") || ""}
                          alt={item.title || item.name || "Poster"}
                          width={170}
                          height={255}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          showSkeleton
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-2xl text-muted-foreground">{(item.title || item.name || "?").charAt(0)}</span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
                        {itemRating && (
                          <span className="flex items-center gap-1 text-xs text-white font-semibold">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{itemRating}
                          </span>
                        )}
                        {itemYear && <span className="text-xs text-white/70">{itemYear}</span>}
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium line-clamp-2 text-foreground/80 group-hover:text-foreground transition-colors">{item.title || item.name}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            REVIEWS / COMMENTS
        ═══════════════════════════════════════ */}
        <div
          ref={(el) => { if (el) sectionRefs.current.reviews = el; }}
          id="section-reviews"
          className="mt-12"
        >
          <MediaComments mediaId={mediaId} mediaType={mediaType} />
        </div>
      </div>
    </>
  );
}
