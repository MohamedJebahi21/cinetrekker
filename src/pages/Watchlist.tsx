import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, LayoutGrid, List, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { useUserLists } from "@/contexts/UserListsContext";
import {
  getImageUrl,
  getMediaTitle,
  getMediaType,
  getMediaYear,
} from "@/services/tmdb";
import type { Media } from "@/types/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { EmptyState } from "@/components/EmptyStates";
import { sortMedia, type SortOption } from "@/lib/sortFilter";
import { RandomPicker } from "@/components/RandomPicker";
import { ShareButton } from "@/components/ShareButton";
import { ExportImportButton } from "@/components/ExportImportButton";
import { MediaGrid } from "@/components/MediaGrid";
import { WatchlistFilters } from "@/components/WatchlistFilters";
import {
  WatchlistStats,
  WatchlistStatsLine,
} from "@/components/WatchlistStats";
import { Image } from "@/components/ui/Image";
import { enrichMediaItems } from "@/lib/mediaEnrichment";

type WatchlistStatusFilter =
  | "all"
  | "watching"
  | "plan_to_watch"
  | "completed"
  | "dropped";

type SharedListItem = {
  mediaType: "movie" | "tv";
  mediaId: number;
  addedAt?: string;
};

type WatchlistMedia = Media & {
  watchStatus?: string;
  userRating?: number;
};

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { watchlist, watched } = useUserLists();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = i18n.language;

  const [statusFilter, setStatusFilter] =
    useState<WatchlistStatusFilter>("all");
  const [sortBy, setSortBy] = useState("added-desc");
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const sharedParam = searchParams.get("share") || "";
  const sharedItems: SharedListItem[] = sharedParam
    ? sharedParam
        .split(",")
        .map((entry) => {
          const [mediaType, mediaId] = entry.split(":");
          const parsedId = Number(mediaId);

          if (
            (mediaType === "movie" || mediaType === "tv") &&
            Number.isFinite(parsedId)
          ) {
            return { mediaType, mediaId: parsedId, addedAt: undefined };
          }

          return null;
        })
        .filter((item): item is SharedListItem => item !== null)
    : [];

  const isSharedView = sharedItems.length > 0;
  const listItems = isSharedView ? sharedItems : watchlist;

  const { data: mediaDetails = [], isLoading } = useQuery({
    queryKey: [
      "watchlist-details",
      listItems.map((item) => `${item.mediaType}-${item.mediaId}`),
      language,
    ],
    queryFn: async () => {
      return enrichMediaItems(listItems, {
        language,
        getReference: (item) => item,
        mapExtras: (item) => {
          const watchedItem = isSharedView
            ? undefined
            : watched.find(
                (watchedEntry) =>
                  watchedEntry.mediaId === item.mediaId &&
                  watchedEntry.mediaType === item.mediaType,
              );

          return {
            watchStatus: watchedItem?.status,
            userRating: watchedItem?.rating,
          };
        },
        logScope: "watchlist",
      }) as Promise<WatchlistMedia[]>;
    },
    enabled: listItems.length > 0,
  });

  const effectiveStatusFilter = isSharedView ? "all" : statusFilter;

  let filteredMedia = mediaDetails.filter((media) => {
    if (
      effectiveStatusFilter !== "all" &&
      media.watchStatus !== effectiveStatusFilter
    ) {
      return false;
    }
    return true;
  });

  const addedDates = new Map<string, Date>();
  listItems.forEach((item) => {
    addedDates.set(
      `${item.mediaType}-${item.mediaId}`,
      new Date(item.addedAt || 0),
    );
  });

  if (filteredMedia.length > 0) {
    filteredMedia = sortMedia(
      filteredMedia,
      sortBy as SortOption,
      addedDates,
    );
  }

  const statusCounts = {
    all: mediaDetails.length,
    watching: isSharedView
      ? 0
      : mediaDetails.filter((media) => media.watchStatus === "watching")
          .length,
    plan_to_watch: isSharedView
      ? 0
      : mediaDetails.filter(
          (media) =>
            media.watchStatus === "plan_to_watch" || !media.watchStatus,
        ).length,
    completed: isSharedView
      ? 0
      : mediaDetails.filter((media) => media.watchStatus === "completed")
          .length,
    dropped: isSharedView
      ? 0
      : mediaDetails.filter((media) => media.watchStatus === "dropped").length,
  };

  return (
    <>
      <SEO
        title={
          isSharedView
            ? "Shared Watchlist - CineTrekker"
            : "My Watchlist - CineTrekker"
        }
        description={
          isSharedView
            ? "A shared CineTrekker watchlist"
            : "Movies and TV shows you plan to watch"
        }
        canonical="https://cinetrekker.vercel.app/watchlist"
      />

      <div className="ct-page-shell min-h-screen">
        <div className="page-container max-w-7xl pt-20 pb-24 md:pb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center"
          >
            <div>
              <p className="ct-kicker mb-2">Curated Queue</p>
              <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {isSharedView ? "Shared Watchlist" : t("watchlist.title")}
              </h1>
              <WatchlistStatsLine
                totalCount={statusCounts.all}
                watchingCount={statusCounts.watching}
                completedCount={statusCounts.completed}
                planToWatchCount={statusCounts.plan_to_watch}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <RandomPicker
                source="watchlist"
                variant="outline"
                size="sm"
                label="Random"
              />

              <ShareButton
                title={
                  isSharedView
                    ? "Shared CineTrekker Watchlist"
                    : "My CineTrekker Watchlist"
                }
                url={
                  isSharedView
                    ? window.location.href
                    : `${window.location.origin}/watchlist?share=${encodeURIComponent(
                        listItems
                          .slice(0, 100)
                          .map((item) => `${item.mediaType}:${item.mediaId}`)
                          .join(","),
                      )}`
                }
                text={`Check out this watchlist with ${listItems.length} titles!`}
                variant="ghost"
                size="sm"
              />

              <div className="ct-toggle-group w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                    className={`ct-toggle-button flex flex-1 items-center justify-center gap-1.5 sm:flex-none ${
                      viewMode === "grid"
                        ? "ct-toggle-button-active"
                        : "hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                    className={`ct-toggle-button flex flex-1 items-center justify-center gap-1.5 sm:flex-none ${
                      viewMode === "list"
                        ? "ct-toggle-button-active"
                        : "hover:text-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>

              <ExportImportButton />

              <Button variant="ghost" size="sm" asChild>
                <Link to="/print-watchlist">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Link>
              </Button>
            </div>
          </motion.div>

          {isSharedView && (
            <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm text-amber-300">
              You&apos;re viewing a shared watchlist. Sign in to add or manage
              your own list.
            </div>
          )}

          {!isSharedView && mediaDetails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-10"
            >
              <WatchlistStats
                totalCount={statusCounts.all}
                watchingCount={statusCounts.watching}
                completedCount={statusCounts.completed}
                planToWatchCount={statusCounts.plan_to_watch}
              />
            </motion.div>
          )}

          {!isSharedView && mediaDetails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-10"
            >
              <WatchlistFilters
                statusFilter={statusFilter}
                sortBy={sortBy}
                onStatusChange={(status) =>
                  setStatusFilter(status as WatchlistStatusFilter)
                }
                onSortChange={setSortBy}
                isExpanded={filterExpanded}
                onToggleExpand={setFilterExpanded}
              />
            </motion.div>
          )}

          {isLoading ? (
            <MediaGrid items={[]} isLoading columns="normal" gap="md" />
          ) : filteredMedia.length > 0 ? (
            viewMode === "grid" ? (
              <MediaGrid items={filteredMedia} columns="normal" gap="md" />
            ) : (
              <div className="ct-list-surface divide-y divide-border/60">
                {filteredMedia.map((media) => {
                  const title = getMediaTitle(media);
                  const year = getMediaYear(media);
                  const mediaType = getMediaType(media);
                  const poster = getImageUrl(media.poster_path, "w154");

                  return (
                    <Link
                      key={`${mediaType}-${media.id}`}
                      to={`/${mediaType}/${media.id}`}
                      className="ct-list-row group items-start gap-4 p-4 sm:items-center sm:gap-5 sm:p-5"
                    >
                      <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                        {poster ? (
                          <Image
                            src={poster}
                            alt={title}
                            width={154}
                            height={231}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="min-w-0 flex-1 text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
                            {title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="uppercase text-xs tracking-widest"
                          >
                            {mediaType}
                          </Badge>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {year && <span>{year}</span>}
                          {media.vote_average > 0 && (
                            <span>★ {media.vote_average.toFixed(1)}</span>
                          )}
                          {media.watchStatus && (
                            <span className="capitalize">
                              {media.watchStatus.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : mediaDetails.length > 0 ? (
            <div className="ct-panel py-20 text-center">
              <Bookmark className="mx-auto mb-6 h-20 w-20 text-muted-foreground/40" />
              <h2 className="mb-3 text-2xl font-semibold">
                {t("watchlist.noItemsInFilter", "No items match your filters")}
              </h2>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSortBy("added-desc");
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="ct-panel">
              <EmptyState
                icon={Bookmark}
                title={t("watchlist.empty", "Your watchlist is empty")}
                description={t(
                  "watchlist.emptyDesc",
                  "Add movies and TV shows you want to watch.",
                )}
                action={{
                  label: t("common.discoverTrending", "Discover Trending"),
                  onClick: () => navigate("/search?sort=popularity.desc"),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
