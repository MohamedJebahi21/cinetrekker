import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Star, X, CheckSquare, Bookmark, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { useWatchedFilters } from "@/hooks/useWatchedFilters";
import { useUserLists } from "@/contexts/UserListsContext";
import { getEnrichedMediaType } from "@/types/enriched-media";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";


function getSafeType(media: Parameters<typeof getEnrichedMediaType>[0]): "movie" | "tv" {
  return getEnrichedMediaType(media) === "tv" ? "tv" : "movie";
}

export default function Watched() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { removeFromWatched, addToWatchlist } = useUserLists();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const {
    ALL,
    filterLang,
    setFilterLang,
    filterType,
    setFilterType,
    filterCountry,
    setFilterCountry,
    filterYear,
    setFilterYear,
    filterOptions,
    clearFilters,
    isLoading,
    hasWatchedItems,
    filteredMedia,
    hasActiveFilters,
  } = useWatchedFilters(language);

  const languageDisplayNames =
    typeof Intl !== "undefined" && "DisplayNames" in Intl
      ? new Intl.DisplayNames([language], { type: "language" })
      : null;
  const regionDisplayNames =
    typeof Intl !== "undefined" && "DisplayNames" in Intl
      ? new Intl.DisplayNames([language], { type: "region" })
      : null;

  const getLanguageLabel = (code: string) =>
    languageDisplayNames?.of(code) || code.toUpperCase();
  const getCountryLabel = (code: string) => regionDisplayNames?.of(code) || code;

  const stats = useMemo(() => {
    const rated = filteredMedia.filter(
      (item) => typeof item.userRating === "number",
    ).length;
    const movies = filteredMedia.filter(
      (item) => getEnrichedMediaType(item) === "movie",
    ).length;
    const tv = filteredMedia.filter(
      (item) => getEnrichedMediaType(item) === "tv",
    ).length;

    return { total: filteredMedia.length, rated, movies, tv };
  }, [filteredMedia]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filteredMedia>();

    filteredMedia.forEach((item) => {
      const bucket =
        (item.release_date || item.first_air_date || "").slice(0, 4) || "Unknown";
      const current = map.get(bucket) || [];
      current.push(item);
      map.set(bucket, current);
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredMedia]);

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

  const selectAll = () => {
    const allKeys = new Set(filteredMedia.map((m) => `${getSafeType(m)}-${m.id}`));
    setSelectedKeys(allKeys);
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
    setSelectionMode(false);
  };

  const handleBulkMoveToWatchlist = async () => {
    setIsBulkOperating(true);
    try {
      const selectedItems = filteredMedia.filter((m) =>
        selectedKeys.has(`${getSafeType(m)}-${m.id}`)
      );
      await Promise.all(
        selectedItems.map(async (item) => {
          const type = getSafeType(item);
          await addToWatchlist(item.id, type);
          await removeFromWatched(item.id, type);
        })
      );
      clearSelection();
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkRemoveFromWatched = async () => {
    setIsBulkOperating(true);
    try {
      const selectedItems = filteredMedia.filter((m) =>
        selectedKeys.has(`${getSafeType(m)}-${m.id}`)
      );
      await Promise.all(
        selectedItems.map(async (item) => {
          const type = getSafeType(item);
          await removeFromWatched(item.id, type);
        })
      );
      clearSelection();
    } finally {
      setIsBulkOperating(false);
    }
  };


  return (
    <>
      <SEO
        title={t("watchedPage.seoTitle", "Watched History - CineTrekker")}
        description={t(
          "watchedPage.seoDescription",
          "Movies and TV shows you have watched with ratings and notes",
        )}
        canonical="https://cinetrekker.vercel.app/watched"
      />

      <div className="ct-page-shell min-h-screen">
        <div className="page-container pt-20 pb-24 md:pb-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="ct-kicker mb-2">
                {t("watchedPage.kicker", "Your History")}
              </p>
              <h1 className="section-title mb-0">{t("watched.title", "Watched")}</h1>
            </div>
                        <div className="flex items-center gap-2">
              {filteredMedia.length > 0 && (
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
                  className="gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  {selectionMode ? t("common.done", "Done") : t("watchedPage.bulkSelect", "Bulk Select")}
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  {t("search.clearFilters", "Clear Filters")}
                </Button>
              )}
            </div>
          </div>

          
          {/* ── Bulk Actions Floating / Fixed Bar ── */}
          {selectionMode && filteredMedia.length > 0 && (
            <div className="ct-panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-primary/20 bg-card/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">
                  {selectedKeys.size === 0
                    ? t("watchedPage.selectItemsHint", "Select titles to manage")
                    : t("watchedPage.selectedCount", "{{count}} selected", { count: selectedKeys.size })}
                </span>
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs text-primary">
                  {t("common.selectAll", "Select All")}
                </Button>
                {selectedKeys.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())} className="text-xs text-muted-foreground">
                    {t("common.deselectAll", "Deselect All")}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedKeys.size === 0 || isBulkOperating}
                  onClick={handleBulkMoveToWatchlist}
                  className="gap-2 text-xs"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {t("watchedPage.moveToWatchlist", "Move to Watchlist")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selectedKeys.size === 0 || isBulkOperating}
                  onClick={handleBulkRemoveFromWatched}
                  className="gap-2 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("watchedPage.removeFromWatched", "Remove from Watched")}
                </Button>
              </div>
            </div>
          )}

          {hasWatchedItems || hasActiveFilters ? (
            <div className="ct-panel mb-8 p-4 md:p-5">
              <div className="grid gap-4 lg:grid-cols-4">
              <div className="ct-filter-field">
                <label className="ct-filter-label">
                  {t("filters.language", "Language")}
                </label>
                <Select value={filterLang} onValueChange={setFilterLang}>
                  <SelectTrigger
                    aria-label={t("watchedPage.filterByLanguage", "Filter by language")}
                  >
                    <SelectValue
                      placeholder={t("watchedPage.allLanguages", "All Languages")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>
                      {t("watchedPage.allLanguages", "All Languages")}
                    </SelectItem>
                    {filterOptions.langs.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {getLanguageLabel(lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ct-filter-field">
                <label className="ct-filter-label">{t("filters.type", "Type")}</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger
                    aria-label={t("watchedPage.filterByType", "Filter by type")}
                  >
                    <SelectValue
                      placeholder={t("watchedPage.allTypes", "All Types")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>
                      {t("watchedPage.allTypes", "All Types")}
                    </SelectItem>
                    {filterOptions.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === "movie"
                          ? t("common.movie", "Movie")
                          : t("common.tvShow", "TV Show")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ct-filter-field">
                <label className="ct-filter-label">
                  {t("watchedPage.country", "Country")}
                </label>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger
                    aria-label={t("watchedPage.filterByCountry", "Filter by country")}
                  >
                    <SelectValue
                      placeholder={t("watchedPage.allCountries", "All Countries")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>
                      {t("watchedPage.allCountries", "All Countries")}
                    </SelectItem>
                    {filterOptions.countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {getCountryLabel(country)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ct-filter-field">
                <label className="ct-filter-label">
                  {t("watchedPage.yearRange", "Year Range")}
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={filterYear[0]}
                    onChange={(event) =>
                      setFilterYear([Number(event.target.value), filterYear[1]])
                    }
                    min={filterOptions.minYear}
                    max={filterYear[1]}
                    className="w-24"
                    aria-label={t("watchedPage.minimumYear", "Minimum year")}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    value={filterYear[1]}
                    onChange={(event) =>
                      setFilterYear([filterYear[0], Number(event.target.value)])
                    }
                    min={filterYear[0]}
                    max={filterOptions.maxYear}
                    className="w-24"
                    aria-label={t("watchedPage.maximumYear", "Maximum year")}
                  />
                </div>
              </div>
              </div>
            </div>
          ) : null}

          {!isLoading && filteredMedia.length > 0 ? (
            <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: t("watched.title", "Watched"), value: stats.total },
                { label: t("actions.rateTitle", "Rated"), value: stats.rated },
                { label: t("common.movie", "Movies"), value: stats.movies },
                { label: t("common.tvShow", "TV Shows"), value: stats.tv },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/60 bg-card/70 px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {isLoading ? (
            hasWatchedItems ? (
              <div className="media-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[2/3] rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div
                className="ct-panel flex min-h-44 items-center justify-center px-6 py-10"
                role="status"
                aria-label="Loading watched history"
                aria-busy="true"
              >
                <div className="w-full max-w-sm space-y-3">
                  <div className="h-3 w-24 rounded-full skeleton-shimmer" />
                  <div className="h-6 w-3/4 rounded-md skeleton-shimmer" />
                  <div className="h-4 w-full rounded-md skeleton-shimmer" />
                </div>
              </div>
            )
          ) : filteredMedia.length > 0 ? (
            <div className="space-y-8">
              {groups.map(([yearBucket, items]) => (
                <section key={yearBucket} className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="ct-kicker mb-1">
                        {t("watchedPage.yearBucket", "Year Bucket")}
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {yearBucket}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("watchedPage.titlesCount", "{{count}} titles", {
                        count: items.length,
                      })}
                    </p>
                  </div>

                  <div className="media-grid">
                    {items.map((media) => {
                      const title = getMediaTitle(media);
                      const posterUrl = getImageUrl(media.poster_path, "w342");
                      const year = (
                        media.release_date || media.first_air_date
                      )?.slice(0, 4);

                      const mType = getSafeType(media);
                      const isSelected = selectedKeys.has(`${mType}-${media.id}`);

                      return (
                        <div
                          key={`${mType}-${media.id}`}
                          onClick={() => {
                            if (selectionMode) {
                              toggleSelect(media.id, mType);
                            }
                          }}
                          className={cn(
                            "group relative block overflow-hidden rounded-2xl transition-all duration-300",
                            selectionMode ? "cursor-pointer" : "hover:-translate-y-1",
                            isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                        >
                          {selectionMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(media.id, mType);
                              }}
                              className={cn(
                                "absolute top-3 left-3 z-30 flex h-6 w-6 items-center justify-center rounded-md border shadow-md transition-colors",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-white/40 bg-black/60 text-transparent hover:border-white"
                              )}
                              aria-label={isSelected ? t("common.deselect", "Deselect") : t("common.select", "Select")}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            to={selectionMode ? "#" : `/${mType}/${media.id}`}
                            onClick={(e) => {
                              if (selectionMode) {
                                e.preventDefault();
                              }
                            }}
                            className="block"
                          >
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              srcSet={`${getImageUrl(media.poster_path, "w185")} 185w, ${getImageUrl(media.poster_path, "w342")} 342w, ${getImageUrl(media.poster_path, "w500")} 500w`}
                              sizes="(max-width: 639px) calc(50vw - 16px), (max-width: 1023px) calc(33vw - 24px), 220px"
                              alt={title}
                              width={342}
                              height={513}
                              className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              showSkeleton
                            />
                          ) : (
                            <div className="flex aspect-[2/3] items-center justify-center rounded-2xl bg-muted">
                              <Star className="h-12 w-12 text-muted-foreground/50" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
                            <h3 className="mb-1 line-clamp-2 text-base font-semibold">
                              <bdi dir="auto">{title}</bdi>
                            </h3>
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/78">
                              <Badge
                                variant="secondary"
                                className="border-0 bg-white/10 text-white"
                              >
                                {getEnrichedMediaType(media) === "movie"
                                  ? t("common.movie", "Movie")
                                  : t("common.tvShow", "TV Show")}
                              </Badge>
                              {year ? <span>{year}</span> : null}
                              {typeof media.userRating === "number" ? (
                                <Badge className="border-amber-500/20 bg-amber-500/15 text-amber-200">
                                  ★ {media.userRating}/10
                                </Badge>
                              ) : null}
                            </div>

                            {media.userStatus ? (
                              <div
                                className={cn(
                                  "text-sm font-medium capitalize",
                                  media.userStatus === "completed"
                                    ? "text-emerald-300"
                                    : "text-white/85",
                                )}
                              >
                                {media.userStatus.replace(/_/g, " ")}
                              </div>
                            ) : null}
                          </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="ct-panel py-20 text-center">
              <Check className="mx-auto mb-6 h-20 w-20 text-muted-foreground/30" />
              <h2 className="mb-3 text-2xl font-semibold">
                {t("watched.empty", "Nothing here yet")}
              </h2>
              <p className="mx-auto max-w-md text-muted-foreground">
                {t(
                  "watched.emptyDesc",
                  "Mark movies and shows as watched to build your history.",
                )}
              </p>
              <Button asChild className="mt-6 min-h-11 rounded-xl px-5 font-semibold">
                <Link to="/discover">
                  {t("watched.discoverTitles", "Discover titles")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
