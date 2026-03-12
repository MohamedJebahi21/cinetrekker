import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface WatchedItem {
  media_id: number;
  media_type: "movie" | "tv";
  runtime?: number;
  genres?: string[];
}

interface Props {
  watchedItems?: WatchedItem[] | null;
  loading?: boolean;
}

function formatHoursMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

export default function StatsPanel({ watchedItems, loading = false }: Props) {
  const { t } = useTranslation();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [movieCount, setMovieCount] = useState(0);
  const [topGenre, setTopGenre] = useState<{
    genre: string;
    count: number;
  } | null>(null);
  const [genrePercent, setGenrePercent] = useState(0);

  useEffect(() => {
    if (!watchedItems || watchedItems.length === 0) {
      setTotalMinutes(0);
      setMovieCount(0);
      setTopGenre(null);
      setGenrePercent(0);
      return;
    }

    const minutes = watchedItems.reduce((s, it) => s + (it.runtime || 0), 0);
    setTotalMinutes(minutes);

    const movies = watchedItems.filter(
      (it) => it.media_type === "movie",
    ).length;
    setMovieCount(movies);

    const map = new Map<string, number>();
    watchedItems.forEach((it) => {
      (it.genres || []).forEach((g) => map.set(g, (map.get(g) || 0) + 1));
    });

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [genre, count] = sorted[0];
      setTopGenre({ genre, count });
      setGenrePercent(Math.round((count / watchedItems.length) * 100));
    } else {
      setTopGenre(null);
      setGenrePercent(0);
    }
  }, [watchedItems]);

  const formattedTime = useMemo(
    () => formatHoursMinutes(totalMinutes),
    [totalMinutes],
  );

  const topGenres = useMemo(() => {
    if (!watchedItems || watchedItems.length === 0)
      return [] as [string, number][];
    const map = new Map<string, number>();
    watchedItems.forEach((it) =>
      (it.genres || []).forEach((g: string) =>
        map.set(g, (map.get(g) || 0) + 1),
      ),
    );
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [watchedItems]);

  const horrorCount = useMemo(() => {
    if (!watchedItems) return 0;
    return watchedItems.reduce(
      (sum, it) =>
        sum +
        ((it.genres || []).some((g) => g.toLowerCase() === "horror") ? 1 : 0),
      0,
    );
  }, [watchedItems]);

  if (!loading && (!watchedItems || watchedItems.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto glass-card-hover">
          <CardHeader>
            <CardTitle>
              {t(
                "stats.startWatchingTitle",
                "Start watching movies to see your stats",
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "stats.startWatchingDescription",
                "Watch titles and your watch time, completed movies and genre breakdown will appear here.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-zinc-400">
              {t(
                "stats.tipMarkWatched",
                "Tip: mark movies as watched to populate this dashboard.",
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card-hover">
          <CardHeader className="bg-zinc-900/60 rounded-md p-3">
            <CardTitle className="text-red-600">
              {t("stats.totalWatchTime", "Total Watch Time")}
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              {formattedTime}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedTime}</div>
            <div className="text-xs text-muted-foreground">
              {t("stats.acrossAllItems", "Across all watched items")}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card-hover">
          <CardHeader className="bg-zinc-900/60 rounded-md p-3">
            <CardTitle className="text-red-600">
              {t("stats.moviesCompleted", "Movies Completed")}
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              {t("stats.countFinishedMovies", "Count of finished movies")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movieCount}</div>
            <div className="text-xs text-muted-foreground">
              {t("common.movies", "Movies")}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card-hover">
          <CardHeader className="bg-zinc-900/60 rounded-md p-3">
            <CardTitle className="text-red-600">
              {t("stats.topGenre", "Top Genre")}
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              {t("stats.mostWatchedGenre", "Most-watched genre")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topGenre ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-20 h-20 flex items-center justify-center">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 36 36"
                    className="transform rotate-[-90deg]"
                  >
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray={`${genrePercent}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex-1">
                  <div className="text-lg font-semibold">{topGenre.genre}</div>
                  <div className="text-sm text-muted-foreground">
                    {topGenre.count} {t("stats.items", "items")} |{" "}
                    {genrePercent}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                {t(
                  "stats.noGenresYet",
                  "No genres yet - watch more to generate insights.",
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {horrorCount > 5 && (
          <Card className="glass-card-hover">
            <CardHeader className="bg-zinc-900/60 rounded-md p-3">
              <CardTitle className="text-red-600">
                {t("stats.screamQueen", "Scream Queen")}
              </CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                {t(
                  "stats.watchedHorrorMovies",
                  "Watched {{count}} horror movies",
                  { count: horrorCount },
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-300">
                {t(
                  "stats.screamQueenDescription",
                  "You're a certified Scream Queen - you love horror!",
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6 glass-card p-4">
        <h3 className="text-lg font-semibold mb-4 text-red-600">
          {t("stats.genreBreakdown", "Genre Breakdown")}
        </h3>
        {watchedItems && watchedItems.length > 0 ? (
          <div className="space-y-3">
            {topGenres.slice(0, 8).map(([genre, count]) => {
              const pct = Math.round(
                (count / (watchedItems.length || 1)) * 100,
              );
              return (
                <div key={genre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{genre}</span>
                    <span className="text-sm text-zinc-400">{pct}%</span>
                  </div>
                  <progress
                    className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:bg-red-600"
                    value={count}
                    max={watchedItems.length || 1}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-zinc-400">
            {t(
              "stats.noGenresPopulate",
              "No genres yet - watch some titles to populate this chart.",
            )}
          </div>
        )}
      </div>
    </section>
  );
}
