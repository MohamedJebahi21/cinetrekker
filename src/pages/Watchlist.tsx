import { useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, CheckSquare, LayoutGrid, List, Printer, Square, Trash2, MoreHorizontal, Share2, Download, Upload, X } from "lucide-react";
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
import { MediaGrid } from "@/components/MediaGrid";
import { WatchlistFilters } from "@/components/WatchlistFilters";
import { Image } from "@/components/ui/Image";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import { useAuth } from "@/contexts/AuthContext";
import GuestSyncBanner from "@/components/GuestSyncBanner";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

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

type ImportedListItem = {
  mediaId: number;
  mediaType: "movie" | "tv";
  rating?: number;
  note?: string;
  status?: "watching" | "plan_to_watch" | "completed" | "dropped";
};

type ImportedBackup = {
  watchlist?: ImportedListItem[];
  watched?: ImportedListItem[];
};

type WatchlistMedia = Media & {
  watchStatus?: string;
  userRating?: number;
};

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const {
    watchlist,
    watched,
    addToWatchlist,
    addToWatched,
    removeFromWatchlist,
    loading: userListsLoading,
  } = useUserLists();
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
  const [showStaleNudge, setShowStaleNudge] = useState(true);

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
  const isContentLoading = userListsLoading || (listItems.length > 0 && isLoading);
  const isInitialLibraryLoading =
    userListsLoading && !isSharedView && listItems.length === 0;

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShare = async () => {
    const url = isSharedView
      ? window.location.href
      : `${window.location.origin}/watchlist?share=${encodeURIComponent(
          listItems
            .slice(0, 100)
            .map((item) => `${item.mediaType}:${item.mediaId}`)
            .join(","),
        )}`;
    const title = isSharedView
      ? t("watchlistPage.sharedShareTitle", "Shared CineTrekker Watchlist")
      : t("watchlistPage.myShareTitle", "My CineTrekker Watchlist");
    const text = t("watchlistPage.shareText", "Check out this watchlist with {{count}} titles!", {
      count: listItems.length,
    });

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("share.copySuccess", "Link copied!"));
      } catch (err) {
        toast.error(t("share.copyError", "Failed to copy"));
      }
    }
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      watchlist,
      watched,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinetrekker-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t("export.success", "Export successful!"), {
      description: t("export.successDesc", "Your data has been exported to a JSON file."),
    });
  };

  const exportToCSV = (type: "watchlist" | "watched") => {
    const data = type === "watchlist" ? watchlist : watched;
    
    const headers = ["Title ID", "Media Type", "Added Date", "Status", "Rating", "Note"];
    const rows = data.map((item) => [
      item.mediaId,
      item.mediaType,
      item.addedAt || "",
      item.status || "",
      item.rating || "",
      item.note ? `"${item.note.replace(/"/g, '""')}"` : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cinetrekker-${type}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t("export.success", "Export successful!"), {
      description: t("export.successDescType", "Your {{type}} has been exported to a CSV file.", { type }),
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as ImportedBackup;
        
        const importedWatchlist = parsed.watchlist || [];
        const importedWatched = parsed.watched || [];

        await Promise.all(
          importedWatchlist.map((i) => addToWatchlist(i.mediaId, i.mediaType))
        );
        await Promise.all(
          importedWatched.map((i) =>
            addToWatched(i.mediaId, i.mediaType, i.rating, i.note, i.status)
          )
        );

        toast.success(t("import.success", "Import successful!"), {
          description: t("import.successDesc", "Imported items from backup."),
        });
      } catch (err) {
        toast.error(t("import.failed", "Import failed"), {
          description: t("import.failedDesc", "Could not parse the file or file is invalid."),
        });
      }
    };

    reader.readAsText(file);
    event.target.value = "";
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
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {t("watchlistPage.focusedQueueCopy", "Choose one title for tonight, then keep the rest of your queue calm and organized.")}
              </p>
            </div>

            {listItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto z-10">
                <RandomPicker
                  source="watchlist"
                  variant="outline"
                  size="sm"
                  label={t("watchlistPage.pickTonight", "Pick tonight")}
                />

                <div className="ct-toggle-group">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`ct-toggle-button flex items-center gap-1.5 min-h-[38px] px-3.5 ${
                      viewMode === "grid"
                        ? "ct-toggle-button-active"
                        : "hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("watchlistPage.grid", "Grid")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`ct-toggle-button flex items-center gap-1.5 min-h-[38px] px-3.5 ${
                      viewMode === "list"
                        ? "ct-toggle-button-active"
                        : "hover:text-foreground"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("watchlistPage.list", "List")}</span>
                  </button>
                </div>

                {!isSharedView && mediaDetails.length > 0 && (
                  <Button
                    variant={selectionMode ? "secondary" : "outline"}
                    size="sm"
                    className="min-h-[38px]"
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="min-h-[38px]">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      {t("common.actions", "Actions")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
                    <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                      <Share2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      {t("share.button", "Share List")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/print-watchlist" className="flex items-center w-full">
                        <Printer className="h-4 w-4 mr-2 text-muted-foreground" />
                        {t("watchlistPage.print", "Print List")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/60" />
                    <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer">
                      <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                      {t("export.json", "Export JSON Backup")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToCSV("watchlist")} className="cursor-pointer">
                      <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                      {t("export.csvWatchlist", "Export Watchlist CSV")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToCSV("watched")} className="cursor-pointer">
                      <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                      {t("export.csvWatched", "Export Watched CSV")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/60" />
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                      {t("import.json", "Import JSON Backup")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  aria-label="Import JSON file"
                  title="Import JSON file"
                />
              </div>
            )}
          </motion.div>

          {isSharedView && (
            <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-6 py-4 text-sm text-amber-200 backdrop-blur-sm shadow-md flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {t(
                "watchlistPage.sharedHint",
                "You are viewing a shared watchlist. Sign in to add or manage your own list.",
              )}
            </div>
          )}

          {!isSharedView && showStaleNudge && staleQueueKeys.size > 0 && (() => {
            // Find the oldest stale item to show its poster
            const staleEntries = mediaDetails.filter(m => staleQueueKeys.has(`${getMediaType(m)}-${m.id}`));
            const oldestStale = staleEntries[0];
            const stalePoster = oldestStale ? getImageUrl(oldestStale.poster_path, "w92") : null;
            const staleTitle = oldestStale ? getMediaTitle(oldestStale) : null;
            return (
              <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 overflow-hidden shadow-md">
                <div className="flex items-center gap-4 px-5 py-4">
                  {stalePoster && (
                    <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-amber-500/20 shadow-sm">
                      <img src={stalePoster} alt={staleTitle || ""} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                      <p className="text-sm font-semibold text-amber-300">
                        {t("watchlistPage.staleQueueTitle", "Time to clear your queue!")}
                      </p>
                    </div>
                    <p className="text-xs text-amber-200/70 line-clamp-1">
                      {staleTitle ? `"${staleTitle}" and ` : ""}
                      {t(
                        "watchlistPage.staleQueueHint",
                        "{{count}} titles have been in your queue for 30+ days. Pick one tonight.",
                        { count: staleQueueKeys.size },
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full border-amber-500/30 px-4 text-xs text-amber-300 hover:bg-amber-500/25 hover:text-white"
                      onClick={() => {
                        const staleList = Array.from(staleQueueKeys);
                        const randomStale = staleList[Math.floor(Math.random() * staleList.length)];
                        const [mediaType, mediaId] = randomStale.split("-");
                        navigate(`/${mediaType}/${mediaId}`);
                      }}
                    >
                      {t("watchlistPage.pickForMe", "Pick For Me")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-200/70 hover:bg-amber-500/15 hover:text-amber-100"
                      onClick={() => setShowStaleNudge(false)}
                      aria-label={t("common.close", "Close")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}


          {!isSharedView && mediaDetails.length > 0 && (
            <div className="mb-6 rounded-[2rem] border border-border/50 bg-card/45 p-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    {t("watchlistPage.progressHeadline", "Queue progress")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
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
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-primary">{completionRate}%</span>
                  <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold">Completed</span>
                </div>
              </div>
              <Progress value={completionRate} className="h-2.5 bg-secondary/80 border border-border/40 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-rose-400" />
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

          {isContentLoading ? (
            isInitialLibraryLoading ? (
              <div
                className="ct-panel flex min-h-44 items-center justify-center px-6 py-10"
                role="status"
                aria-label="Loading watchlist"
                aria-busy="true"
              >
                <div className="w-full max-w-sm space-y-3">
                  <div className="h-3 w-24 rounded-full skeleton-shimmer" />
                  <div className="h-6 w-3/4 rounded-md skeleton-shimmer" />
                  <div className="h-4 w-full rounded-md skeleton-shimmer" />
                </div>
              </div>
            ) : (
              <MediaGrid items={[]} isLoading columns="normal" gap="md" />
            )
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
                      className="ct-list-row group items-start gap-4 p-4 sm:items-center sm:gap-5 sm:p-5 rounded-2xl border border-transparent hover:border-border/30 hover:bg-card/45 transition-all duration-300"
                    >
                      {selectionMode && (
                        <button
                          type="button"
                          className={`mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            selectedKeys.has(`${mediaType}-${media.id}`)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-card text-muted-foreground hover:border-primary/45"
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
                      <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted border border-border/40 shadow-sm relative group-hover:shadow-md group-hover:border-primary/20 transition-all duration-300">
                        {poster ? (
                          <Image
                            src={poster}
                            alt={title}
                            width={154}
                            height={231}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="min-w-0 flex-1 text-base font-bold transition-colors group-hover:text-primary sm:text-lg">
                            <bdi dir="auto">{title}</bdi>
                          </h3>
                          <Badge
                            variant="secondary"
                            className="uppercase text-xs tracking-wider px-2 py-0.5 bg-secondary/80 text-secondary-foreground border border-border/30 rounded-md font-semibold"
                          >
                            {mediaType === "movie" ? t("common.movie", "Movie") : t("common.tvShow", "TV Show")}
                          </Badge>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                          {year && <span>{year}</span>}
                          {media.vote_average > 0 && (
                            <Badge
                              variant="secondary"
                              className="rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-200 font-semibold"
                            >
                              ★ {media.vote_average.toFixed(1)}
                            </Badge>
                          )}
                          {media.watchStatus && (
                            <Badge variant="secondary" className="capitalize px-2 py-0.5 rounded-md text-xs border border-border/35">
                              {media.watchStatus.replace(/_/g, " ")}
                            </Badge>
                          )}
                          {staleQueueKeys.has(`${mediaType}-${media.id}`) && (
                            <Badge className="rounded-full border border-amber-500/35 bg-amber-500/15 text-amber-200">
                              {t("watchlistPage.leavingSoon", "30+ days in queue")}
                            </Badge>
                          )}
                        </div>
                        {/* Overview snippet — visible on hover (desktop) */}
                        {media.overview && (
                          <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
                            {media.overview}
                          </p>
                        )}
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
