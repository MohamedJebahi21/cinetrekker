import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Film, History, Star, Tv } from "lucide-react";
import { useUserLists } from "@/contexts/UserListsContext";
import { UserMediaItem } from "@/types/media";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image } from "@/components/ui/Image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFallbackMedia } from "@/lib/mediaFallback";
import {
  buildMediaLookupMap,
  createMediaLookupKey,
  enrichMediaItems,
} from "@/lib/mediaEnrichment";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";

export default function WatchHistory() {
  const { watched } = useUserLists();
  const watchedMovies = watched.filter((item) => item.mediaType === "movie");
  const watchedTV = watched.filter((item) => item.mediaType === "tv");
  const [filter, setFilter] = useState<"all" | "movies" | "tv">("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alpha">("recent");

  const allWatched = [
    ...watchedMovies.map((item) => ({ ...item, mediaType: "movie" as const })),
    ...watchedTV.map((item) => ({ ...item, mediaType: "tv" as const })),
  ];

  let filtered = allWatched;
  if (filter !== "all") {
    filtered = filtered.filter(
      (item) => item.mediaType === (filter === "movies" ? "movie" : "tv"),
    );
  }

  const { data: details } = useQuery({
    queryKey: ["watch-history", filtered.map((i) => `${i.mediaType}-${i.mediaId}`)],
    queryFn: () =>
      enrichMediaItems(filtered.slice(0, 50), {
        getReference: (item) => item,
        logScope: "watch-history",
      }),
    enabled: filtered.length > 0,
  });
  const detailMap = buildMediaLookupMap(details);

  const sortedItems = [...filtered].sort((a, b) => {
    const aDateStr = a.watchedAt || a.addedAt;
    const bDateStr = b.watchedAt || b.addedAt;
    const aDate = new Date(aDateStr).getTime();
    const bDate = new Date(bDateStr).getTime();

    if (sortBy === "recent") return bDate - aDate;
    if (sortBy === "oldest") return aDate - bDate;

    const aMedia =
      detailMap.get(createMediaLookupKey(a.mediaType, a.mediaId)) ||
      createFallbackMedia(a);
    const bMedia =
      detailMap.get(createMediaLookupKey(b.mediaType, b.mediaId)) ||
      createFallbackMedia(b);

    return getMediaTitle(aMedia)
      .toLocaleLowerCase()
      .localeCompare(getMediaTitle(bMedia).toLocaleLowerCase());
  });

  const groupByMonth = (items: UserMediaItem[]) => {
    const groups: Record<string, UserMediaItem[]> = {};

    items.forEach((item) => {
      const watchedDateStr = item.watchedAt || item.addedAt;
      if (!watchedDateStr) {
        if (!groups.Unknown) groups.Unknown = [];
        groups.Unknown.push(item);
        return;
      }

      const date = new Date(watchedDateStr);
      const monthKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });

    return groups;
  };

  const timelineGroups = groupByMonth(sortedItems);
  const months = Object.keys(timelineGroups).filter((key) => key !== "Unknown");

  return (
    <>
      <SEO
        title="Watch History Timeline"
        description="Visual timeline of your watching journey"
        canonical="https://cinetrekker.vercel.app/watch-history"
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Watch History</h1>
              <p className="mt-1 text-muted-foreground">
                {sortedItems.length} items in your timeline
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as "all" | "movies" | "tv")}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="movies">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy(v as "recent" | "oldest" | "alpha")
              }
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="alpha">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <Card className="p-12 text-center">
            <History className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">
              No watch history yet. Start watching to build your timeline!
            </p>
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute bottom-0 left-8 top-0 w-0.5 bg-border" />

            <div className="space-y-8">
              {months.map((month) => (
                <div key={month} className="relative">
                  <div className="sticky top-20 z-10 mb-4 flex items-center gap-4 bg-background/95 py-2 backdrop-blur-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
                      <span className="font-bold text-primary-foreground">
                        {new Date(month).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{month}</h2>
                    <Badge variant="secondary">
                      {timelineGroups[month].length} items
                    </Badge>
                  </div>

                  <div className="ml-24 space-y-4">
                    {timelineGroups[month].map((item, idx) => {
                      const detail =
                        detailMap.get(
                          createMediaLookupKey(item.mediaType, item.mediaId),
                        ) || createFallbackMedia(item);
                      const watchedDateStr = item.watchedAt || item.addedAt;
                      const title = (detail?.title || detail?.name) as
                        | string
                        | undefined;
                      const vote = detail?.vote_average as number | undefined;

                      return (
                        <Card
                          key={`${item.mediaId}-${idx}`}
                          className="p-4 transition-shadow hover:shadow-lg"
                        >
                          <div className="flex gap-4">
                            {detail?.poster_path ? (
                              <Image
                                src={getImageUrl(detail.poster_path, "w92")}
                                srcSet={`${getImageUrl(detail.poster_path, "w92")} 92w, ${getImageUrl(detail.poster_path, "w185")} 185w`}
                                sizes="64px"
                                alt={`${title || "Title"} poster`}
                                width={92}
                                height={138}
                                className="h-24 w-16 rounded object-cover"
                                loading="lazy"
                                showSkeleton
                              />
                            ) : null}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="text-lg font-semibold">
                                    {title || "Loading..."}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      {item.mediaType === "movie" ? (
                                        <Film className="h-3.5 w-3.5" />
                                      ) : (
                                        <Tv className="h-3.5 w-3.5" />
                                      )}
                                      {item.mediaType === "movie" ? "Movie" : "TV Show"}
                                    </span>
                                    {detail && vote ? (
                                      <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1">
                                          <Star className="h-3.5 w-3.5 fill-current" />
                                          {vote.toFixed(1)}
                                        </span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                                {watchedDateStr ? (
                                  <Badge variant="outline">
                                    {new Date(watchedDateStr).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </Badge>
                                ) : null}
                              </div>
                              {detail?.overview ? (
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                  {detail.overview}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}

              {timelineGroups.Unknown && timelineGroups.Unknown.length > 0 ? (
                <div className="relative">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <span className="font-bold text-muted-foreground">?</span>
                    </div>
                    <h2 className="text-2xl font-bold">Date Unknown</h2>
                    <Badge variant="secondary">
                      {timelineGroups.Unknown.length} items
                    </Badge>
                  </div>

                  <div className="ml-24 space-y-4">
                    {timelineGroups.Unknown.map((item, idx) => {
                      const detail =
                        detailMap.get(
                          createMediaLookupKey(item.mediaType, item.mediaId),
                        ) || createFallbackMedia(item);
                      const title = (detail?.title || detail?.name) as
                        | string
                        | undefined;

                      return (
                        <Card key={`${item.mediaId}-${idx}`} className="p-4">
                          <div className="flex gap-4">
                            {detail?.poster_path ? (
                              <Image
                                src={getImageUrl(detail.poster_path, "w92")}
                                srcSet={`${getImageUrl(detail.poster_path, "w92")} 92w, ${getImageUrl(detail.poster_path, "w185")} 185w`}
                                sizes="64px"
                                alt={`${title || "Title"} poster`}
                                width={92}
                                height={138}
                                className="h-24 w-16 rounded object-cover"
                                loading="lazy"
                                showSkeleton
                              />
                            ) : null}
                            <div>
                              <h3 className="font-semibold">
                                {title || "Loading..."}
                              </h3>
                              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                {item.mediaType === "movie" ? (
                                  <Film className="h-3.5 w-3.5" />
                                ) : (
                                  <Tv className="h-3.5 w-3.5" />
                                )}
                                {item.mediaType === "movie" ? "Movie" : "TV Show"}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
