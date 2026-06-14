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
  Share2,
  ExternalLink,
  Globe,
  Film,
  Tv,
  ChevronRight,
  TrendingUp,
  DollarSign,
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

// ─── helpers ───────────────────────────────────────────────────────────────
function getPolicyRatingTag(mediaType: "movie" | "tv", details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  if (mediaType === "movie") {
    const releaseDates = (details as { release_dates?: { results?: Array<{ iso_3166_1?: string; release_dates?: Array<{ certification?: string }> }> } }).release_dates?.results;
    if (!Array.isArray(releaseDates)) return undefined;
    const ordered = [...releaseDates.filter(e => e?.iso_3166_1 === "US"), ...releaseDates.filter(e => e?.iso_3166_1 !== "US")];
    for (const entry of ordered) {
      const found = (entry?.release_dates || []).map(i => i?.certification?.trim()).find(Boolean);
      if (found) return found;
    }
    return undefined;
  }
  const contentRatings = (details as { content_ratings?: { results?: Array<{ iso_3166_1?: string; rating?: string }> } }).content_ratings?.results;
  if (!Array.isArray(contentRatings)) return undefined;
  return [...contentRatings.filter(e => e?.iso_3166_1 === "US"), ...contentRatings.filter(e => e?.iso_3166_1 !== "US")]
    .map(e => e?.rating?.trim()).find(Boolean);
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${amount.toLocaleString()}`;
}

function getStatusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case "returning series": return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" };
    case "in production":   return { cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",   dot: "bg-blue-400" };
    case "ended":           return { cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",   dot: "bg-slate-400" };
    case "cancelled":       return { cls: "bg-red-500/15 text-red-400 border-red-500/30",     dot: "bg-red-400" };
    case "released":        return { cls: "bg-violet-500/15 text-violet-400 border-violet-500/30", dot: "bg-violet-400" };
    case "post production": return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   dot: "bg-amber-400" };
    default:                return { cls: "bg-white/10 text-foreground/70 border-white/15",        dot: "bg-foreground/40" };
  }
}

// ─── Circular score ring ───────────────────────────────────────────────────
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} aria-label={`Score ${score.toFixed(1)} out of 10`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black leading-none" style={{ color }}>{score.toFixed(1)}</span>
        <span className="text-[8px] text-white/40 font-medium mt-0.5">/10</span>
      </div>
    </div>
  );
}

// ─── Video card ────────────────────────────────────────────────────────────
function VideoCard({ video, onPlay, featured }: { video: MediaVideoResult; onPlay: (k: string) => void; featured?: boolean }) {
  const thumb = `https://img.youtube.com/vi/${video.key}/${featured ? "hqdefault" : "mqdefault"}.jpg`;
  return (
    <button
      type="button"
      onClick={() => onPlay(video.key)}
      className={cn(
        "group relative flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary shadow-lg",
        featured ? "w-72 md:w-80" : "w-48 md:w-56"
      )}
      aria-label={`Play ${video.name}`}
    >
      <div className="aspect-video relative">
        <img src={thumb} alt={video.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform",
            featured ? "w-14 h-14" : "w-10 h-10"
          )}>
            <PlayCircle className={cn("text-black fill-black", featured ? "w-7 h-7" : "w-5 h-5")} />
          </div>
        </div>
        {featured && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white uppercase tracking-wider">
              {video.type}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 bg-black/60 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white/90 line-clamp-1">{video.name}</p>
        {!featured && <p className="text-[10px] text-white/50 mt-0.5">{video.type}</p>}
      </div>
    </button>
  );
}

// ─── Star rating ───────────────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star} type="button" disabled={disabled}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed p-0.5"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`} aria-pressed={value >= star}
        >
          <Star className={cn("w-7 h-7 transition-all duration-150", display >= star ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" : "text-white/20 hover:text-yellow-400/50")} />
        </button>
      ))}
    </div>
  );
}

