import { useParams, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  ChevronLeft,
  PlayCircle,
  Loader2,
  Share2,
  ExternalLink,
  Globe,
  Film,
  Tv,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronRight,
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
import { Media, Provider, MediaVideoResult, Keyword } from "@/types/media";
import { getProviderUrlFromData } from "@/lib/providerMap";
import { getProviderWatchUrl } from "@/lib/providerLinks";
import { useUserLists } from "@/contexts/UserListsContext";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useAuth } from "@/contexts/AuthContext";
import { useLastViewed } from "@/hooks/useLastViewed";
import { useEnrichedRatings } from "@/hooks/useEnrichedRatings";
import { useTVSchedule } from "@/hooks/useTVSchedule";
import { useEnrichedTVEpisodes } from "@/hooks/useEnrichedTVDetails";
import { addToRecentlyViewed } from "@/lib/recentlyViewed";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
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
import { getRequestReference } from "@/lib/requestReference";
import { getPublishedEpisodeTotal } from "@/lib/continueWatching/progress";
import { toDisplayTitle } from "@/lib/displayTitle";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { trackProductEvent } from "@/lib/analytics";
import { PaginationDotButton, PaginationDots } from "@/components/ui/pagination-dots";
import {
  buildCanonicalUrl,
  buildMediaPath,
  buildPersonPath,
  getMediaAltText,
  parseMediaPath,
  toBreadcrumbJsonLd,
} from "@/lib/seo";

