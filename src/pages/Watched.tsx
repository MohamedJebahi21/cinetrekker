import { useTranslation } from "react-i18next";
import { Check, Star, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { useWatchedFilters } from "@/hooks/useWatchedFilters";
import { getEnrichedMediaType } from "@/types/enriched-media";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Watched() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
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
    filteredMedia,
    hasActiveFilters,
  } = useWatchedFilters(language);

  return (
    <>
      <SEO
        title="Watched History - CineTrekker"
        description="Movies and TV shows you've watched with ratings and notes"
        canonical="https://cinetrekker.vercel.app/watched"
      />

      <div className="ct-page-shell min-h-screen">
        <div className="page-container pt-20 pb-24 md:pb-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="ct-kicker mb-2">Watched Archive</p>
              <h1 className="section-title mb-0">{t("watched.title")}</h1>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="ct-panel mb-8 p-4 md:p-5">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="ct-filter-field">
                <label className="ct-filter-label">Language</label>
                <Select value={filterLang} onValueChange={setFilterLang}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Languages</SelectItem>
                    {filterOptions.langs.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ct-filter-field">
                <label className="ct-filter-label">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Types</SelectItem>
                    {filterOptions.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === "movie" ? "Movie" : "TV Series"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ct-filter-field">
                <label className="ct-filter-label">Country</label>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Countries</SelectItem>
                    {filterOptions.countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ct-filter-field">
                <label className="ct-filter-label">Year Range</label>
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
                  />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="media-grid">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[2/3] rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filteredMedia.length > 0 ? (
            <div className="media-grid">
              {filteredMedia.map((media) => {
                const title = getMediaTitle(media);
                const posterUrl = getImageUrl(media.poster_path, "w342");
                const year = (
                  media.release_date || media.first_air_date
                )?.slice(0, 4);

                return (
                  <Link
                    key={`${getEnrichedMediaType(media)}-${media.id}`}
                    to={`/${getEnrichedMediaType(media)}/${media.id}`}
                    className="group relative block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
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
                        {title}
                      </h3>
                      <div className="mb-3 flex items-center gap-2 text-xs">
                        <Badge
                          variant="secondary"
                          className="border-0 bg-white/10 text-white"
                        >
                          {getEnrichedMediaType(media) === "movie"
                            ? t("common.movie")
                            : t("common.tvShow")}
                        </Badge>
                        {year && <span className="text-white/80">{year}</span>}
                      </div>

                      {media.userRating && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-sm font-semibold",
                            media.userRating >= 8
                              ? "text-emerald-400"
                              : media.userRating >= 6
                                ? "text-yellow-400"
                                : "text-orange-400",
                          )}
                        >
                          <Star className="h-4 w-4 fill-current" />
                          {media.userRating}/10
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
