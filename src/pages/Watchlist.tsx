import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, CheckSquare, LayoutGrid, List, Printer, Square, Trash2 } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import GuestSyncBanner from "@/components/GuestSyncBanner";

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
  const { user } = useAuth();
  const { watchlist, watched, addToWatched, removeFromWatchlist } = useUserLists();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = i18n.language;

  const [statusFilter, setStatusFilter] =
    useState<WatchlistStatusFilter>("all");
  const [sortBy, setSortBy] = useState("added-desc");
  const [filterExpanded, setFilterExpanded] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

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
            return { mediaType, mediaId: parsedId } as SharedListItem;
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
  const staleQueueKeys = new Set(
    listItems
      .filter((item) => {
        if (!item.addedAt) return false;
        const added = new Date(item.addedAt).getTime();
        if (!Number.isFinite(added)) return false;
        return Date.now() - added >= 1000 * 60 * 60 * 24 * 30;
      })
      .map((item) => `${item.mediaType}-${item.mediaId}`),
  );

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

  const totalRuntimeMinutes = mediaDetails.reduce((total, media) => {
    const runtime = media.runtime || media.episode_run_time?.[0] || 0;
    return total + runtime;
  }, 0);
  const totalHoursEstimate = totalRuntimeMinutes > 0 ? Math.round(totalRuntimeMinutes / 60) : 0;
  const completionRate =
    statusCounts.all > 0 ? Math.round((statusCounts.completed / statusCounts.all) * 100) : 0;

  const selectedCount = selectedKeys.size;
  const selectedWatchlistItems = useMemo(
    () =>
      listItems.filter((item) =>
        selectedKeys.has(`${item.mediaType}-${item.mediaId}`),
      ),
    [listItems, selectedKeys],
  );

  const toggleSelect = (mediaId: number, mediaType: "movie" | "tv") => {
    const key = `${mediaType}-${mediaId}`;
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
    setSelectionMode(false);
  };

  const handleBulkMarkWatched = async () => {
    await Promise.all(
      selectedWatchlistItems.map((item) =>
        addToWatched(item.mediaId, item.mediaType),
      ),
    );
    clearSelection();
  };

  const handleBulkRemove = async () => {
    await Promise.all(
      selectedWatchlistItems.map((item) =>
        removeFromWatchlist(item.mediaId, item.mediaType),
      ),
    );
    clearSelection();
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
          {!user ? <GuestSyncBanner /> : null}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center"
          >
            <div>
              <p className="ct-kicker mb-2">{t("watchlistPage.kicker", "Curated Queue")}</p>
              <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {isSharedView
                  ? t("watchlistPage.sharedTitle", "Shared Watchlist")
                  : t("watchlist.title")}
              </h1>
              <WatchlistStatsLine
                totalCount={statusCounts.all}
                watchingCount={statusCounts.watching}
                completedCount={statusCounts.completed}
                planToWatchCount={statusCounts.plan_to_watch}
              />
            </div>

            {listItems.length > 0 && (
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
                      ? t("watchlistPage.sharedShareTitle", "Shared CineTrekker Watchlist")
                      : t("watchlistPage.myShareTitle", "My CineTrekker Watchlist")
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
                  text={t("watchlistPage.shareText", "Check out this watchlist with {{count}} titles!", {
                    count: listItems.length,
                  })}
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
                    {t("watchlistPage.grid", "Grid")}
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
                    {t("watchlistPage.list", "List")}
                  </button>
                </div>

                <ExportImportButton />

                {!isSharedView && mediaDetails.length > 0 && (
                  <Button
                    variant={selectionMode ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectionMode) {
                        clearSelection();
                      } else {
                        setSelectionMode(true);
                      }
                    }}
                  >
                    {selectionMode ? (
                      <CheckSquare className="mr-2 h-4 w-4" />
                    ) : (
                      <Square className="mr-2 h-4 w-4" />
                    )}
                    {selectionMode
                      ? t("watchlistPage.done", "Done")
                      : t("watchlistPage.bulkSelect", "Bulk Select")}
                  </Button>
                )}

                <Button variant="ghost" size="sm" asChild>
                  <Link to="/print-watchlist">
                    <Printer className="mr-2 h-4 w-4" />
                    {t("watchlistPage.print", "Print")}
                  </Link>
                </Button>
              </div>
            )}
          </motion.div>

          {isSharedView && (
            <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm text-amber-300">
              {t(
                "watchlistPage.sharedHint",
                "You are viewing a shared watchlist. Sign in to add or manage your own list.",
              )}
            </div>
          )}

          {!isSharedView && staleQueueKeys.size > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
              {t(
                "watchlistPage.staleQueueHint",
                "{{count}} titles have been in your queue for 30+ days. Pick one tonight to keep momentum.",
                { count: staleQueueKeys.size },
              )}
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
                totalHours={totalHoursEstimate}
              />
            </motion.div>
          )}

          {!isSharedView && mediaDetails.length > 0 && (
            <div className="mb-6 rounded-3xl border border-border/60 bg-card/70 px-5 py-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {t("watchlistPage.progressHeadline", "Queue progress")}
              </span>{" "}
              {t(
                "watchlistPage.progressCopy",
                "You've watched {{completed}} of {{total}} saved titles ({{percent}}%). Estimated watch time still in queue: about {{hours}} hours.",
                {
                  completed: statusCounts.completed,
                  total: statusCounts.all,
                  percent: completionRate,
                  hours: totalHoursEstimate,
                },
              )}
            </div>
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

          {!isSharedView && selectionMode && mediaDetails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedCount === 0
                      ? t("watchlistPage.selectTitlesHint", "Select titles to manage them together")
                      : t("watchlistPage.selectedCount", "{{count}} titles selected", {
                          count: selectedCount,
                        })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "watchlistPage.bulkHint",
                      "Mark selected titles as watched or remove them from your watchlist in one pass.",
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedCount === 0}
                    onClick={() => void handleBulkMarkWatched()}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {t("actions.watched", "Watched")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={selectedCount === 0}
                    onClick={() => void handleBulkRemove()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete", "Remove")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <MediaGrid items={[]} isLoading columns="normal" gap="md" />
          ) : filteredMedia.length > 0 ? (
            viewMode === "grid" ? (
              <MediaGrid
                items={filteredMedia}
                columns="normal"
                gap="md"
                selectable={selectionMode}
                selectedKeys={selectedKeys}
                onToggleSelect={toggleSelect}
              />
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
                      {selectionMode && (
                        <button
                          type="button"
                          className={`mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                            selectedKeys.has(`${mediaType}-${media.id}`)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-card text-muted-foreground"
                          }`}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleSelect(media.id, mediaType);
                          }}
                          aria-current={
                            selectedKeys.has(`${mediaType}-${media.id}`)
                              ? "true"
                              : undefined
                          }
                          aria-label={
                            selectedKeys.has(`${mediaType}-${media.id}`)
                              ? t("mediaCard.deselectTitle", "Deselect title")
                              : t("mediaCard.selectTitle", "Select title")
                          }
                        >
                          {selectedKeys.has(`${mediaType}-${media.id}`) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      )}
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
                            <bdi dir="auto">{title}</bdi>
                          </h3>
                          <Badge
                            variant="secondary"
                            className="uppercase text-xs tracking-widest"
                          >
                            {mediaType}
                          </Badge>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                          {year && <span>{year}</span>}
                          {media.vote_average > 0 && (
                            <Badge
                              variant="secondary"
                              className="rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-200"
                            >
                              ★ {media.vote_average.toFixed(1)}
                            </Badge>
                          )}
                          {media.watchStatus && (
                            <Badge variant="secondary" className="capitalize">
                              {media.watchStatus.replace(/_/g, " ")}
                            </Badge>
                          )}
                          {staleQueueKeys.has(`${mediaType}-${media.id}`) && (
                            <Badge className="rounded-full border border-amber-500/35 bg-amber-500/15 text-amber-200">
                              {t("watchlistPage.leavingSoon", "Leaving your queue soon")}
                            </Badge>
                          )}
                          <span className="text-xs uppercase tracking-[0.14em]">
                            {mediaType === "movie"
                              ? t("common.movie", "Movie")
                              : t("common.tvShow", "TV Show")}
                          </span>
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
                {t("search.clearFilters", "Clear Filters")}
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
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t(
                  "watchlistPage.buildQueueHint",
                  "Browse search, trending, or title pages and tap the bookmark to start building your queue.",
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