import { ScoreRing } from "@/components/details/ScoreRing";
import { VideoCard } from "@/components/details/VideoCard";
import { DeferredBlock } from "@/components/details/DeferredBlock";
import { Reveal } from "@/components/details/Reveal";
import {
  getPolicyRatingTag,
  formatCurrency,
  getStatusConfig,
} from "@/components/details/detailsFormatters";

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
export default function Details() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const language = i18n.language;
  const castScrollRef = useRef<HTMLDivElement>(null);
  const castPreviewScrollRef = useRef<HTMLDivElement>(null);
  const videoScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});
  const backdropRef = useRef<HTMLDivElement>(null);

  // Parse the slug to extract the numeric ID
  // Supports both /movie/interstellar-157336 and legacy /movie/157336
  const mediaType: "movie" | "tv" = location.pathname.startsWith("/tv") ? "tv" : "movie";
  const parsed = slug ? parseMediaPath(mediaType, slug) : null;
  const mediaId = parsed?.id ?? NaN;
  const isValidId = Number.isFinite(mediaId) && mediaId > 0;

  const { user } = useAuth();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const { isInWatchlist, isWatched, addToWatchlist, removeFromWatchlist, addToWatched, removeFromWatched, getWatchedItem, updateWatchedItem } = useUserLists();

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

  const { pinnedFavoriteKeys, persistPinnedFavorites } = usePinnedFavorites({ userId: user?.id });
  const currentMediaKey = `${mediaType}-${mediaId}`;

  // ── Parallax backdrop ──
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      if (backdropRef.current) backdropRef.current.style.transform = "";
      return;
    }

    let frameId = 0;
    const update = () => {
      frameId = 0;
      if (backdropRef.current) {
        backdropRef.current.style.transform = `translate3d(0, ${window.scrollY * 0.3}px, 0)`;
      }
    };
    const fn = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", fn);
    };
  }, []);

  // ── Escape ──
  useEffect(() => {
    const fn = () => { if (episodesDialogOpen) setEpisodesDialogOpen(false); if (statusDialogOpen) setStatusDialogOpen(false); if (trailerOpen) setTrailerOpen(false); };
    window.addEventListener("app:escape", fn as EventListener);
    return () => window.removeEventListener("app:escape", fn as EventListener);
  }, [episodesDialogOpen, statusDialogOpen, trailerOpen]);

  // ── Sticky nav ──
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setIsStickyNavVisible(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Active section ──
  useEffect(() => {
    const sections = ["overview", "videos", "cast", "episodes", "similar", "reviews"];
    const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id.replace("section-", "")); }); }, { threshold: 0.15 });
    sections.forEach(s => { const el = sectionRefs.current[s]; if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const { isEpisodeWatched, markEpisodeWatched, removeEpisodeWatched, watchedEpisodes, markSeasonWatched, markAllSeasonsWatched } = useWatchedEpisodes(mediaId);
  const { saveLastViewed } = useLastViewed();

  const { data: details, isLoading, error, isError, refetch } = useQuery({
    queryKey: ["details", mediaType, mediaId, language],
    queryFn: () => mediaType === "movie" ? getMovieDetails(mediaId, language) : getTVDetails(mediaId, language),
    enabled: isValidId && !!mediaType,
    staleTime: 1000 * 60 * 5, // 5 minutes — metadata stable within a browsing session
    retry: 3,
  });

  const detailsLoadingTimedOut = useLoadingTimeout(isLoading, 15000);
  const todayDateKey = new Date().toISOString().slice(0, 10);
  const isSelectedSeasonAvailable =
    mediaType === "tv" &&
    !!selectedSeason &&
    !!details &&
    (
      details.seasons?.some((season) =>
        season.season_number === selectedSeason &&
        season.season_number > 0 &&
        (!season.air_date || season.air_date <= todayDateKey),
      ) ??
      selectedSeason <= (details.number_of_seasons ?? 0)
    );

  const { data: seasonDetails } = useQuery({
    queryKey: ["season-details", mediaId, selectedSeason, language],
    queryFn: () => getTVSeasonDetails(mediaId, selectedSeason!, language),
    enabled: isSelectedSeasonAvailable,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours — season episode lists rarely change
    retry: false,
  });

  const { data: watchProviders } = useQuery({
    queryKey: ["watch-providers", mediaType, mediaId, language],
    queryFn: () => getWatchProviders(mediaType, mediaId),
    enabled: !!mediaId,
    staleTime: 1000 * 60 * 60 * 6, // 6 hours — streaming availability changes slowly
    retry: 3,
  });

  const { data: similarTitles } = useQuery({
    queryKey: ["similar-titles", mediaType, mediaId, language],
    queryFn: () => getSimilar(mediaType, mediaId, language),
    enabled: !!mediaId,
    staleTime: 1000 * 60 * 60, // 1 hour — similar list is stable
    retry: 3,
  });

  const currentImdbId = details?.imdb_id ?? details?.external_ids?.imdb_id;
  const { data: enrichedRatings } = useEnrichedRatings(currentImdbId);
  const { data: tvSchedule } = useTVSchedule(currentImdbId, mediaType === "tv");
  // TVmaze enriches episode air times and runtime — supplementary to TMDB data
  const { data: tvEpisodesData } = useEnrichedTVEpisodes(currentImdbId, mediaType === "tv");
  // Build a O(1) lookup map: "S{n}E{n}" → TVmaze episode enrichment
  const tvmazeEpisodeMap = useMemo(() => {
    const map = new Map<string, { airTime: string | null; runtime: number | null }>();
    if (!tvEpisodesData?.episodes) return map;
    for (const ep of tvEpisodesData.episodes) {
      map.set(`S${ep.seasonNumber}E${ep.episodeNumber}`, {
        airTime: ep.airTime ?? null,
        runtime: ep.runtime ?? null,
      });
    }
    return map;
  }, [tvEpisodesData?.episodes]);

  const title = toDisplayTitle(details?.title || details?.name || "");

  const isBlockedByPolicy =
    !!details && ((details as { blocked_by_policy?: boolean }).blocked_by_policy === true ||
      !isMediaAllowedBySafety({ ...details, rating: getPolicyRatingTag(mediaType, details) }, strictFiltering, moderateFiltering));

  useEffect(() => {
    if (details && !isBlockedByPolicy && (details.title || details.name)) {
      const t2 = details.title || details.name || "";
      saveLastViewed(mediaId, t2, mediaType);
      addToRecentlyViewed({ id: mediaId, mediaType, title: t2, posterPath: details.poster_path || undefined });
    }
  }, [details, isBlockedByPolicy, mediaId, mediaType, saveLastViewed]);

  const personalStats = useMemo(() => {
    if (!user || mediaType === "movie" || !details) return null;
    const watchedKeys = new Set(
      watchedEpisodes.map((ep) => `${ep.season_number}-${ep.episode_number}`),
    );
    const publishedEpisodesCount =
      getPublishedEpisodeTotal(details) ?? details.number_of_episodes ?? 0;
    const watchedCount = watchedEpisodes.filter((ep) =>
      watchedKeys.has(`${ep.season_number}-${ep.episode_number}`),
    ).length;
    const percentageComplete =
      publishedEpisodesCount > 0
        ? Math.min(100, Math.round((watchedCount / publishedEpisodesCount) * 100))
        : 0;
    let totalMinutes = 0;
    watchedEpisodes.forEach(ep => {
      const episode = seasonDetails?.episodes?.find(e => e.season_number === ep.season_number && e.episode_number === ep.episode_number);
      if (episode?.runtime) totalMinutes += episode.runtime;
    });
    return {
      episodesWatched: watchedCount,
      totalHours: (totalMinutes / 60).toFixed(1),
      percentageComplete,
      dateAdded: watchedItem ? new Date(watchedItem.addedAt || Date.now()).toLocaleDateString() : null,
    };
  }, [user, mediaType, watchedEpisodes, details, seasonDetails?.episodes, watchedItem]);

  // Cast scroll paging
  useEffect(() => {
    const container = castScrollRef.current;
    if (!container || !(details?.credits?.cast?.length ?? 0)) return;
    const update = () => {
      const hasScroll = container.scrollWidth > container.clientWidth;
      const totalPages = hasScroll ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth)) : 1;
      const cards = Array.from(container.children) as HTMLElement[];
      let nearestIdx = 0, nearestDist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - container.scrollLeft); if (d < nearestDist) { nearestDist = d; nearestIdx = i; } });
      setCastPageCount(totalPages);
      setActiveCastPage(hasScroll ? Math.min(totalPages - 1, Math.round((nearestIdx / Math.max(1, cards.length - 1)) * (totalPages - 1))) : 0);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    container.addEventListener("scroll", update, { passive: true });
    return () => { ro.disconnect(); container.removeEventListener("scroll", update); };
  }, [details?.credits?.cast?.length]);

  // SEO title
  const _title = details ? details.title || details.name || "" : "";
  useDocumentTitle(_title ? `${_title} | CineTrekker` : undefined);

  const seasons = useMemo(() => details?.number_of_seasons ? Array.from({ length: details.number_of_seasons }, (_, i) => i + 1) : [], [details?.number_of_seasons]);

  const availableSeasonNumbers = useMemo(() => {
    if (mediaType !== "tv") return [];
    return (details?.seasons?.map(s => s.season_number).filter((n, i) => n > 0 && (details.seasons?.[i]?.air_date ? details.seasons![i].air_date! <= todayDateKey : true)) ?? seasons).sort((a, b) => b - a);
  }, [details?.seasons, mediaType, seasons, todayDateKey]);

  const seasonFromUrl = useMemo(() => {
    const raw = searchParams.get("season");
    if (!raw) return null;
    const parsedSeason = Number.parseInt(raw, 10);
    return Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : null;
  }, [searchParams]);

  const seasonProgress = useMemo(() => {
    if (!seasonDetails?.episodes || mediaType !== "tv") return {} as Record<number, { watched: number; total: number; percentage: number }>;
    // Group the loaded episodes by season_number. TMDB returns one season at a time,
    // so this map typically has a single key. Only seasons with loaded data show progress.
    const bySeasonNumber = new Map<number, typeof seasonDetails.episodes>();
    for (const ep of seasonDetails.episodes) {
      if (!bySeasonNumber.has(ep.season_number)) bySeasonNumber.set(ep.season_number, []);
      bySeasonNumber.get(ep.season_number)!.push(ep);
    }
    const p: Record<number, { watched: number; total: number; percentage: number }> = {};
    for (const [n, eps] of bySeasonNumber) {
      const aired = eps.filter(e => e.air_date && e.air_date <= todayDateKey);
      const w = aired.filter(e => isEpisodeWatched(mediaId, e.season_number, e.episode_number)).length;
      p[n] = { watched: w, total: aired.length, percentage: aired.length > 0 ? Math.round(w / aired.length * 100) : 0 };
    }
    return p;
  }, [seasonDetails, mediaType, isEpisodeWatched, mediaId, todayDateKey]);

  useEffect(() => {
    if (mediaType !== "tv" || !seasonDetails?.episodes) return;
    let lastSeason = 1, maxW = 0;
    Object.entries(seasonProgress).forEach(([n, p]) => { if (p.watched > maxW) { maxW = p.watched; lastSeason = parseInt(n); } });
    setExpandedSeason((maxW > 0 ? lastSeason : 1).toString());
  }, [seasonProgress, seasonDetails?.episodes, mediaType]);

  useEffect(() => {
    if (mediaType !== "tv") return;
    if (seasonFromUrl && availableSeasonNumbers.includes(seasonFromUrl)) {
      setSelectedSeason(seasonFromUrl);
      return;
    }
    if (selectedSeason && availableSeasonNumbers.includes(selectedSeason)) return;
    if (availableSeasonNumbers.length > 0) { setSelectedSeason(availableSeasonNumbers[0]); return; }
    if (!selectedSeason && seasons.length > 0) setSelectedSeason(seasons[seasons.length - 1]);
  }, [availableSeasonNumbers, mediaType, seasons, selectedSeason, seasonFromUrl]);

  // ── Loading ──
  useEffect(() => {
    if (!details || !title || !isValidId) {
      return;
    }

    const canonicalPath = buildMediaPath(mediaType, mediaId, title);
    if (location.pathname === canonicalPath) {
      return;
    }

    navigate(`${canonicalPath}${location.search}${location.hash}`, {
      replace: true,
    });
  }, [
    details,
    isValidId,
    location.hash,
    location.pathname,
    location.search,
    mediaId,
    mediaType,
    navigate,
    title,
  ]);

  if (isLoading && !detailsLoadingTimedOut) {
    return (
      <div className="min-h-screen">
        <div className="relative overflow-hidden -mt-16" style={{ height: "70vh" }}>
          <div className="w-full h-full skeleton-shimmer opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/20" />
        </div>
        <div className="page-container relative z-10 -mt-40 pb-24">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <div className="mx-auto md:mx-0 flex-shrink-0 w-44 md:w-60 aspect-[2/3] rounded-2xl skeleton-shimmer" />
            <div className="flex-1 space-y-4 pb-4">
              <div className="h-6 w-24 rounded-full skeleton-shimmer" />
              <div className="h-14 w-3/4 rounded-xl skeleton-shimmer" />
              <div className="h-5 w-1/2 rounded-lg skeleton-shimmer" />
              <div className="flex gap-2 flex-wrap pt-2">
                {[1,2,3,4].map(i => <div key={i} className="h-9 w-32 rounded-xl skeleton-shimmer" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (detailsLoadingTimedOut) return <MovieRouteError message={t("details.timeout", "Loading took too long.")} onRetry={() => refetch()} />;
  if (!isValidId) return <TitleUnavailable title={t("search.noResultsTitle")} description={t("details.invalidId")} homeLabel={t("nav.home")} />;
  if (isError || !details) {
    logger.warn("[Details] Error loading media data", error);
    if ((error as Error)?.message?.includes("404")) return <TitleUnavailable title={t("search.noResultsTitle")} description={t("details.invalidId")} homeLabel={t("nav.home")} />;
    return (
      <MovieRouteError
        message={(error as Error)?.message || t("common.error")}
        onRetry={() => refetch()}
        requestReference={getRequestReference(error)}
      />
    );
  }
  if (isBlockedByPolicy) {
    const mode = strictFiltering ? t("details.contentBlockedModeStrict", "Strict mode") : t("details.contentBlockedModeModerate", "Moderate mode");
    return <TitleUnavailable title={t("details.contentBlockedTitle", "Title unavailable")} description={`${t("details.contentBlockedDescription", "This title is hidden by {{mode}}.", { mode })} ${t("details.contentBlockedSettingsHint", "Go to Settings > Content Safety to adjust.")}`} homeLabel={t("nav.home")} />;
  }

  // ── Data derivation ──
  const overview = details.overview || t("details.noOverview");
  const posterUrl = getImageUrl(details.poster_path, "w500");
  const posterSrcSet = details.poster_path ? `${getImageUrl(details.poster_path, "w185")} 185w, ${getImageUrl(details.poster_path, "w342")} 342w, ${getImageUrl(details.poster_path, "w500")} 500w` : null;
  const backdropUrl = getBackdropUrl(details.backdrop_path);
  const backdropSrcSet = details.backdrop_path ? `${getBackdropUrl(details.backdrop_path, "w780")} 780w, ${getBackdropUrl(details.backdrop_path, "w1280")} 1280w` : null;
  const releaseDate = details.release_date || details.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const runtime = details.runtime || details.episode_run_time?.[0];
  const rating = details.vote_average ?? 0;
  const contentRatingTag = getPolicyRatingTag(mediaType, details);

  const directors = details.credits?.crew?.filter(c => c.job === "Director") ?? [];
  const writers = details.credits?.crew?.filter(c => ["Screenplay", "Writer", "Story"].includes(c.job)) ?? [];
  const composers = details.credits?.crew?.filter(c => c.department === "Sound" && ["Original Music Composer", "Music"].includes(c.job)) ?? [];
  const cinematographers = details.credits?.crew?.filter(c => c.job === "Director of Photography") ?? [];
  const creators = details.created_by ?? [];

  const keywords: Keyword[] = details.keywords?.keywords ?? details.keywords?.results ?? [];

  const allVideos = details.videos?.results?.filter((v: MediaVideoResult) => v.site === "YouTube") ?? [];
  const trailers = allVideos.filter((v: MediaVideoResult) => v.type === "Trailer");
  const teasers = allVideos.filter((v: MediaVideoResult) => v.type === "Teaser");
  const clips = allVideos.filter((v: MediaVideoResult) => v.type === "Clip");
  const bts = allVideos.filter((v: MediaVideoResult) => v.type === "Behind the Scenes" || v.type === "Featurette");
  const orderedVideos: MediaVideoResult[] = [...trailers, ...teasers, ...clips, ...bts].slice(0, 12);
  const featuredTrailerKey = trailers[0]?.key ?? teasers[0]?.key;

  const imdbId = details.imdb_id ?? details.external_ids?.imdb_id;
  const homepage = details.homepage;

  const providerData = watchProviders?.results?.["US"] || null;
  const dedup = (arr: Provider[] = []) => { const s = new Set<number>(); return arr.filter(p => { if (s.has(p.provider_id)) return false; s.add(p.provider_id); return true; }); };
  const flatrateProviders = dedup(providerData?.flatrate || []);
  const rentProviders = dedup(providerData?.rent || []);
  const buyProviders = dedup(providerData?.buy || []);

  const publishedEpisodes = mediaType === "tv" && seasonDetails?.episodes ? seasonDetails.episodes.filter(ep => ep.air_date && ep.air_date <= todayDateKey) : [];

  const currentGenreIds = new Set(details.genres?.map((g: { id: number }) => g.id) || details.genre_ids || []);
  const originalLanguage = details.original_language;
  const scoreItem = (item: Media & { original_language?: string }) => {
    let s = 0;
    (item.genre_ids || []).forEach((gid: number) => { if (currentGenreIds.has(gid)) s += 5; });
    if (originalLanguage && item.original_language === originalLanguage) s += 3;
    if (item.vote_count && item.vote_count > 100) s += 1;
    return s;
  };
  const recItems = [
    ...((details.recommendations?.results || []).map((i: Media) => ({ ...i, media_type: mediaType }))),
    ...((details.similar?.results || []).map((i: Media) => ({ ...i, media_type: mediaType }))),
  ].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
    .map(i => ({ ...i, _s: scoreItem(i as Media & { original_language?: string }) }))
    .sort((a, b) => b._s - a._s)
    .slice(0, 12);

  const shouldTruncateOverview = overview.length > 180 || overview.includes("\n");
  const isPinnedFavorite = pinnedFavoriteKeys.includes(currentMediaKey);
  const statusConfig = details.status ? getStatusConfig(details.status) : null;

  const seoDescription = [details.overview || "", releaseDate ? `Release: ${releaseDate}.` : "", rating > 0 ? `Rating: ${rating.toFixed(1)}/10.` : ""].filter(Boolean).join(" ").slice(0, 160);
  const detailPath = buildMediaPath(mediaType, mediaId, title);
  const seoCanonical = buildCanonicalUrl(detailPath);
  const seoKeywords = [title, ...(details.genres?.map((g: { name: string }) => g.name) || []), mediaType === "movie" ? "movie" : "TV show", year?.toString(), "streaming", "watch online"].filter(Boolean).join(", ");

  const heroFacts = (() => {
    const facts: Array<{ label: string; value: string; icon: typeof Clock; tone?: string }> = [];

    if (mediaType === "movie") {
      if (runtime) {
        facts.push({ label: t("details.runtime", "Runtime"), value: `${runtime} ${t("details.minutes", "min")}`, icon: Clock });
      }
      if (releaseDate) {
        facts.push({
          label: t("details.releaseDate", "Release"),
          value: new Date(releaseDate).toLocaleDateString(language, { year: "numeric", month: "short", day: "numeric" }),
          icon: Calendar,
        });
      }
    } else {
      if (details.number_of_seasons) {
        facts.push({
          label: t("details.seasons", "Seasons"),
          value: `${details.number_of_seasons}`,
          icon: Tv,
        });
      }
      if (details.number_of_episodes) {
        facts.push({
          label: t("details.episodes", "Episodes"),
          value: `${details.number_of_episodes}`,
          icon: Film,
        });
      }
      if (personalStats) {
        facts.push({
          label: t("details.progress", "Progress"),
          value: `${personalStats.percentageComplete}%`,
          icon: TrendingUp,
        });
      }
    }

    if (details.original_language) {
      facts.push({
        label: t("details.language", "Language"),
        value: details.original_language.toUpperCase(),
        icon: Globe,
      });
    }

    if (details.vote_average) {
      facts.push({
        label: t("details.score", "Score"),
        value: `${details.vote_average.toFixed(1)}/10`,
        icon: Star,
      });
    }

    return facts.slice(0, 4);
  })();

  // ── Handlers ──
  const handleAddToWatchlist = async () => {
    const next = !optimisticInWatchlist;
    if (next) {
      trackProductEvent("first_title_saved", { media_kind: mediaType });
    }
    setOptimisticInWatchlist(next); setIsWatchlistPending(true);
    try { if (next) await addToWatchlist(mediaId, mediaType); else await removeFromWatchlist(mediaId, mediaType); }
    catch { setOptimisticInWatchlist(!next); } finally { setIsWatchlistPending(false); }
  };

  const handleMarkAsWatched = async () => {
    if (optimisticWatched) {
      setOptimisticWatched(false); setIsWatchedPending(true);
      try { await removeFromWatched(mediaId, mediaType); } catch { setOptimisticWatched(true); } finally { setIsWatchedPending(false); }
    } else {
      setTempRating(watchedItem?.rating || 5); setTempNote(watchedItem?.note || ""); setTempStatus(watchedItem?.status || "completed");
      if (mediaType === "tv" && user) { setStatusDialogOpen(true); } else {
        setOptimisticWatched(true); setIsWatchedPending(true);
        try { await addToWatched(mediaId, mediaType, watchedItem?.rating || 5, watchedItem?.note || "", watchedItem?.status || "completed"); }
        catch { setOptimisticWatched(false); } finally { setIsWatchedPending(false); }
      }
    }
  };

  const handleSaveStatus = ({ rating: r, note: n, status: s }: { rating: number; note: string; status: "watching" | "completed" | "dropped" | "plan_to_watch" }) => {
    if (watched) {
      updateWatchedItem(mediaId, mediaType, { rating: r, note: n, status: s });
    } else {
      trackProductEvent("first_progress_recorded", { media_kind: mediaType, progress_mode: "title" });
      addToWatched(mediaId, mediaType, r, n, s);
    }
    setStatusDialogOpen(false);
  };

  const handleEpisodeToggle = (seasonNumber: number, episodeNumber: number, episodeName: string, airDate: string | null) => {
    if (isEpisodeWatched(mediaId, seasonNumber, episodeNumber)) {
      removeEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber });
    } else {
      trackProductEvent("first_progress_recorded", { media_kind: mediaType, progress_mode: "episode" });
      markEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber, episodeName, airDate: airDate || undefined, showName: title, posterPath: details?.poster_path });
    }
  };

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${detailPath}`); toast({ title: t("details.linkCopied", "Link copied!") }); }
    catch { toast({ title: t("details.linkCopyFailed", "Failed to copy link"), variant: "destructive" }); }
  };

  const handleTogglePinnedFavorite = () => {
    const was = isPinnedFavorite;
    void persistPinnedFavorites(was ? pinnedFavoriteKeys.filter(k => k !== currentMediaKey) : [...pinnedFavoriteKeys, currentMediaKey]);
    toast({ title: was ? t("details.removedFromFavorites", "Removed from favorites") : t("details.pinnedToFavorites", "Pinned to favorites") });
  };

  const handlePlayVideo = (key: string) => { setTrailerVideoKey(key); setTrailerOpen(true); };
  const scrollTo = (id: string) => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth" });
  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 1 | -1) => {
    const container = ref.current;
    if (!container) return;
    container.scrollBy({ left: direction * Math.max(280, Math.floor(container.clientWidth * 0.82)), behavior: "smooth" });
  };

  const navItems = [
    { id: "overview", label: t("details.overview", "Overview"), show: true },
    { id: "videos",   label: "Videos",                           show: orderedVideos.length > 0 },
    { id: "cast",     label: t("details.cast", "Cast"),          show: (details.credits?.cast?.length ?? 0) > 0 },
    { id: "episodes", label: t("details.episodes", "Episodes"),  show: mediaType === "tv" && seasons.length > 0 },
    { id: "similar",  label: "More Like This",                   show: (similarTitles?.results?.length ?? 0) > 0 || recItems.length > 0 },
    { id: "reviews",  label: t("details.reviews", "Reviews"),   show: true },
  ].filter(n => n.show);

  const renderProvider = (p: Provider) => {
    const href = getProviderWatchUrl(p.provider_id, title, mediaId) || getProviderUrlFromData(p, providerData ?? undefined) || "";
    const logo = p.logo_path ? (
      <Image src={getImageUrl(p.logo_path, "w92") || ""} alt={p.provider_name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
    ) : (
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><span className="text-xs font-bold">{p.provider_name.slice(0, 2)}</span></div>
    );
    const inner = (
      <div className="flex flex-col items-center gap-1.5 group/p">
        <div className="rounded-xl border border-white/10 p-1 group-hover/p:border-primary/50 group-hover/p:shadow-[0_0_12px_rgba(var(--primary)/0.3)] transition-all">{logo}</div>
        <span className="text-[10px] text-muted-foreground group-hover/p:text-foreground transition-colors max-w-[56px] text-center leading-tight">{p.provider_name}</span>
      </div>
    );
    return href ? (
      <a key={p.provider_id} href={href} target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-105 active:scale-95" aria-label={`Watch on ${p.provider_name}`}>{inner}</a>
    ) : (
      <div key={p.provider_id} className="opacity-50 cursor-not-allowed">{inner}</div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // JSX
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      <SEO
        title={`${title} | CineTrekker`}
        description={seoDescription}
        image={getImageUrl(details.poster_path, "w500")}
        canonical={seoCanonical}
        keywords={seoKeywords}
        type={mediaType === "movie" ? "video.movie" : "video.tv_show"}
        releaseDate={releaseDate || undefined}
        rating={rating || undefined}
        jsonLd={[toBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: mediaType === "movie" ? "Movies" : "TV Shows", path: "/search" }, { name: title, path: detailPath }])]}
      />
      <MovieSchema schemaType={mediaType === "movie" ? "Movie" : "TVSeries"} title={title} description={overview} image={posterUrl} releaseDate={releaseDate || undefined} rating={rating || undefined} ratingCount={details.vote_count} url={seoCanonical} />

      {/* ══════════════════════════════════════════════
          CINEMATIC HERO — full bleed with parallax
      ══════════════════════════════════════════════ */}
      <div ref={heroRef} className="details-hero relative overflow-hidden md:min-h-[clamp(420px,68vh,740px)]">
        {/* Parallax backdrop */}
        <div ref={backdropRef} className="details-hero-backdrop absolute will-change-transform" style={{ inset: "-15% 0 0 0", height: "130%" }}>
          {backdropUrl ? (
            <Image src={backdropUrl} srcSet={backdropSrcSet || undefined} sizes="100vw" alt={getMediaAltText(title, mediaType, "backdrop")} width={1280} height={720} fetchPriority="high" loading="eager" priority className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
          )}
        </div>

        {/* Layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/78 to-black/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent pointer-events-none" />

        {/* Back button */}
        <Link to="/" className="absolute top-20 left-4 z-20 flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-white/80 transition-colors hover:border-white/30 hover:bg-black/65 hover:text-white" aria-label={t("nav.home")}>
          <ChevronLeft className="w-4 h-4" />{t("nav.home")}
        </Link>

        {/* Hero content */}
        <div className="details-hero-content absolute bottom-0 left-0 right-0 z-10">
          <div className="details-hero-container page-container pb-8 pt-16 md:pb-10">
            <div className="details-hero-layout flex flex-col md:flex-row md:items-end gap-6 lg:gap-8">

              {/* Poster — large and prominent in the hero */}
              <div className="details-hero-poster flex-shrink-0 mx-auto md:mx-0 relative group">
                <div className="relative">
                  {details.poster_path ? (
                    <Image
                      src={posterUrl} srcSet={posterSrcSet || undefined}
                      sizes="(max-width: 768px) 140px, 200px"
                      alt={getMediaAltText(title, mediaType, "poster")}
                      width={500} height={750} loading="lazy" showSkeleton
                      className="w-36 rounded-xl border border-white/10 shadow-2xl transition-colors duration-200 group-hover:border-primary/40 md:w-44"
                    />
                  ) : (
                    <div className="flex w-36 aspect-[2/3] items-center justify-center rounded-xl border border-white/10 bg-muted/30 md:w-44">
                      <Film className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  {/* Score ring on poster */}
                  {rating > 0 && (
                    <div className="absolute -bottom-3 -right-3 rounded-full border border-white/10 bg-background p-1 shadow-lg">
                      <ScoreRing score={rating} size={54} />
                    </div>
                  )}
                </div>
              </div>

              {/* Title and metadata */}
              <div className="details-hero-copy min-w-0 flex-1 space-y-3 md:pb-1">
                {/* Primary metadata */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/70">
                  <span className="uppercase tracking-[0.16em] text-primary">{mediaType === "movie" ? t("common.movie") : t("common.tvShow")}</span>
                  {year && <><span aria-hidden="true">•</span><span>{year}</span></>}
                  {contentRatingTag && <><span aria-hidden="true">•</span><span>{contentRatingTag}</span></>}
                  {statusConfig && details.status && (
                    <><span aria-hidden="true">•</span><span className="inline-flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />{details.status}</span></>
                  )}
                </div>

                {/* Title */}
                <h1 className="max-w-4xl text-3xl font-black leading-[1.03] text-white drop-shadow-lg md:text-5xl md:leading-[0.98] lg:text-6xl tracking-tight">
                  {title}
                </h1>

                {/* Tagline */}
                {details.tagline && (
                  <p className="max-w-[58ch] text-sm italic leading-6 text-white/62 md:text-base">"{details.tagline}"</p>
                )}

                {/* Meta row */}
                <div className="details-hero-meta flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/68">
                  {runtime && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {runtime} {t("details.minutes")}
                    </span>
                  )}
                  {details.number_of_seasons && (
                    <span>{details.number_of_seasons} {t("details.seasons")}</span>
                  )}
                  {details.number_of_episodes && (
                    <span>{details.number_of_episodes} {t("details.episodes")}</span>
                  )}
                  {(directors.length > 0 || creators.length > 0) && (
                    <span className="inline-flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" />
                      {(directors.length > 0 ? directors : creators).slice(0, 2).map((d: { name: string }) => d.name).join(", ")}
                    </span>
                  )}
                  {details.networks && details.networks.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5" />
                      {details.networks.slice(0, 2).map((n: { name: string }) => n.name).join(", ")}
                    </span>
                  )}
                </div>

                {/* Genres */}
                {details.genres && details.genres.length > 0 && (
                  <p className="text-sm leading-6 text-white/72">{details.genres.map((g: { id: number; name: string }) => g.name).join(" · ")}</p>
                )}

                {watchedItem || heroFacts.length > 0 ? (
                  <div className="details-hero-facts flex min-w-0 flex-wrap items-center gap-2">
                    {watchedItem && (
                      <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                        <span className="font-semibold uppercase tracking-[0.16em] text-white/55">
                          {t("details.yourLibrary", "Your library")}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-medium">
                          {watchedItem.status?.replace(/_/g, " ") || t("details.watched", "Watched")}
                        </span>
                        {typeof watchedItem.rating === "number" ? (
                          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-medium">
                            {watchedItem.rating}/10
                          </span>
                        ) : null}
                        {mediaType === "tv" && personalStats ? (
                          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-medium">
                            {personalStats.percentageComplete}%
                          </span>
                        ) : null}
                      </span>
                    )}

                    {heroFacts.map((fact) => {
                      const Icon = fact.icon;
                      return (
                        <span
                          key={fact.label}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white/78 backdrop-blur-sm"
                        >
                          <Icon className="h-3.5 w-3.5 text-white/55" />
                          <span>{fact.value}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                {/* Multi-API Enriched Ratings (Rotten Tomatoes, Metacritic, IMDb) */}
                {enrichedRatings && (enrichedRatings.rottenTomatoes || enrichedRatings.metascore || enrichedRatings.imdbRating) ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {enrichedRatings.rottenTomatoes && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/50 px-3 py-1 text-xs font-semibold text-red-300 shadow-sm backdrop-blur-sm">
                        <span aria-hidden="true">🍅</span>
                        <span>{enrichedRatings.rottenTomatoes} Rotten Tomatoes</span>
                      </span>
                    )}
                    {enrichedRatings.metascore && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-sm backdrop-blur-sm">
                        <span aria-hidden="true">Ⓜ️</span>
                        <span>{enrichedRatings.metascore} Metascore</span>
                      </span>
                    )}
                    {enrichedRatings.imdbRating && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/50 px-3 py-1 text-xs font-semibold text-amber-300 shadow-sm backdrop-blur-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{enrichedRatings.imdbRating}/10 IMDb</span>
                      </span>
                    )}
                    {enrichedRatings.boxOffice && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/75 backdrop-blur-sm">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{enrichedRatings.boxOffice}</span>
                      </span>
                    )}
                  </div>
                ) : null}

                {/* TV Broadcast Schedule & Next Episode Countdown (TVMaze) */}
                {tvSchedule && (tvSchedule.network || tvSchedule.nextEpisode) ? (
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs text-white/90 shadow-sm backdrop-blur-sm">
                    <Tv className="h-3.5 w-3.5 text-primary shrink-0" />
                    {tvSchedule.network && (
                      <span className="font-semibold text-primary">{tvSchedule.network}</span>
                    )}
                    {tvSchedule.days.length > 0 && tvSchedule.time && (
                      <span className="text-white/70">
                        {tvSchedule.days.join(", ")} at {tvSchedule.time}
                      </span>
                    )}
                    {tvSchedule.nextEpisode && (
                      <span className="rounded-md bg-black/40 px-2 py-0.5 font-medium text-white/90">
                        Next: S{tvSchedule.nextEpisode.season}E{tvSchedule.nextEpisode.number} &ldquo;{tvSchedule.nextEpisode.name}&rdquo; ({tvSchedule.nextEpisode.airdate})
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Hero CTA */}
                {featuredTrailerKey && (
                  <Button
                    size="lg"
                    className="w-full justify-center gap-2 bg-white text-black hover:bg-white/90 font-bold shadow-xl hover:shadow-white/20 transition-all hover:scale-[1.02] active:scale-95 rounded-xl sm:w-auto"
                    onClick={() => handlePlayVideo(featuredTrailerKey)}
                  >
                    <PlayCircle className="w-5 h-5 fill-black" />
                    Watch Trailer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          STICKY NAV
      ══════════════════════════════════════════════ */}
      {isStickyNavVisible && (
          <div className="sticky top-0 z-50 border-b border-border bg-background shadow-sm">
          <div className="page-container">
            <nav className="flex items-center gap-0.5 overflow-x-auto py-2.5 hide-scrollbar">
              {navItems.map(n => (
                <button
                  key={n.id}
                  onClick={() => scrollTo(n.id)}
                  className={cn(
                    "min-h-11 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-4",
                    activeSection === n.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >{n.label}</button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div className="details-main page-container pb-28 md:pb-12 space-y-0">

        {/* ─── ACTION BAR ─────────────────────────────────────── */}
        <Reveal className="mt-8">
          <div className="details-panel rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("details.primaryActions", "Your Next Move")}</p>
                {!user && <p className="text-xs text-muted-foreground mt-1">{t("details.guestTrackingHint", "Guest actions save locally — create an account later for sync.")}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={optimisticInWatchlist ? "secondary" : "default"}
                className={cn("min-h-11 gap-2 rounded-xl font-semibold", optimisticInWatchlist ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                onClick={handleAddToWatchlist}
                disabled={isWatchlistPending}
              >
                {isWatchlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> : optimisticInWatchlist ? <Bookmark className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                {optimisticInWatchlist ? t("details.inWatchlist", "In Watchlist ✓") : t("details.addToWatchlist", "Add to Watchlist")}
              </Button>

              <Button
                variant="outline"
                className={cn("min-h-11 gap-2 rounded-xl font-semibold", optimisticWatched ? "border-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-700" : "")}
                onClick={handleMarkAsWatched}
                disabled={isWatchedPending}
              >
                {isWatchedPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t("details.watched", "Watched")}
              </Button>

              <FollowUpdatesButton mediaId={mediaId} mediaType={mediaType} title={title} posterPath={details.poster_path} details={details} />

              <Button variant={isPinnedFavorite ? "secondary" : "outline"} className="gap-2" onClick={handleTogglePinnedFavorite}>
                <Pin className="w-4 h-4" />{isPinnedFavorite ? "Pinned" : "Pin"}
              </Button>

              {featuredTrailerKey && (
                <Button variant="outline" className="gap-2" onClick={() => handlePlayVideo(featuredTrailerKey)}>
                  <PlayCircle className="w-4 h-4" />{t("details.watchTrailer", "Trailer")}
                </Button>
              )}

              <Button variant="outline" className="gap-2" onClick={handleShare}>
                <Share2 className="w-4 h-4" />{t("details.share", "Share")}
              </Button>

              {mediaType === "tv" && seasons.length > 0 && user && (
                <Dialog open={episodesDialogOpen} onOpenChange={setEpisodesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-xl"><PlayCircle className="w-4 h-4" />{t("episodes.allEpisodes")}</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t("episodes.allEpisodes")} — {title}</DialogTitle>
                      <DialogDescription>{t("tv.selectEpisodes", "Select the episodes you have watched")}</DialogDescription>
                    </DialogHeader>
                    <Accordion type="single" collapsible className="w-full" onValueChange={v => setSelectedSeason(v ? parseInt(v) : null)}>
                      {seasons.map(n => (
                        <AccordionItem key={n} value={n.toString()}>
                          <AccordionTrigger className="md:hover:no-underline">{t("episodes.season")} {n}</AccordionTrigger>
                          <AccordionContent>
                            {selectedSeason === n && seasonDetails?.episodes ? (
                              <div className="space-y-2">
                                {seasonDetails.episodes.map(ep => {
                                  const ew = isEpisodeWatched(mediaId, n, ep.episode_number);
                                  return (
                                    <div key={ep.id} className={cn("flex items-start gap-3 p-3 rounded-xl transition-colors", ew ? "bg-muted/50" : "md:hover:bg-muted/30")}>
                                      <Checkbox checked={ew} onCheckedChange={() => handleEpisodeToggle(n, ep.episode_number, ep.name, ep.air_date)} />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">E{ep.episode_number}</span>
                                          <span className={cn("text-sm", ew && "line-through opacity-60")}>{ep.name}</span>
                                        </div>
                                        {ep.air_date && <span className="text-xs text-muted-foreground">{new Date(ep.air_date).toLocaleDateString(language)}</span>}
                                      </div>
                                      {ep.runtime && <span className="text-xs text-muted-foreground shrink-0">{ep.runtime} {t("details.minutes")}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <div className="py-4 text-center text-muted-foreground text-sm">{t("common.loading")}</div>}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </Reveal>

        <WatchedStatusDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} onSave={handleSaveStatus} initialRating={tempRating} initialNote={tempNote} initialStatus={tempStatus} mediaTitle={title} />
        <TrailerModal id={mediaId} mediaType={mediaType} open={trailerOpen} onClose={() => { setTrailerOpen(false); setTrailerVideoKey(undefined); }} />

        {/* ─── OVERVIEW + SIDEBAR GRID ───────────────────────── */}
        <div
          ref={el => { if (el) sectionRefs.current.overview = el; }}
          id="section-overview"
          className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]"
        >
          {/* Overview + Keywords */}
              <Reveal>
            <div className="details-panel min-w-0 self-start rounded-2xl border border-white/8 bg-card/40 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">{t("details.overview", "Overview")}</p>

              {/* Director/Creator quick line */}
              {(directors.length > 0 || creators.length > 0) && (
                <div className="flex items-center gap-2 text-sm mb-4">
                  <span className="text-muted-foreground font-medium">{directors.length > 0 ? "Directed by" : "Created by"}</span>
                  <div className="flex flex-wrap gap-x-1">
                    {(directors.length > 0 ? directors : creators).slice(0, 3).map((p: { id: number; name: string }, i: number, arr: { id: number; name: string }[]) => (
                      <Link key={p.id} to={buildPersonPath(p.id, p.name)} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {p.name}{i < arr.length - 1 ? ", " : ""}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <p
                id="details-overview-text"
                className={cn("max-w-[65ch] whitespace-pre-line break-words text-base leading-7 text-foreground/78", !showFullOverview && shouldTruncateOverview && "sm:line-clamp-3")}
              >
                {overview}
              </p>
              {shouldTruncateOverview && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1.5 h-auto px-0 text-primary font-semibold"
                  aria-expanded={showFullOverview}
                  aria-controls="details-overview-text"
                  onClick={() => setShowFullOverview(s => !s)}
                >
                  {showFullOverview ? t("common.readLess", "Read Less") : t("common.readMore", "Read More")}
                </Button>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="mt-4 border-t border-white/6 pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Tags</p>
                    {keywords.length > 8 ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                        aria-expanded={showAllKeywords}
                        aria-controls="details-tags"
                        onClick={() => setShowAllKeywords(s => !s)}
                      >
                        {showAllKeywords ? "Show less" : `+${keywords.length - 8} more`}
                      </button>
                    ) : null}
                  </div>
                  <div id="details-tags" className="flex max-w-full flex-wrap gap-1.5">
                    {(showAllKeywords ? keywords : keywords.slice(0, 8)).map(kw => (
                      <span key={kw.id} className="max-w-full break-words rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[11px] text-foreground/65 transition-colors hover:border-primary/30 hover:text-foreground">
                        {kw.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mediaType === "tv" && seasons.length > 0 && (
                <section ref={el => { if (el) sectionRefs.current.episodes = el; }} id="section-episodes" className="mt-5 border-t border-white/6 pt-5">
                  <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] xl:items-start">
                    <div className="max-w-[19rem]">
                      <h2 className="text-base font-bold text-foreground">{t("details.availableEpisodes", "Available Episodes")}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("details.availableEpisodesDescription", "Browse published episodes and read summaries.")}</p>
                    </div>
                    <div className="min-w-0 max-w-full space-y-2 xl:pt-0.5">
                      {user && (
                        <div className="flex max-w-full flex-wrap gap-2 xl:justify-end">
                          <Button variant="outline" size="sm" className="rounded-xl gap-1 shrink-0" onClick={() => {
                            if (!selectedSeason || !seasonDetails) return;
                            markSeasonWatched({ showId: mediaId, seasonNumber: selectedSeason!, episodes: publishedEpisodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name, air_date: ep.air_date ?? undefined })), showName: details?.name, posterPath: details?.poster_path });
                          }} disabled={!selectedSeason || !seasonDetails || publishedEpisodes.length === 0}>
                            <Check className="w-3.5 h-3.5" />{t("details.markSeason", "Mark Season")}
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl gap-1 shrink-0" onClick={async () => {
                            if (!availableSeasonNumbers.length) return;
                            const allSeasonResults = await Promise.allSettled(availableSeasonNumbers.map(n => getTVSeasonDetails(mediaId, n, language)));
                            const allSeasonData = allSeasonResults.flatMap((result, i) =>
                              result.status === "fulfilled" ? [{ seasonNumber: availableSeasonNumbers[i], details: result.value }] : []
                            );
                            const allEpisodes = allSeasonData.flatMap(({ seasonNumber, details: sd }) =>
                              (sd?.episodes ?? []).filter((ep: { air_date?: string | null }) => ep.air_date && ep.air_date <= todayDateKey).map((ep: { episode_number: number; name: string; air_date?: string | null }) => ({
                                season_number: seasonNumber,
                                episode_number: ep.episode_number,
                                name: ep.name,
                                air_date: ep.air_date ?? undefined,
                              }))
                            );
                            if (allEpisodes.length === 0) return;
                            markAllSeasonsWatched({ showId: mediaId, allEpisodes, showName: details?.name, posterPath: details?.poster_path });
                          }} disabled={!availableSeasonNumbers.length}>
                            <Check className="w-3.5 h-3.5" />{t("details.markAllSeasonsWatched", "Mark All Seasons Watched")}
                          </Button>
                        </div>
                      )}
                      {/* Season Dropdown */}
                      <div className="flex items-center gap-3 xl:justify-end">
                        <Select
                          value={selectedSeason?.toString() ?? ""}
                          onValueChange={(val) => {
                            const n = parseInt(val, 10);
                            setSelectedSeason(n);
                            setSearchParams(prev => {
                              const next = new URLSearchParams(prev);
                              next.set("season", String(n));
                              return next;
                            }, { replace: true });
                          }}
                        >
                          <SelectTrigger
                            className="h-11 w-full sm:w-64 gap-2.5 rounded-xl border border-white/15 bg-card/60 px-3 py-1.5 text-sm backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/8 focus:ring-2 focus:ring-primary/40 focus:ring-offset-0 data-[state=open]:border-primary/60 data-[state=open]:bg-white/8 [&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&>span]:line-clamp-none [&>span]:min-w-0 [&>span]:flex-1"
                            aria-label={t("details.selectSeason", "Select Season")}
                          >
                            <SelectValue placeholder={t("details.selectSeasonPrompt", "Select a season…")}>
                              {selectedSeason != null ? (() => {
                                const prog = seasonProgress[selectedSeason];
                                const seasonInfo = details.seasons?.find((s: { season_number: number }) => s.season_number === selectedSeason);
                                const isComplete = prog && prog.total > 0 && prog.watched === prog.total;
                                return (
                                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                                    {seasonInfo?.poster_path ? (
                                      <img
                                        src={getImageUrl(seasonInfo.poster_path, "w92") || ""}
                                        alt=""
                                        className="h-7 w-5 shrink-0 rounded object-cover shadow-sm border border-white/10"
                                      />
                                    ) : (
                                      <span className="flex h-7 w-5 shrink-0 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-muted-foreground border border-white/10">
                                        S{selectedSeason}
                                      </span>
                                    )}
                                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                                      {t("episodes.season")} {selectedSeason}
                                    </span>
                                    {prog && prog.total > 0 && (
                                      <span className={cn(
                                        "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums border",
                                        isComplete
                                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                          : "bg-white/10 border-white/10 text-muted-foreground"
                                      )}>
                                        {prog.watched}/{prog.total}
                                      </span>
                                    )}
                                  </span>
                                );
                              })() : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            align="end"
                            sideOffset={6}
                            className="w-[18rem] rounded-xl border border-white/15 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
                          >
                            {(availableSeasonNumbers.length > 0 ? availableSeasonNumbers : seasons.slice().reverse()).map(n => {
                              const prog = seasonProgress[n];
                              const seasonInfo = details.seasons?.find((s: { season_number: number }) => s.season_number === n);
                              const isComplete = prog && prog.total > 0 && prog.watched === prog.total;
                              return (
                                <SelectItem
                                  key={`season-opt-${n}`}
                                  value={n.toString()}
                                  className="cursor-pointer rounded-lg py-2 pl-9 pr-3 transition-colors focus:bg-white/10 focus:text-foreground data-[highlighted]:bg-white/10 data-[highlighted]:text-foreground"
                                >
                                  <span className="flex items-center gap-3 w-full">
                                    {seasonInfo?.poster_path ? (
                                      <img
                                        src={getImageUrl(seasonInfo.poster_path, "w92") || ""}
                                        alt=""
                                        className="h-9 w-6 shrink-0 rounded object-cover shadow-sm border border-white/10"
                                      />
                                    ) : (
                                      <span className="flex h-9 w-6 shrink-0 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-muted-foreground border border-white/10">
                                        S{n}
                                      </span>
                                    )}
                                    <span className="flex min-w-0 flex-1 flex-col justify-center">
                                      <span className="text-sm font-semibold leading-tight text-foreground truncate">
                                        {t("episodes.season")} {n}
                                      </span>
                                      {prog && prog.total > 0 ? (
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 shrink-0">
                                            <div
                                              className={cn(
                                                "h-full rounded-full transition-all duration-300",
                                                isComplete ? "bg-emerald-400" : "bg-primary"
                                              )}
                                              style={{ width: `${Math.round((prog.watched / prog.total) * 100)}%` }}
                                            />
                                          </div>
                                          <span className={cn(
                                            "text-[10px] font-medium tabular-nums shrink-0",
                                            isComplete ? "text-emerald-400" : "text-muted-foreground"
                                          )}>
                                            {prog.watched}/{prog.total}
                                          </span>
                                        </div>
                                      ) : seasonInfo?.episode_count ? (
                                        <span className="text-[11px] text-muted-foreground mt-0.5">
                                          {seasonInfo.episode_count} {t("details.episodes", "episodes")}
                                        </span>
                                      ) : null}
                                    </span>
                                    {isComplete && (
                                      <span className="ml-auto shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                                        Done
                                      </span>
                                    )}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {!selectedSeason ? (
                    <p className="text-sm text-muted-foreground">{t("details.selectSeasonPrompt", "Choose a season from the dropdown to browse episodes.")}</p>
                  ) : !seasonDetails ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("details.loadingSeasonEpisodes", "Loading...")}</div>
                  ) : publishedEpisodes.length === 0 ? (
                    <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-5 text-sm text-muted-foreground">{t("details.noPublishedEpisodes", "No published episodes available for this season yet.")}</div>
                  ) : (
                    <DeferredBlock className="space-y-2" placeholderClassName="h-[420px]">
                      <Accordion type="single" collapsible className="w-full">
                        {publishedEpisodes.map((episode, index) => {
                          const ew = isEpisodeWatched(mediaId, episode.season_number, episode.episode_number);
                          const isNext = !ew && publishedEpisodes.slice(0, index).every(prev => isEpisodeWatched(mediaId, prev.season_number, prev.episode_number));
                          const enrichedEp = tvmazeEpisodeMap.get(`S${episode.season_number}E${episode.episode_number}`);
                          const effectiveRuntime = episode.runtime || enrichedEp?.runtime;
                          const airTime = enrichedEp?.airTime;
                          return (
                            <AccordionItem key={`ep-${episode.id}`} value={`ep-${episode.id}`} className={cn("border-b border-white/6 last:border-0", isNext && "bg-primary/5 ring-1 ring-inset ring-primary/20")}>
                              <div className="flex w-full items-center gap-3 py-3">
                                {episode.still_path && (
                                  <div className="hidden w-20 shrink-0 overflow-hidden rounded-lg border border-white/8 sm:block aspect-video">
                                    <Image src={getImageUrl(episode.still_path, "w185") || ""} alt={episode.name} width={185} height={104} className="h-full w-full object-cover" loading="lazy" />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleEpisodeToggle(episode.season_number, episode.episode_number, episode.name, episode.air_date)}
                                  className={cn("flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background", ew ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/8 text-muted-foreground hover:bg-white/15")}
                                  aria-pressed={ew}
                                  aria-label={ew ? t("details.markEpisodeUnwatched", "Mark {{episode}} as unwatched", { episode: episode.name }) : t("details.markEpisodeWatched", "Mark {{episode}} as watched", { episode: episode.name })}
                                >
                                  {ew && <Check className="h-4 w-4" />}
                                </button>
                                <AccordionPrimitive.Header className="flex min-w-0 flex-1">
                                  <AccordionPrimitive.Trigger className="flex min-w-0 flex-1 items-center justify-between gap-2 py-0 text-left font-normal md:hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">S{episode.season_number}E{episode.episode_number}</span>
                                        {isNext && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{t("home.upNext", "Up next")}</Badge>}
                                        {episode.vote_average && episode.vote_average > 0 && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />{episode.vote_average.toFixed(1)}</span>}
                                      </div>
                                      <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-foreground">{episode.name}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">{episode.air_date ? `${new Date(episode.air_date).toLocaleDateString(language)}${airTime ? ` · ${airTime}` : ""}` : t("details.toBeAnnounced", "To be announced")}{effectiveRuntime ? ` · ${effectiveRuntime} ${t("details.minutes")}` : ""}</p>
                                    </div>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                  </AccordionPrimitive.Trigger>
                                </AccordionPrimitive.Header>
                              </div>
                              <AccordionContent>
                                <div className="mb-2 rounded-xl border border-white/8 bg-white/3 p-4">
                                  <p className="text-sm leading-relaxed text-muted-foreground">{episode.overview?.trim() || t("details.noEpisodeDescription", "No description available.")}</p>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </DeferredBlock>
                  )}
                </section>
              )}
            </div>
          </Reveal>

          {/* Sidebar */}
          <div className="min-w-0 space-y-4">
            {details.credits?.cast && details.credits.cast.length > 0 && (
              <Reveal>
                <div className="rounded-2xl border border-white/8 bg-card/40 p-5 backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Cast</p>
                      <p className="mt-1 text-xs text-muted-foreground">Explore the people behind the story.</p>
                    </div>
                    <button type="button" onClick={() => scrollTo("cast")} className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80">View all</button>
                  </div>
                  <div ref={castPreviewScrollRef} className="hide-scrollbar -mx-1 flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
                    {details.credits.cast.slice(0, 8).map((person: { id: number; name: string; character?: string; profile_path?: string | null }) => (
                      <Link key={`sidebar-cast-${person.id}`} to={buildPersonPath(person.id, person.name)} className="group/cast w-20 shrink-0 snap-start">
                        <div className="aspect-[2/3] overflow-hidden rounded-xl border border-white/8 bg-muted/50 transition-colors group-hover/cast:border-primary/40">
                          {person.profile_path ? (
                            <Image src={getImageUrl(person.profile_path, "w185") || ""} alt={person.name} width={185} height={278} className="h-full w-full object-cover transition-transform duration-300 group-hover/cast:scale-105" loading="lazy" showSkeleton />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-bold text-muted-foreground" aria-hidden="true">{person.name.slice(0, 1)}</div>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-foreground group-hover/cast:text-primary">{person.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{person.character || "Cast"}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
            {/* Watch options */}
            <Reveal>
              <div className="details-panel rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">{t("details.whereToWatch", "Where to Watch")}</p>
                {flatrateProviders.length > 0 || rentProviders.length > 0 || buyProviders.length > 0 ? (
                  <div className="space-y-3">
                    {flatrateProviders.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("details.streaming", "Streaming")}</p>
                        <div className="flex flex-wrap gap-2">{flatrateProviders.map(renderProvider)}</div>
                      </div>
                    )}
                    {rentProviders.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Rent</p>
                        <div className="flex flex-wrap gap-2">{rentProviders.map(renderProvider)}</div>
                      </div>
                    )}
                    {buyProviders.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Buy</p>
                        <div className="flex flex-wrap gap-2">{buyProviders.map(renderProvider)}</div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground pt-1">Watch options data by JustWatch</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("details.notAvailableInRegion", "Not available in your region")}</p>
                )}
              </div>
            </Reveal>

            {/* Facts */}
            <Reveal>
              <div className="details-panel rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">Details</p>
                <dl className="space-y-2.5 text-sm">
                  {details.status && statusConfig && (
                    <div className="flex min-w-0 justify-between gap-2 items-center">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border", statusConfig.cls)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />{details.status}
                      </dd>
                    </div>
                  )}
                  {releaseDate && (
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">{mediaType === "movie" ? "Released" : "First aired"}</dt>
                      <dd className="min-w-0 break-words font-medium text-right text-sm">{new Date(releaseDate).toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" })}</dd>
                    </div>
                  )}
                  {runtime && (
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">Runtime</dt>
                      <dd className="font-medium">{Math.floor(runtime / 60) > 0 ? `${Math.floor(runtime / 60)}h ` : ""}{runtime % 60 > 0 ? `${runtime % 60}m` : ""}</dd>
                    </div>
                  )}
                  {details.original_language && (
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">Language</dt>
                      <dd className="flex min-w-0 items-center gap-1 break-words font-medium"><Globe className="w-3 h-3 shrink-0 opacity-60" />{new Intl.DisplayNames([language], { type: "language" }).of(details.original_language) || details.original_language}</dd>
                    </div>
                  )}
                  {details.production_countries && details.production_countries.length > 0 && (
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">Country</dt>
                      <dd className="min-w-0 break-words font-medium text-right">{details.production_countries.slice(0, 2).map((c: { name: string }) => c.name).join(", ")}</dd>
                    </div>
                  )}
                  {mediaType === "movie" && (details.budget ?? 0) > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3 opacity-60" />Budget</dt>
                      <dd className="font-medium">{formatCurrency(details.budget!)}</dd>
                    </div>
                  )}
                  {mediaType === "movie" && (details.revenue ?? 0) > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3 opacity-60" />Box Office</dt>
                      <dd className="font-bold text-emerald-400">{formatCurrency(details.revenue!)}</dd>
                    </div>
                  )}
                  {details.production_companies && details.production_companies.length > 0 && (
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground shrink-0">Studio</dt>
                      <dd className="min-w-0 break-words font-medium text-right text-xs leading-relaxed">{details.production_companies.slice(0, 3).map((c: { name: string }) => c.name).join(" · ")}</dd>
                    </div>
                  )}
                </dl>
                {/* External links */}
                {(imdbId || homepage) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/6">
                    {imdbId && (
                      <a href={`https://www.imdb.com/title/${imdbId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/25 text-[#F5C518] text-xs font-bold hover:bg-[#F5C518]/20 transition-colors">
                        IMDb <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {homepage && (
                      <a href={homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/12 text-foreground/60 text-xs font-medium hover:bg-white/10 hover:text-foreground transition-colors">
                        Official Site <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Reveal>

            {/* TV personal stats */}
            {user && personalStats && mediaType === "tv" && (
              <Reveal>
                <div className="details-panel rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">{t("details.yourStats", "Your Progress")}</p>
                  <div className="details-progress-grid grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center rounded-xl bg-white/5 p-3">
                      <p className="text-xl font-black text-foreground">{personalStats.episodesWatched}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Episodes</p>
                    </div>
                    <div className="text-center rounded-xl bg-white/5 p-3">
                      <p className="text-xl font-black text-foreground">{personalStats.totalHours}h</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Watched</p>
                    </div>
                    <div className="text-center rounded-xl bg-white/5 p-3">
                      <p className="text-xl font-black text-primary">{personalStats.percentageComplete}%</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Done</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700" style={{ width: `${personalStats.percentageComplete}%` }} />
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {/* ─── VIDEO GALLERY ──────────────────────────────────── */}
        {orderedVideos.length > 0 && (
          <Reveal>
            <section ref={el => { if (el) sectionRefs.current.videos = el; }} id="section-videos" className="details-media-section mt-12">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Watch preview</p>
                  <h2 className="section-title mt-1 mb-0">Videos & Trailers</h2>
                </div>
                <div className="flex items-center gap-2" aria-label="Video carousel controls">
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-full" onClick={() => scrollCarousel(videoScrollRef, -1)} aria-label="Scroll videos left">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-full" onClick={() => scrollCarousel(videoScrollRef, 1)} aria-label="Scroll videos right">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <DeferredBlock className="mt-4" placeholderClassName="h-56 sm:h-64">
                <div ref={videoScrollRef} className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 scroll-smooth">
                  {orderedVideos.map((video, i) => (
                    <VideoCard key={video.id} video={video} onPlay={handlePlayVideo} featured={i === 0} />
                  ))}
                </div>
              </DeferredBlock>
            </section>
          </Reveal>
        )}

        {/* ─── CAST & CREW ────────────────────────────────────── */}
        {details.credits?.cast && details.credits.cast.length > 0 && (
          <Reveal>
            <section ref={el => { if (el) sectionRefs.current.cast = el; }} id="section-cast" className="mt-12">
              <h2 className="section-title">{t("details.cast")}</h2>

              {/* Cast scroll */}
              <DeferredBlock className="mt-4" placeholderClassName="h-64">
                <>
                  <div ref={castScrollRef} className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth snap-x snap-mandatory">
                    {details.credits.cast.slice(0, 12).map((person: { id: number; name: string; character?: string; profile_path?: string | null }) => (
                      <Link key={person.id} to={buildPersonPath(person.id, person.name)} className="flex-shrink-0 w-28 md:w-32 group snap-start">
                        <div className="relative rounded-2xl overflow-hidden aspect-[2/3] mb-2 border border-white/8 group-hover:border-primary/40 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-primary/10">
                          {person.profile_path ? (
                            <Image
                              src={getImageUrl(person.profile_path, "w185") || ""}
                              alt={person.name} width={185} height={278}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              showSkeleton
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-3xl font-bold text-muted-foreground">{person.name.charAt(0)}</span>
                            </div>
                          )}
                          {/* Character name overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            {person.character && <p className="text-[10px] text-white/80 line-clamp-2 leading-tight">{person.character}</p>}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{person.name}</p>
                        {person.character && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{person.character}</p>}
                      </Link>
                    ))}
                  </div>

                  {castPageCount > 1 && (
                    <PaginationDots className="mt-1">
                      {Array.from({ length: castPageCount }).map((_, i) => (
                        <PaginationDotButton
                          key={`cast-p-${i}`}
                          onClick={() => {
                            const c = castScrollRef.current;
                            if (!c) return;
                            const cards = Array.from(c.children) as HTMLElement[];
                            const ti = castPageCount <= 1 || cards.length <= 1 ? 0 : Math.round((i * (cards.length - 1)) / (castPageCount - 1));
                            cards[ti]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
                          }}
                          active={i === activeCastPage}
                          aria-label={`Cast page ${i + 1}`}
                        />
                      ))}
                    </PaginationDots>
                  )}
                </>
              </DeferredBlock>

              {/* Crew grid */}
              {(directors.length > 0 || writers.length > 0 || cinematographers.length > 0 || composers.length > 0 || creators.length > 0) && (
                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    ...directors.slice(0, 2).map((p: { id: number; name: string }) => ({ ...p, role: "Director" })),
                    ...creators.slice(0, 2).map((p: { id: number; name: string }) => ({ ...p, role: "Creator" })),
                    ...writers.slice(0, 2).map((p: { id: number; name: string }) => ({ ...p, role: "Writer" })),
                    ...cinematographers.slice(0, 1).map((p: { id: number; name: string }) => ({ ...p, role: "Cinematography" })),
                    ...composers.slice(0, 1).map((p: { id: number; name: string }) => ({ ...p, role: "Music" })),
                  ].slice(0, 8).map(p => (
                    <Link key={`crew-${p.role}-${p.id}`} to={buildPersonPath(p.id, p.name)} className="rounded-xl border border-white/8 bg-white/3 p-3 hover:border-primary/35 hover:bg-primary/5 transition-all group">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{p.role}</p>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{p.name}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </Reveal>
        )}

        {/* ─── TV: NOT LOGGED IN HINT ─────────────────────────── */}
        {mediaType === "tv" && !user && (
          <div className="glass-card p-4 mt-6 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">{t("auth.signInRequired")}</Link>{" "}{t("home.hero.subtitle")}
          </div>
        )}

        {/* ─── MORE LIKE THIS ──────────────────────────────────── */}
        {recItems.length > 0 && (
          <Reveal>
            <section ref={el => { if (el) sectionRefs.current.similar = el; }} id="section-similar" className="mt-12">
              <h2 className="section-title mb-5">More Like This</h2>
              <DeferredBlock className="mt-4" placeholderClassName="h-[320px]">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {recItems.map(item => {
                    const iy = item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : null;
                    const ir = item.vote_average ? item.vote_average.toFixed(1) : null;
                    return (
                      <Link key={item.id} to={buildMediaPath(mediaType, item.id, item.title || item.name)} className="group relative">
                        <div className="relative rounded-2xl overflow-hidden aspect-[2/3] border border-white/8 group-hover:border-primary/40 transition-all duration-200 group-hover:shadow-xl group-hover:shadow-primary/10">
                          {item.poster_path ? (
                            <Image src={getImageUrl(item.poster_path, "w342") || ""} alt={item.title || item.name || "Poster"} width={170} height={255} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" showSkeleton />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Film className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5">
                            {ir && <span className="flex items-center gap-1 text-xs text-white font-bold"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{ir}</span>}
                            {iy && <span className="text-[10px] text-white/60 mt-0.5">{iy}</span>}
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium line-clamp-2 text-foreground/70 group-hover:text-foreground transition-colors leading-snug">{item.title || item.name}</p>
                      </Link>
                    );
                  })}
                </div>
              </DeferredBlock>
            </section>
          </Reveal>
        )}

        {/* ─── REVIEWS ────────────────────────────────────────── */}
        <Reveal>
          <div ref={el => { if (el) sectionRefs.current.reviews = el; }} id="section-reviews" className="mt-12">
            <DeferredBlock placeholderClassName="h-[560px]">
              <MediaComments mediaId={mediaId} mediaType={mediaType} />
            </DeferredBlock>
          </div>
        </Reveal>

        {/* ── mobile floating bottom bar ── */}
        {isStickyNavVisible && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 md:hidden">
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-background/95 p-2.5 shadow-2xl backdrop-blur-xl">
            <Button
              className={cn("min-h-11 flex-1 gap-1.5 rounded-xl text-xs font-semibold", optimisticInWatchlist ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")}
              onClick={handleAddToWatchlist} disabled={isWatchlistPending} size="sm"
              aria-label={
                optimisticInWatchlist
                  ? t("details.removeFromWatchlist", "Remove from watchlist")
                  : t("details.addToWatchlist", "Add to watchlist")
              }
            >
              {isWatchlistPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : optimisticInWatchlist ? <Bookmark className="w-3.5 h-3.5 fill-current" /> : <Plus className="w-3.5 h-3.5" />}
              {optimisticInWatchlist ? t("details.listed", "Listed") : t("details.watchlist", "Watchlist")}
            </Button>
            <Button
              className={cn("min-h-11 flex-1 gap-1.5 rounded-xl text-xs font-semibold", optimisticWatched ? "bg-emerald-600 text-white" : "border border-white/15 bg-white/5 text-foreground")}
              onClick={handleMarkAsWatched} disabled={isWatchedPending} size="sm" variant="outline"
              aria-label={
                optimisticWatched
                  ? t("details.editWatchedStatus", "Edit watched status")
                  : t("details.markAsWatched", "Mark as watched")
              }
            >
              {isWatchedPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {optimisticWatched ? t("details.watched", "Watched") : t("details.markWatched", "Mark Watched")}
            </Button>
            {featuredTrailerKey && (
              <Button
                onClick={() => handlePlayVideo(featuredTrailerKey)}
                size="sm"
                variant="outline"
                className="rounded-xl border-white/15 bg-white/5"
                aria-label={t("details.playTrailer", "Play trailer")}
              >
                <PlayCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        )}
      </div>
    </>
  );
}
