import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  Heart,
  Search,
  Trash2,
  Share2,
  Film,
  Tv,
  Calendar,
  Clock,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTitleFollows } from "@/hooks/useTitleFollows";
import { getImageUrl, getMediaTitle, getBackdropUrl } from "@/services/tmdb";
import { Media, MediaDetails } from "@/types/media";
import SEO from "@/components/SEO";
import { EmptyState } from "@/components/EmptyStates";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import { createLogger } from "@/lib/logger";

type FollowedShowDetails = MediaDetails & { followedAt?: string };
const logger = createLogger("following");

function formatAirDate(isoDate: string, language: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  const formatted = date.toLocaleDateString(language, { month: "short", day: "numeric" });
  if (diffDays < 0) return formatted;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return `${formatted} · Tomorrow`;
  if (diffDays <= 60) return `${formatted} · in ${diffDays}d`;
  return formatted;
}

export default function Following() {
  const { t, i18n } = useTranslation();
  const { followedTitles, isLoading: followsLoading, unfollowTitle } = useTitleFollows();
  const navigate = useNavigate();
  const language = i18n.language;

  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get("q") || "";
  const selectedFormat = (searchParams.get("format") as "all" | "movie" | "tv") || "all";
  const selectedStatus = (searchParams.get("status") as "all" | "upcoming" | "released_ended") || "all";
  const sortBy = (searchParams.get("sort") as "followed_at" | "title" | "release_date" | "vote_average") || "followed_at";

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all" && (key !== "sort" || value !== "followed_at")) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const isFiltered = searchQuery.trim() !== "" || selectedFormat !== "all" || selectedStatus !== "all" || sortBy !== "followed_at";

  // Fetch full details for the followed titles
  const { data: showDetails, isLoading: detailsLoading } = useQuery({
    queryKey: [
      "followed-titles-details",
      followedTitles.map((item) => item.id),
      language,
    ],
    queryFn: async () => {
      return enrichMediaItems(followedTitles, {
        language,
        getReference: (item) => ({
          mediaId: item.mediaId,
          mediaType: item.mediaType,
        }),
        mapExtras: (item) => ({ followedAt: item.followedAt }),
        logScope: "following",
      }) as Promise<(MediaDetails & { followedAt?: string })[]>;
    },
    enabled: followedTitles.length > 0,
  });

  const isLoading = followsLoading || (detailsLoading && followedTitles.length > 0);

  // Stats calculation
  const stats = useMemo(() => {
    if (!showDetails) return { total: followedTitles.length, movies: 0, tv: 0, upcoming: 0 };
    let movies = 0;
    let tv = 0;
    let upcoming = 0;

    showDetails.forEach((item) => {
      if (item.media_type === "movie") {
        movies++;
        if (item.status && item.status !== "Released" && item.status !== "Canceled") {
          upcoming++;
        }
      } else if (item.media_type === "tv") {
        tv++;
        if (
          item.status === "Returning Series" ||
          item.status === "In Production" ||
          item.next_episode_to_air
        ) {
          upcoming++;
        }
      }
    });

    return { total: showDetails.length, movies, tv, upcoming };
  }, [showDetails, followedTitles]);

  // Cinematic cover backdrop url
  const backdropUrl = useMemo(() => {
    if (!showDetails || showDetails.length === 0) return null;
    const firstWithBackdrop = showDetails.find((show) => show.backdrop_path);
    return firstWithBackdrop ? getBackdropUrl(firstWithBackdrop.backdrop_path, "w1280") : null;
  }, [showDetails]);

  // Filter and sort items
  const filteredAndSorted = useMemo(() => {
    if (!showDetails) return [];

    let items = [...showDetails];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => {
        const title = getMediaTitle(item).toLowerCase();
        return title.includes(q);
      });
    }

    // 2. Format filter
    if (selectedFormat !== "all") {
      items = items.filter((item) => item.media_type === selectedFormat);
    }

    // 3. Status filter
    if (selectedStatus !== "all") {
      items = items.filter((item) => {
        const isUpcoming =
          item.media_type === "movie"
            ? (item.status && item.status !== "Released" && item.status !== "Canceled")
            : (item.status === "Returning Series" || item.status === "In Production" || !!item.next_episode_to_air);
        return selectedStatus === "upcoming" ? isUpcoming : !isUpcoming;
      });
    }

    // 4. Sorting
    items.sort((a, b) => {
      if (sortBy === "title") {
        return getMediaTitle(a).localeCompare(getMediaTitle(b));
      }
      if (sortBy === "release_date") {
        const dateA = a.release_date || a.first_air_date || "";
        const dateB = b.release_date || b.first_air_date || "";
        return dateB.localeCompare(dateA); // Newest first
      }
      if (sortBy === "vote_average") {
        return (b.vote_average || 0) - (a.vote_average || 0); // Highest rating first
      }
      // Default: date added (recent first)
      const dateA = a.followedAt || "";
      const dateB = b.followedAt || "";
      return dateB.localeCompare(dateA);
    });

    return items;
  }, [showDetails, searchQuery, selectedFormat, selectedStatus, sortBy]);

  const handleUnfollow = async (e: React.MouseEvent, showId: number, mediaType: "movie" | "tv") => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await unfollowTitle({ mediaId: showId, mediaType });
    } catch (err) {
      logger.error("Failed to unfollow", err);
    }
  };

  const handleShare = (e: React.MouseEvent, show: Media) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/${show.media_type}/${show.id}`;
    navigator.clipboard.writeText(url);
    toast.success(t("following.linkCopied", "Link copied to clipboard!"));
  };

  const renderStatusBadge = (show: MediaDetails) => {
    const isMovie = show.media_type === "movie";
    const status = show.status;

    if (isMovie) {
      if (status === "Released") {
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30 backdrop-blur-md">
            <Film className="h-3 w-3" />
            Released
          </span>
        );
      }
      if (status === "Canceled") {
        return (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/30 backdrop-blur-md">
            Canceled
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30 backdrop-blur-md">
          <Clock className="h-3 w-3 animate-pulse" />
          Upcoming
        </span>
      );
    } else {
      const nextEp = show.next_episode_to_air;
      if (nextEp?.air_date) {
        const label = formatAirDate(nextEp.air_date, language);
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/40 backdrop-blur-md shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <Calendar className="h-3 w-3 animate-pulse" />
            {`Next Ep: ${label}`}
          </span>
        );
      }
      if (status === "Returning Series" || status === "In Production") {
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
            <Tv className="h-3 w-3" />
            Returning
          </span>
        );
      }
      if (status === "Ended") {
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-500/30 backdrop-blur-md">
            Ended
          </span>
        );
      }
      if (status === "Canceled") {
        return (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/30 backdrop-blur-md">
            Canceled
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-500/30 backdrop-blur-md">
          {status || "TV Series"}
        </span>
      );
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <>
      <SEO
        title={t("following.seoTitle", "Following - CineTrekker")}
        description={t("following.seoDescription", "Titles you are currently following")}
        canonical="https://cinetrekker.vercel.app/following"
      />
      <div className="relative min-h-screen">
        {/* Cinematic Cover Banner */}
        <AnimatePresence>
          {backdropUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 z-0 h-[380px] w-full overflow-hidden"
            >
              <img
                src={backdropUrl}
                alt="Backdrop cover"
                className="h-full w-full object-cover filter blur-[24px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="page-container relative z-10 pt-24 pb-24 md:pb-12">
          {/* Header section */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="section-title flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 blur-md rounded-full" />
                  <Heart className="relative w-8 h-8 text-primary fill-primary/10 animate-pulse" />
                </div>
                {t("nav.following", "Following")}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t("following.followedCount", "{{count}} titles you're tracking", {
                  count: followedTitles.length,
                })}
              </p>
            </div>
          </div>

          {/* Stats Snapshot */}
          {followedTitles.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
              {[
                {
                  label: t("following.totalTracked", "Total Tracked"),
                  value: stats.total,
                  icon: Heart,
                  color: "text-red-500 bg-red-500/10 border-red-500/20",
                  glow: "shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]",
                },
                {
                  label: t("following.statsMovies", "Movies"),
                  value: stats.movies,
                  icon: Film,
                  color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                  glow: "shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]",
                },
                {
                  label: t("following.statsTv", "TV Series"),
                  value: stats.tv,
                  icon: Tv,
                  color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
                  glow: "shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]",
                },
                {
                  label: t("following.statsUpcoming", "Upcoming / Active"),
                  value: stats.upcoming,
                  icon: Calendar,
                  color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  glow: "shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 backdrop-blur-md transition-all duration-300 hover:border-white/20",
                      stat.glow
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", stat.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground tracking-tight">{stat.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search, filters, controls bar */}
          {followedTitles.length > 0 && (
            <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 md:p-5 backdrop-blur-md space-y-4 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Search query field */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("following.searchPlaceholder", "Search tracked titles...")}
                    value={searchQuery}
                    onChange={(e) => updateParam("q", e.target.value)}
                    className="pl-10 pr-9 bg-white/5 border-white/10 rounded-xl h-10 backdrop-blur-md focus-visible:ring-primary/50 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => updateParam("q", "")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {/* Format Filter */}
                  <div className="flex-1 min-w-[130px]">
                    <Select
                      value={selectedFormat}
                      onValueChange={(val) => updateParam("format", val)}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 text-xs rounded-xl backdrop-blur-md h-10">
                        <SelectValue placeholder={t("following.formatAll", "All Formats")} />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 border-white/10 backdrop-blur-md">
                        <SelectItem value="all">{t("following.formatAll", "All Formats")}</SelectItem>
                        <SelectItem value="movie">{t("following.formatMovies", "Movies")}</SelectItem>
                        <SelectItem value="tv">{t("following.formatTv", "TV Shows")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      value={selectedStatus}
                      onValueChange={(val) => updateParam("status", val)}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 text-xs rounded-xl backdrop-blur-md h-10">
                        <SelectValue placeholder={t("following.statusAll", "All Statuses")} />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 border-white/10 backdrop-blur-md">
                        <SelectItem value="all">{t("following.statusAll", "All Statuses")}</SelectItem>
                        <SelectItem value="upcoming">{t("following.statusUpcoming", "Upcoming / Active")}</SelectItem>
                        <SelectItem value="released_ended">{t("following.statusReleasedEnded", "Released / Ended")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort selector */}
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      value={sortBy}
                      onValueChange={(val) => updateParam("sort", val)}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 text-xs rounded-xl backdrop-blur-md h-10">
                        <SelectValue placeholder={t("following.sortBy", "Sort By")} />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 border-white/10 backdrop-blur-md">
                        <SelectItem value="followed_at">{t("following.sortByDateAdded", "Date Added")}</SelectItem>
                        <SelectItem value="title">{t("following.sortByTitle", "Title (A-Z)")}</SelectItem>
                        <SelectItem value="release_date">{t("following.sortByReleaseDate", "Release Date")}</SelectItem>
                        <SelectItem value="vote_average">{t("following.sortByRating", "Rating")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      onClick={clearAllFilters}
                      className="h-10 px-3 hover:bg-white/5 rounded-xl text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      {t("following.clearFilters", "Clear")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results grid */}
          {isLoading ? (
            <motion.div
              className="media-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="flex flex-col gap-3"
                >
                  <div className="aspect-[2/3] w-full rounded-2xl bg-white/5 border border-white/5 animate-pulse skeleton-shimmer" />
                  <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse skeleton-shimmer" />
                  <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse skeleton-shimmer" />
                </motion.div>
              ))}
            </motion.div>
          ) : filteredAndSorted.length > 0 ? (
            <motion.div
              className="media-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredAndSorted.map((show: Media & { followedAt?: string }) => {
                const title = getMediaTitle(show);
                const posterUrl = getImageUrl(show.poster_path, "w342");
                const year = show.release_date?.slice(0, 4) || show.first_air_date?.slice(0, 4);

                return (
                  <motion.div
                    key={show.id}
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_30px_-10px_rgba(239,68,68,0.25)]"
                  >
                    {/* Image Container */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          srcSet={`${getImageUrl(show.poster_path, "w185")} 185w, ${getImageUrl(show.poster_path, "w342")} 342w`}
                          sizes="(max-width: 639px) calc(50vw - 16px), (max-width: 1023px) calc(33vw - 24px), 220px"
                          alt={`${title} poster`}
                          width={342}
                          height={513}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          loading="lazy"
                          showSkeleton
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <span className="text-4xl text-primary/40">{show.media_type === "movie" ? "🎬" : "📺"}</span>
                        </div>
                      )}

                      {/* Top Right Quick Unfollow Action */}
                      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => handleUnfollow(e, show.id, show.media_type as "movie" | "tv")}
                          className="h-8 w-8 rounded-full border border-white/10 bg-black/60 text-destructive backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground"
                          aria-label={t("following.unfollowTitle", "Unfollow {{title}}", { title })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Top Left Media Type Indicator */}
                      <div className="absolute left-2 top-2 z-10">
                        <span className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/5">
                          {show.media_type === "movie" ? <Film className="h-2.5 w-2.5" /> : <Tv className="h-2.5 w-2.5" />}
                          {show.media_type}
                        </span>
                      </div>

                      {/* Bottom Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90 transition-opacity duration-300" />

                      {/* Status Badge overlays */}
                      <div className="absolute bottom-2 left-2 z-10">
                        {renderStatusBadge(show)}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="flex flex-1 flex-col p-4">
                      <Link
                        to={`/${show.media_type}/${show.id}`}
                        className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary transition-colors duration-200"
                      >
                        <bdi dir="auto">{title}</bdi>
                      </Link>

                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{year || "N/A"}</span>
                        {show.vote_average > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-amber-400">
                            ★ {show.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary/60" />
                          {show.followedAt ? new Date(show.followedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }) : "Tracked"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleShare(e, show)}
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary transition-all duration-200"
                          title={t("common.share", "Share")}
                          aria-label={t("following.shareTitle", "Share {{title}}", { title })}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : followedTitles.length > 0 ? (
            /* No results empty state */
            <EmptyState
              icon={Search}
              title={t("following.noMatch", "No matching titles found")}
              description={t(
                "following.noMatchDesc",
                "Try a broader search, switch the format, or clear filters to see your full tracking list.",
              )}
              action={{
                label: t("following.clearFilters", "Clear Filters"),
                onClick: clearAllFilters,
              }}
              className="mt-12 min-h-[360px]"
            />
          ) : (
            /* Followed count is 0 empty state */
            <EmptyState
              icon={Heart}
              title={t("following.empty", "No titles being followed")}
              description={t(
                "following.emptyDesc",
                "Follow movies and series to track releases, new episodes, cast updates, and seasonal changes from one calm dashboard.",
              )}
              action={{
                label: t("following.discoverShows", "Discover Titles"),
                onClick: () => navigate("/discover"),
              }}
              className="mt-12 min-h-[380px]"
            />
          )}
        </div>
      </div>
    </>
  );
}