// ─── Section reveal wrapper ────────────────────────────────────────────────
function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("transition-all duration-700", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6", className)}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
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

  const mediaType: "movie" | "tv" = location.pathname.startsWith("/tv") ? "tv" : "movie";

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
  const [inlineStarRating, setInlineStarRating] = useState<number>(watchedItem?.rating ? Math.round(watchedItem.rating / 2) : 0);
  const [inlineReviewText, setInlineReviewText] = useState<string>(watchedItem?.note || "");
  const [hasInteractedWithStars, setHasInteractedWithStars] = useState<boolean>(false);
  const [showReviewTextarea, setShowReviewTextarea] = useState<boolean>(!!watchedItem?.note);
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
    const fn = () => { if (backdropRef.current) backdropRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`; };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
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

  const { data: similarTitles } = useQuery({
    queryKey: ["similar-titles", mediaType, mediaId, language],
    queryFn: () => getSimilar(mediaType, mediaId, language),
    enabled: !!mediaId,
    retry: 3,
  });

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
    const watchedCount = watchedEpisodes.length;
    const totalEpisodes = details.number_of_episodes || 0;
    const percentageComplete = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
    let totalMinutes = 0;
    watchedEpisodes.forEach(ep => {
      const episode = seasonDetails?.episodes?.find(e => e.season_number === ep.season_number && e.episode_number === ep.episode_number);
      if (episode?.runtime) totalMinutes += episode.runtime;
    });
    return { episodesWatched: watchedCount, totalHours: (totalMinutes / 60).toFixed(1), percentageComplete, dateAdded: watchedItem ? new Date(watchedItem.addedAt || Date.now()).toLocaleDateString() : null };
  }, [user, mediaType, watchedEpisodes, details?.number_of_episodes, seasonDetails?.episodes, watchedItem]);

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
  const todayDateKey = new Date().toISOString().slice(0, 10);

  const availableSeasonNumbers = useMemo(() => {
    if (mediaType !== "tv") return [];
    return (details?.seasons?.map(s => s.season_number).filter((n, i) => n > 0 && (details.seasons?.[i]?.air_date ? details.seasons![i].air_date! <= todayDateKey : true)) ?? seasons).sort((a, b) => b - a);
  }, [details?.seasons, mediaType, seasons, todayDateKey]);

  const seasonProgress = useMemo(() => {
    if (!seasonDetails?.episodes || mediaType !== "tv") return {} as Record<number, { watched: number; total: number; percentage: number }>;
    const p: Record<number, { watched: number; total: number; percentage: number }> = {};
    seasons.forEach(n => {
      const eps = seasonDetails.episodes.filter(e => e.season_number === n && e.air_date && e.air_date <= todayDateKey);
      const w = eps.filter(e => isEpisodeWatched(mediaId, e.season_number, e.episode_number)).length;
      p[n] = { watched: w, total: eps.length, percentage: eps.length > 0 ? Math.round(w / eps.length * 100) : 0 };
    });
    return p;
  }, [seasonDetails?.episodes, seasons, mediaType, isEpisodeWatched, mediaId, todayDateKey]);

  useEffect(() => {
    if (mediaType !== "tv" || !seasonDetails?.episodes) return;
    let lastSeason = 1, maxW = 0;
    Object.entries(seasonProgress).forEach(([n, p]) => { if (p.watched > maxW) { maxW = p.watched; lastSeason = parseInt(n); } });
    setExpandedSeason((maxW > 0 ? lastSeason : 1).toString());
  }, [seasonProgress, seasonDetails?.episodes, mediaType]);

  useEffect(() => {
    if (mediaType !== "tv") return;
    if (selectedSeason && availableSeasonNumbers.includes(selectedSeason)) return;
    if (availableSeasonNumbers.length > 0) { setSelectedSeason(availableSeasonNumbers[0]); return; }
    if (!selectedSeason && seasons.length > 0) setSelectedSeason(seasons[seasons.length - 1]);
  }, [availableSeasonNumbers, mediaType, seasons, selectedSeason]);

  // ── Loading ──
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
    return <MovieRouteError message={(error as Error)?.message || t("common.error")} onRetry={() => refetch()} />;
  }
  if (isBlockedByPolicy) {
    const mode = strictFiltering ? t("details.contentBlockedModeStrict", "Strict mode") : t("details.contentBlockedModeModerate", "Moderate mode");
    return <TitleUnavailable title={t("details.contentBlockedTitle", "Title unavailable")} description={`${t("details.contentBlockedDescription", "This title is hidden by {{mode}}.", { mode })} ${t("details.contentBlockedSettingsHint", "Go to Settings > Content Safety to adjust.")}`} homeLabel={t("nav.home")} />;
  }

  // ── Data derivation ──
  const title = toDisplayTitle(details.title || details.name || "");
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

  const shouldTruncateOverview = overview.length > 300 || overview.includes("\n");
  const isPinnedFavorite = pinnedFavoriteKeys.includes(currentMediaKey);
  const statusConfig = details.status ? getStatusConfig(details.status) : null;

  const seoDescription = [details.overview || "", releaseDate ? `Release: ${releaseDate}.` : "", rating > 0 ? `Rating: ${rating.toFixed(1)}/10.` : ""].filter(Boolean).join(" ").slice(0, 160);
  const detailPath = buildMediaPath(mediaType, mediaId, title);
  const seoCanonical = buildCanonicalUrl(detailPath);
  const seoKeywords = [title, ...(details.genres?.map((g: { name: string }) => g.name) || []), mediaType === "movie" ? "movie" : "TV show", year?.toString(), "streaming", "watch online"].filter(Boolean).join(", ");

  // ── Handlers ──
  const handleAddToWatchlist = async () => {
    const next = !optimisticInWatchlist;
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
    if (watched) updateWatchedItem(mediaId, mediaType, { rating: r, note: n, status: s });
    else addToWatched(mediaId, mediaType, r, n, s);
    setStatusDialogOpen(false);
  };

  const handleInlineRatingSubmit = async () => {
    if (!user) return;
    const r10 = inlineStarRating * 2;
    const st = watchedItem?.status || "completed";
    if (watched) updateWatchedItem(mediaId, mediaType, { rating: r10, note: inlineReviewText, status: st });
    else await addToWatched(mediaId, mediaType, r10, inlineReviewText, st);
    setOptimisticWatched(true);
    toast({ title: t("details.ratingSaved", "Rating saved") });
  };

  const handleEpisodeToggle = (seasonNumber: number, episodeNumber: number, episodeName: string, airDate: string | null) => {
    if (isEpisodeWatched(mediaId, seasonNumber, episodeNumber)) removeEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber });
    else markEpisodeWatched({ showId: mediaId, seasonNumber, episodeNumber, episodeName, airDate: airDate || undefined, showName: title, posterPath: details?.poster_path });
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
      <div ref={heroRef} className="relative -mt-16 overflow-hidden" style={{ minHeight: "clamp(420px, 68vh, 740px)" }}>
        {/* Parallax backdrop */}
        <div ref={backdropRef} className="absolute will-change-transform" style={{ inset: "-15% 0 0 0", height: "130%" }}>
          {backdropUrl ? (
            <Image src={backdropUrl} srcSet={backdropSrcSet || undefined} sizes="100vw" alt={getMediaAltText(title, mediaType, "backdrop")} width={1280} height={720} fetchPriority="high" loading="eager" priority className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
          )}
        </div>

        {/* Layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent pointer-events-none" />

        {/* Subtle grain texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

        {/* Back button */}
        <Link to="/" className="absolute top-20 left-4 z-20 flex items-center gap-2 text-sm text-white/80 hover:text-white bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl transition-all border border-white/10 hover:border-white/30 hover:bg-white/20" aria-label={t("nav.home")}>
          <ChevronLeft className="w-4 h-4" />{t("nav.home")}
        </Link>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="page-container pb-10 pt-20 md:pb-12">
            <div className="flex flex-col md:flex-row md:items-end gap-8">

              {/* Poster — large and prominent in the hero */}
              <div className="flex-shrink-0 mx-auto md:mx-0 relative group">
                <div className="relative">
                  {details.poster_path ? (
                    <Image
                      src={posterUrl} srcSet={posterSrcSet || undefined}
                      sizes="(max-width: 768px) 140px, 200px"
                      alt={getMediaAltText(title, mediaType, "poster")}
                      width={500} height={750} loading="lazy" showSkeleton
                      className="w-36 md:w-48 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] border border-white/10 group-hover:border-primary/40 transition-all duration-300"
                    />
                  ) : (
                    <div className="w-36 md:w-48 aspect-[2/3] bg-muted/30 rounded-2xl border border-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Film className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  {/* Score ring on poster */}
                  {rating > 0 && (
                    <div className="absolute -bottom-4 -right-4 bg-background/90 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-xl">
                      <ScoreRing score={rating} size={62} />
                    </div>
                  )}
                </div>
              </div>

              {/* Title and metadata */}
              <div className="flex-1 space-y-3 md:pb-2">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-white/20 bg-black/40 text-white/90 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm">
                    {mediaType === "movie" ? t("common.movie") : t("common.tvShow")}
                  </Badge>
                  {year && <span className="text-sm text-white/60 font-medium">{year}</span>}
                  {contentRatingTag && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded border border-white/25 bg-black/50 text-white/80 backdrop-blur-sm">{contentRatingTag}</span>
                  )}
                  {statusConfig && details.status && (
                    <span className={cn("flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border backdrop-blur-sm", statusConfig.cls)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusConfig.dot)} />
                      {details.status}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl tracking-tight">
                  {title}
                </h1>

                {/* Tagline */}
                {details.tagline && (
                  <p className="text-sm italic text-white/55 md:text-base">"{details.tagline}"</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                  {runtime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{runtime} {t("details.minutes")}</span>}
                  {details.number_of_seasons && <span>{details.number_of_seasons} {t("details.seasons")}</span>}
                  {details.number_of_episodes && <span>{details.number_of_episodes} {t("details.episodes")}</span>}
                  {(directors.length > 0 || creators.length > 0) && (
                    <span className="flex items-center gap-1">
                      <Film className="w-3.5 h-3.5" />
                      {(directors.length > 0 ? directors : creators).slice(0, 2).map((d: { name: string }) => d.name).join(", ")}
                    </span>
                  )}
                  {details.networks && details.networks.length > 0 && (
                    <span className="flex items-center gap-1"><Tv className="w-3.5 h-3.5" />{details.networks.slice(0, 2).map((n: { name: string }) => n.name).join(", ")}</span>
                  )}
                </div>

                {/* Genres */}
                {details.genres && details.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {details.genres.map((g: { id: number; name: string }) => (
                      <span key={g.id} className="px-3 py-1 rounded-full text-xs font-medium border border-white/15 bg-white/8 text-white/80 backdrop-blur-sm">{g.name}</span>
                    ))}
                  </div>
                )}

                {/* Hero CTA */}
                {featuredTrailerKey && (
                  <Button
                    size="lg"
                    className="gap-2 bg-white text-black hover:bg-white/90 font-bold shadow-2xl hover:shadow-white/20 transition-all hover:scale-105 active:scale-95 rounded-xl"
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
        <div className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-white/8 shadow-sm">
          <div className="page-container">
            <nav className="flex items-center gap-0.5 overflow-x-auto py-2.5 hide-scrollbar">
              {navItems.map(n => (
                <button
                  key={n.id}
                  onClick={() => scrollTo(n.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    activeSection === n.id
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/6"
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
      <div className="page-container pb-28 md:pb-12 space-y-0">

        {/* ─── ACTION BAR ─────────────────────────────────────── */}
        <Reveal className="mt-8">
          <div className="rounded-2xl border border-white/8 bg-card/50 backdrop-blur-md p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("details.primaryActions", "Your Next Move")}</p>
                {!user && <p className="text-xs text-muted-foreground mt-1">{t("details.guestTrackingHint", "Guest actions save locally — create an account later for sync.")}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={optimisticInWatchlist ? "secondary" : "default"}
                className={cn("gap-2 rounded-xl font-semibold", optimisticInWatchlist ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20")}
                onClick={handleAddToWatchlist} disabled={isWatchlistPending}
              >
                {isWatchlistPending ? <Loader2 className="w-4 h-4 animate-spin" /> : optimisticInWatchlist ? <Bookmark className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                {optimisticInWatchlist ? t("details.inWatchlist", "In Watchlist ✓") : t("details.addToWatchlist", "Add to Watchlist")}
              </Button>

              <Button
                variant="outline"
                className={cn("gap-2 rounded-xl font-semibold", optimisticWatched ? "border-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-700" : "")}
                onClick={handleMarkAsWatched} disabled={isWatchedPending}
              >
                {isWatchedPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t("details.watched", "Watched")}
              </Button>

              <FollowUpdatesButton mediaId={mediaId} mediaType={mediaType} title={title} posterPath={details.poster_path} details={details} />

              <Button variant={isPinnedFavorite ? "secondary" : "outline"} className="gap-2 rounded-xl" onClick={handleTogglePinnedFavorite}>
                <Pin className="w-4 h-4" />{isPinnedFavorite ? "Pinned" : "Pin"}
              </Button>

              {featuredTrailerKey && (
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => handlePlayVideo(featuredTrailerKey)}>
                  <PlayCircle className="w-4 h-4" />{t("details.watchTrailer", "Trailer")}
                </Button>
              )}

              <Button variant="outline" className="gap-2 rounded-xl" onClick={handleShare}>
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
          className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]"
        >
          {/* Overview + Keywords */}
          <Reveal>
            <div className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-6 h-full">
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

              <p className={cn("text-sm leading-[1.9] text-foreground/75 md:text-[15px] whitespace-pre-line", !showFullOverview && shouldTruncateOverview && "line-clamp-5")}>
                {overview}
              </p>
              {shouldTruncateOverview && (
                <Button variant="link" size="sm" className="mt-2 px-0 text-primary font-semibold" onClick={() => setShowFullOverview(s => !s)}>
                  {showFullOverview ? t("common.readLess", "Read Less") : t("common.readMore", "Read More")}
                </Button>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-3">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllKeywords ? keywords : keywords.slice(0, 14)).map(kw => (
                      <span key={kw.id} className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/8 text-foreground/60 hover:border-primary/30 hover:text-foreground transition-colors cursor-default">
                        {kw.name}
                      </span>
                    ))}
                    {keywords.length > 14 && (
                      <button onClick={() => setShowAllKeywords(s => !s)} className="px-2.5 py-1 rounded-full text-xs text-primary hover:bg-primary/10 transition-colors border border-primary/20">
                        {showAllKeywords ? "Less" : `+${keywords.length - 14}`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Watch options */}
            <Reveal>
              <div className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
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
              <div className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">Details</p>
                <dl className="space-y-2.5 text-sm">
                  {details.status && statusConfig && (
                    <div className="flex justify-between gap-2 items-center">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border", statusConfig.cls)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />{details.status}
                      </dd>
                    </div>
                  )}
                  {releaseDate && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{mediaType === "movie" ? "Released" : "First aired"}</dt>
                      <dd className="font-medium text-right text-sm">{new Date(releaseDate).toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" })}</dd>
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
                      <dd className="font-medium flex items-center gap-1"><Globe className="w-3 h-3 opacity-60" />{new Intl.DisplayNames([language], { type: "language" }).of(details.original_language) || details.original_language}</dd>
                    </div>
                  )}
                  {details.production_countries && details.production_countries.length > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Country</dt>
                      <dd className="font-medium text-right">{details.production_countries.slice(0, 2).map((c: { name: string }) => c.name).join(", ")}</dd>
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
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground shrink-0">Studio</dt>
                      <dd className="font-medium text-right text-xs leading-relaxed">{details.production_companies.slice(0, 3).map((c: { name: string }) => c.name).join(" · ")}</dd>
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
                <div className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">{t("details.yourStats", "Your Progress")}</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
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
            <section ref={el => { if (el) sectionRefs.current.videos = el; }} id="section-videos" className="mt-12">
              <h2 className="section-title mb-5">Videos & Trailers</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth snap-x snap-mandatory">
                {orderedVideos.map((video, i) => (
                  <VideoCard key={video.id} video={video} onPlay={handlePlayVideo} featured={i === 0} />
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* ─── CAST & CREW ────────────────────────────────────── */}
        {details.credits?.cast && details.credits.cast.length > 0 && (
          <Reveal>
            <section ref={el => { if (el) sectionRefs.current.cast = el; }} id="section-cast" className="mt-12">
              <h2 className="section-title">{t("details.cast")}</h2>

              {/* Cast scroll */}
              <div ref={castScrollRef} className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth snap-x snap-mandatory mt-4">
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

        {/* ─── RATING & REVIEW ─────────────────────────────────── */}
        <Reveal>
          <div className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-6 mt-12">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-bold text-foreground">{t("details.yourRatingReview", "Your Rating & Review")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user ? t("details.ratingReviewSignedInPrompt", "Keep a personal score and short note for this title.") : t("details.ratingReviewGuestPrompt", "Sign in to rate this title.")}
                </p>
              </div>
              {/* TMDB score comparison */}
              {rating > 0 && (
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">TMDB</p>
                    <ScoreRing score={rating} size={64} />
                    <p className="text-[9px] text-muted-foreground mt-1">{details.vote_count?.toLocaleString()} votes</p>
                  </div>
                  {user && watchedItem?.rating && (
                    <>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-40" />
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">You</p>
                        <ScoreRing score={watchedItem.rating} size={64} />
                        <p className={cn("text-[9px] mt-1 font-bold", watchedItem.rating > rating ? "text-emerald-400" : watchedItem.rating < rating ? "text-red-400" : "text-muted-foreground")}>
                          {watchedItem.rating > rating ? `▲ +${(watchedItem.rating - rating).toFixed(1)}` : watchedItem.rating < rating ? `▼ ${(watchedItem.rating - rating).toFixed(1)}` : "= Avg"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!user && <Button asChild variant="outline" className="rounded-xl shrink-0"><Link to="/login">{t("details.signInToReview", "Sign In")}</Link></Button>}
            </div>

            {user && (
              <div className="space-y-4">
                <StarRating value={inlineStarRating} onChange={v => { setInlineStarRating(v); setHasInteractedWithStars(true); setShowReviewTextarea(true); }} />
                {showReviewTextarea && (
                  <div className="space-y-3">
                    <textarea
                      value={inlineReviewText} onChange={e => setInlineReviewText(e.target.value)}
                      placeholder={t("details.reviewPlaceholder", "Write your review here...")}
                      className="w-full min-h-[90px] rounded-xl border border-white/10 bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                      rows={3}
                    />
                    {hasInteractedWithStars && (
                      <Button type="button" onClick={handleInlineRatingSubmit} className="gap-2 rounded-xl" disabled={inlineStarRating === 0}>
                        <MessageSquare className="w-4 h-4" />
                        {watchedItem?.rating ? t("details.updateRating", "Update Rating & Review") : t("details.addRating", "Add Rating & Review")}
                      </Button>
                    )}
                  </div>
                )}
                {watchedItem && !hasInteractedWithStars && (
                  <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary">{watchedItem.status || "completed"}</Badge>
                      {typeof watchedItem.rating === "number" && <Badge variant="outline">{watchedItem.rating}/10</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {watchedItem.note?.trim() || t("details.noNoteYet", "No note yet.")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* ─── TV: NOT LOGGED IN HINT ─────────────────────────── */}
        {mediaType === "tv" && !user && (
          <div className="glass-card p-4 mt-6 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">{t("auth.signInRequired")}</Link>{" "}{t("home.hero.subtitle")}
          </div>
        )}

        {/* ─── EPISODES ───────────────────────────────────────── */}
        {mediaType === "tv" && seasons.length > 0 && (
          <Reveal>
            <section ref={el => { if (el) sectionRefs.current.episodes = el; }} id="section-episodes" className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-6 mt-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-foreground">{t("details.availableEpisodes", "Episodes")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t("details.availableEpisodesDescription", "Browse published episodes and read summaries.")}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {user && (
                    <Button variant="outline" size="sm" className="rounded-xl gap-1 shrink-0" onClick={() => {
                      if (!selectedSeason || !seasonDetails) return;
                      markAllSeasonsWatched({ showId: mediaId, allEpisodes: seasonDetails.episodes?.map(ep => ({ season_number: selectedSeason, episode_number: ep.episode_number, name: ep.name, air_date: ep.air_date ?? undefined })) || [], showName: details?.name, posterPath: details?.poster_path });
                    }} disabled={!selectedSeason || !seasonDetails}>
                      <Check className="w-3.5 h-3.5" />Mark Season
                    </Button>
                  )}
                  {/* Season chips with poster thumbnails */}
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {(availableSeasonNumbers.length > 0 ? availableSeasonNumbers : seasons.slice().reverse()).map(n => {
                      const prog = seasonProgress[n];
                      const seasonInfo = details.seasons?.find((s: { season_number: number }) => s.season_number === n);
                      return (
                        <button
                          key={`sc-${n}`} type="button"
                          onClick={() => setSelectedSeason(n)}
                          className={cn(
                            "flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                            selectedSeason === n
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                              : "bg-background/50 border-white/10 hover:bg-white/8 hover:border-white/20"
                          )}
                        >
                          {seasonInfo?.poster_path && (
                            <img
                              src={getImageUrl(seasonInfo.poster_path, "w92") || ""}
                              alt={`Season ${n}`}
                              className="w-5 h-7 rounded object-cover opacity-90"
                            />
                          )}
                          S{n}
                          {prog && prog.total > 0 && (
                            <span className={cn("text-[10px]", selectedSeason === n ? "opacity-80" : "text-muted-foreground")}>
                              {prog.watched}/{prog.total}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!selectedSeason ? (
                <p className="text-sm text-muted-foreground">{t("details.selectSeasonPrompt", "Select a season above.")}</p>
              ) : !seasonDetails ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("details.loadingSeasonEpisodes", "Loading...")}</div>
              ) : publishedEpisodes.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-5 text-sm text-muted-foreground">
                  {t("details.noPublishedEpisodes", "No published episodes available for this season yet.")}
                </div>
              ) : (
                <div className="space-y-2">
                  {user && (
                    <div className="flex justify-end mb-2">
                      <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => {
                        markSeasonWatched({ showId: mediaId, seasonNumber: selectedSeason!, episodes: publishedEpisodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name, air_date: ep.air_date ?? undefined })), showName: details?.name, posterPath: details?.poster_path });
                      }}>
                        <Check className="w-3.5 h-3.5" />
                        {t("details.markSeasonWatched", "Mark All Watched (S{{season}})", { season: selectedSeason })}
                      </Button>
                    </div>
                  )}
                  <Accordion type="single" collapsible className="w-full">
                    {publishedEpisodes.map((episode, index) => {
                      const ew = isEpisodeWatched(mediaId, episode.season_number, episode.episode_number);
                      const isNext = index > 0 && !isEpisodeWatched(mediaId, publishedEpisodes[index - 1].season_number, publishedEpisodes[index - 1].episode_number);
                      return (
                        <AccordionItem
                          key={`ep-${episode.id}`}
                          value={`ep-${episode.id}`}
                          className={cn("border-b border-white/6 last:border-0", isNext && "border-l-2 border-l-primary/40")}
                        >
                          <AccordionTrigger className="gap-3 text-left md:hover:no-underline py-3">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Episode still */}
                              {episode.still_path && (
                                <div className="flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden hidden sm:block border border-white/8">
                                  <Image src={getImageUrl(episode.still_path, "w185") || ""} alt={episode.name} width={185} height={104} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              )}
                              {/* Watch toggle */}
                              <div
                                role="button" tabIndex={0}
                                onClick={e => { e.stopPropagation(); handleEpisodeToggle(episode.season_number, episode.episode_number, episode.name, episode.air_date); }}
                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); handleEpisodeToggle(episode.season_number, episode.episode_number, episode.name, episode.air_date); } }}
                                className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer", ew ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/8 text-muted-foreground hover:bg-white/15")}
                                aria-label={ew ? "Mark unwatched" : "Mark watched"}
                              >
                                {ew && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">S{episode.season_number}E{episode.episode_number}</span>
                                  {isNext && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Next Up</Badge>}
                                  {episode.vote_average && episode.vote_average > 0 && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />{episode.vote_average.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-foreground mt-0.5 line-clamp-1">{episode.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {episode.air_date ? new Date(episode.air_date).toLocaleDateString(language) : "TBA"}
                                  {episode.runtime ? ` · ${episode.runtime} ${t("details.minutes")}` : ""}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-xl border border-white/8 bg-white/3 p-4 mb-2">
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {episode.overview?.trim() || t("details.noEpisodeDescription", "No description available.")}
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </section>
          </Reveal>
        )}

        {/* ─── MORE LIKE THIS ──────────────────────────────────── */}
        {recItems.length > 0 && (
          <Reveal>
            <section ref={el => { if (el) sectionRefs.current.similar = el; }} id="section-similar" className="mt-12">
              <h2 className="section-title mb-5">More Like This</h2>
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
            </section>
          </Reveal>
        )}

        {/* ─── REVIEWS ────────────────────────────────────────── */}
        <Reveal>
          <div ref={el => { if (el) sectionRefs.current.reviews = el; }} id="section-reviews" className="mt-12">
            <MediaComments mediaId={mediaId} mediaType={mediaType} />
          </div>
        </Reveal>

        {/* ── mobile floating bottom bar ── */}
        <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden">
          <div className="flex gap-2 bg-background/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl">
            <Button
              className={cn("flex-1 gap-1.5 rounded-xl text-sm font-semibold", optimisticInWatchlist ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")}
              onClick={handleAddToWatchlist} disabled={isWatchlistPending} size="sm"
            >
              {isWatchlistPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : optimisticInWatchlist ? <Bookmark className="w-3.5 h-3.5 fill-current" /> : <Plus className="w-3.5 h-3.5" />}
              {optimisticInWatchlist ? "Listed" : "Watchlist"}
            </Button>
            <Button
              className={cn("flex-1 gap-1.5 rounded-xl text-sm font-semibold", optimisticWatched ? "bg-emerald-600 text-white" : "border border-white/15 bg-white/5 text-foreground")}
              onClick={handleMarkAsWatched} disabled={isWatchedPending} size="sm" variant="outline"
            >
              {isWatchedPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {optimisticWatched ? "Watched ✓" : "Mark Watched"}
            </Button>
            {featuredTrailerKey && (
              <Button onClick={() => handlePlayVideo(featuredTrailerKey)} size="sm" variant="outline" className="rounded-xl border-white/15 bg-white/5">
                <PlayCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
