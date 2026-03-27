import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Play from "lucide-react/dist/esm/icons/play";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import BookmarkCheck from "lucide-react/dist/esm/icons/bookmark-check";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Star from "lucide-react/dist/esm/icons/star";
import Check from "lucide-react/dist/esm/icons/check";
import { Link } from "react-router-dom";
import {
  getTrending,
  getBackdropUrl,
  getMediaTitle,
  getMovieVideos,
  getTVVideos,
  getMediaType,
} from "@/services/tmdb";
import { Button } from "@/components/ui/button";
import { useUserLists } from "@/contexts/UserListsContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/Image";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import type { Media } from "@/types/media";
import { buildMediaPath, getMediaAltText } from "@/lib/seo";

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useUserLists();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;
  const [showTrailer, setShowTrailer] = useState(false);
  const [allowTrailerFetch, setAllowTrailerFetch] = useState(false);

  useEffect(() => {
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const enable = () => setAllowTrailerFetch(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1800 });
    } else {
      timeoutId = setTimeout(enable, 300);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const { data: trendingDay, isLoading } = useQuery({
    queryKey: ["trending", "day", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
  });

  const filteredTrending = applySafetyFilter<Media>(
    (trendingDay?.results ?? []) as Media[],
    strictFiltering,
    moderateFiltering,
  );
  const heroMedia = filteredTrending[0];
  const heroTitle = heroMedia ? getMediaTitle(heroMedia) : "";
  const mediaType = heroMedia ? getMediaType(heroMedia) : "movie";
  const heroBackdropSrc = heroMedia?.backdrop_path
    ? getBackdropUrl(heroMedia.backdrop_path, "w1280")
    : null;
  const heroBackdropSrcSet = heroMedia?.backdrop_path
    ? `${getBackdropUrl(heroMedia.backdrop_path, "w342")} 342w, ${getBackdropUrl(heroMedia.backdrop_path, "w780")} 780w, ${getBackdropUrl(heroMedia.backdrop_path, "w1280")} 1280w, ${getBackdropUrl(heroMedia.backdrop_path, "original")} 1920w`
    : null;

  // Fetch trailer
  const { data: videos } = useQuery({
    queryKey: ["videos", mediaType, heroMedia?.id, language],
    queryFn: () =>
      mediaType === "movie"
        ? getMovieVideos(heroMedia!.id, language)
        : getTVVideos(heroMedia!.id, language),
    enabled: allowTrailerFetch && !!heroMedia?.id,
  });

  const trailer =
    videos?.results?.find(
      (v) => v.type === "Trailer" && v.site === "YouTube",
    ) || videos?.results?.find((v) => v.site === "YouTube");

  const inWatchlist = heroMedia
    ? isInWatchlist(heroMedia.id, mediaType)
    : false;

  const handleWatchlist = () => {
    if (!heroMedia || !user) return;
    if (inWatchlist) {
      removeFromWatchlist(heroMedia.id, mediaType);
    } else {
      addToWatchlist(heroMedia.id, mediaType);
    }
  };

  if (isLoading || !heroMedia) {
    return (
      <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh] flex items-center bg-background">
        <div className="absolute inset-0 skeleton-shimmer" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh] flex items-center bg-background">
      {/* Optimized Backdrop Image */}
      {heroBackdropSrc && (
        <Image
          src={heroBackdropSrc}
          srcSet={heroBackdropSrcSet ?? undefined}
          sizes="100vw"
          alt={getMediaAltText(heroTitle, mediaType, "backdrop")}
          width={1280}
          height={720}
          fetchPriority="high"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Fixed vignette/overlays so hero rendering is consistent across themes */}
      <div className="absolute inset-0 pointer-events-none vignette-overlay" />

      {/* Enhanced Gradient Overlays - Deeper bottom for content readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/24 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/52 via-black/26 md:via-black/16 to-transparent" />
      {/* Subtle red-to-transparent overlay (bottom -> top) to blend poster into the page */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-red-600/7 via-red-600/3 to-transparent" />
      {/* Extra bottom gradient for "Because You Liked" section readability */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/62 to-transparent" />

      {/* Trailer Overlay */}
      {showTrailer && trailer && (
        <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setShowTrailer(false)}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={t("actions.close", "Close")}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="w-full max-w-5xl aspect-video mx-4">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
              title={trailer.name}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="relative container mx-auto px-4 py-24 md:py-40 pt-20 md:pt-32 z-10">
        <div className="max-w-2xl">
          {/* Main Page Heading */}
          <h1 className="mb-3 max-w-xl text-4xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] md:text-6xl">
            Never forget a movie again.
          </h1>
          <p className="mb-5 max-w-xl text-base text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] md:mb-7 md:text-xl">
            Track what you've watched, build your watchlist, discover what's next.
          </p>

          {/* Featured / Trending Badge */}
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="trending-badge">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <span className="uppercase tracking-wider">
                #1 {t("home.trending", "Trending")} {t("home.today", "Today")}
              </span>
            </div>
          </div>

          {/* Trending Media Title */}
          <h2 className="heading-cinematic mb-3 text-3xl font-bold leading-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] md:mb-4 md:text-6xl lg:text-7xl">
            {getMediaTitle(heroMedia)}
          </h2>

          {/* Overview - max 2 lines on mobile with ellipsis */}
          {heroMedia.overview && (
            <p className="mb-4 max-w-xl line-clamp-2 text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.62)] md:mb-6 md:line-clamp-3 md:text-lg">
              {heroMedia.overview}
            </p>
          )}

          {/* Rating & Meta - Compact on mobile */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 md:mb-8 text-xs md:text-sm">
            {heroMedia.vote_average > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/20 px-2.5 py-1.5 font-semibold text-red-100 shadow-[0_0_16px_rgba(229,9,20,0.2)] backdrop-blur-sm md:px-3">
                <Star className="h-3.5 w-3.5 fill-current" />
                {heroMedia.vote_average.toFixed(1)}
              </span>
            )}
            {(heroMedia.release_date || heroMedia.first_air_date) && (
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-white/90 backdrop-blur-sm">
                {new Date(
                  heroMedia.release_date || heroMedia.first_air_date || "",
                ).getFullYear()}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] uppercase text-white/90 backdrop-blur-sm md:text-xs">
              {mediaType === "movie" ? t("common.movie") : t("common.tvShow")}
            </span>
          </div>

          {/* CTA Buttons - Side by side on mobile for vertical space savings */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
            <Button
              asChild
              size="default"
              className="btn-primary-glow h-11 w-full px-4 text-sm md:h-12 md:px-6 md:text-base sm:w-auto"
              aria-label={user ? "Open your watchlist" : "Start your watchlist"}
            >
              <Link to={user ? "/watchlist" : "/signup"}>
                {user ? "Open Your Watchlist" : "Start Your Watchlist"}
              </Link>
            </Button>

            <Button
              asChild
              size="default"
              variant="outline"
              className="h-11 w-full border-white/20 bg-black/35 px-4 text-sm text-white hover:bg-white/10 md:h-12 md:px-6 md:text-base sm:w-auto"
              aria-label="Browse movies"
            >
              <Link to="/search?type=movie">Browse Movies</Link>
            </Button>

            {trailer && (
              <Button
                size="default"
                variant="outline"
                onClick={() => setShowTrailer(true)}
                className="gap-2 h-11 w-full border-white/20 bg-black/35 px-4 text-sm text-white hover:bg-white/10 md:h-12 md:px-6 md:text-base sm:w-auto"
                aria-label={t("actions.watchTrailer", "Watch Trailer")}
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                {t("actions.watchTrailer", "Watch Trailer")}
              </Button>
            )}

            {user && (
              <Button
                size="default"
                variant="outline"
                onClick={handleWatchlist}
                className={cn(
                  "action-bounce w-full sm:w-auto gap-2 h-11 md:h-12 px-3 md:px-6 text-sm md:text-base border backdrop-blur-sm shadow-sm transition-all",
                  inWatchlist
                    ? "border-red-400/60 bg-red-500/20 text-red-100 hover:bg-red-500/28 hover:border-red-300/80 shadow-[0_0_20px_rgba(229,9,20,0.25)]"
                    : "border-white/25 bg-black/20 text-white/90 hover:bg-white/15",
                )}
                aria-label={
                  inWatchlist
                    ? t("actions.removeFromWatchlist")
                    : t("actions.addToWatchlist")
                }
              >
                {inWatchlist ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">
                      {t("actions.inWatchlist", "In Watchlist")}
                    </span>
                    <span className="sm:hidden">Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">
                      {t("actions.addToWatchlist")}
                    </span>
                    <span className="sm:hidden">Watchlist</span>
                  </>
                  )}
              </Button>
            )}
          </div>

          <div className="mt-4">
            <Link
              to={buildMediaPath(mediaType, heroMedia.id, heroTitle)}
              className="text-sm text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              More about {heroTitle}
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Track Watched", icon: Check },
              { label: "Build Watchlist", icon: Bookmark },
              { label: "Discover New Favorites", icon: Sparkles },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/90 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-white" />
                  <span>{feature.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
