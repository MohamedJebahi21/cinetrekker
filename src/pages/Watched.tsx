import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Check, Star } from "lucide-react";
import { useUserLists } from "@/contexts/UserListsContext";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import type { Media, MediaDetails } from "@/types/media";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";
import { enrichMediaItems } from "@/lib/mediaEnrichment";
import { Image } from "@/components/ui/Image";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export default function Watched() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();
  const language = i18n.language;

  // --- Filter State ---
  const [filterLang, setFilterLang] = React.useState<string>("");
  const [filterType, setFilterType] = React.useState<string>("");
  const [filterCountry, setFilterCountry] = React.useState<string>("");
  const [filterYear, setFilterYear] = React.useState<[number, number]>([1900, new Date().getFullYear()]);

  // --- Build filter options from watched list ---
  const allLangs = React.useMemo(() => Array.from(new Set(watched.map(w => w.original_language).filter((v) => typeof v === "string" && v.trim() !== ""))), [watched]);
  const allTypes = React.useMemo(() => Array.from(new Set(watched.map(w => w.media_type).filter((v) => typeof v === "string" && v.trim() !== ""))), [watched]);
  const allCountries = React.useMemo(() => Array.from(new Set((watched.flatMap(w => (w.origin_country || (w.production_countries ? w.production_countries.map(c => c.iso_3166_1) : []))) ).filter((v) => typeof v === "string" && v.trim() !== ""))), [watched]);
  const minYear = React.useMemo(() => Math.min(...watched.map(w => parseInt((w.release_date || w.first_air_date || "").slice(0,4)).toString()).filter(y => !isNaN(y))), [watched]);
  const maxYear = React.useMemo(() => Math.max(...watched.map(w => parseInt((w.release_date || w.first_air_date || "").slice(0,4)).toString()).filter(y => !isNaN(y))), [watched]);
  React.useEffect(() => {
    if (Number.isFinite(minYear) && Number.isFinite(maxYear)) {
      setFilterYear([minYear, maxYear]);
    } else {
      setFilterYear([1900, new Date().getFullYear()]);
    }
  }, [minYear, maxYear]);


  // Fetch details for all watched items
  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: [
      "watched-details",
      watched.map((i) => `${i.mediaType}-${i.mediaId}`),
      language,
    ],
    queryFn: async () => {
      return enrichMediaItems(watched, {
        language,
        getReference: (item) => item,
        mapExtras: (item) => ({
          userRating: item.rating,
          userNote: item.note,
          userStatus: item.status,
          watchedAt: item.watchedAt,
        }),
        logScope: "watched",
      }) as Promise<
        (Media & {
          userRating?: number;
          userNote?: string;
          userStatus?: string;
          watchedAt?: string;
        })[]
      >;
    },
    enabled: watched.length > 0,
  });

  // --- Filtered list ---
  const filteredMedia = React.useMemo(() => {
    return (mediaDetails || []).filter(media => {
      const year = parseInt((media.release_date || media.first_air_date || "").slice(0,4));
      return (
        (!filterLang || media.original_language === filterLang) &&
        (!filterType || media.media_type === filterType) &&
        (!filterCountry || (media.origin_country?.includes(filterCountry) || (media.production_countries?.some(c => c.iso_3166_1 === filterCountry))) ) &&
        (!filterYear || (year >= filterYear[0] && year <= filterYear[1]))
      );
    });
  }, [mediaDetails, filterLang, filterType, filterCountry, filterYear]);

  return (
    <>
      <SEO
        title="Watched History — CineTrekker"
        description="Movies and TV shows you've watched with ratings and notes"
        canonical="https://cinetrekker.vercel.app/watched"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">{t("watched.title")}</h1>

        {/* --- Filter Bar --- */}
        <div className="flex flex-wrap gap-4 mb-8 items-end">
          {/* Language Filter */}
          <div className="w-40">
            <label className="block text-xs font-semibold mb-1">Language</label>
            <Select value={filterLang} onValueChange={setFilterLang}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {allLangs.map((lang) => (
                  <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Type Filter */}
          <div className="w-40">
            <label className="block text-xs font-semibold mb-1">Type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {allTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type === "movie" ? "Movie" : type === "tv" ? "Series" : type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Country Filter */}
          <div className="w-40">
            <label className="block text-xs font-semibold mb-1">Country</label>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {allCountries.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Year Filter */}
          <div className="flex flex-col w-56">
            <label className="block text-xs font-semibold mb-1">Year Range</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={Number.isFinite(minYear) ? minYear : 1900}
                max={Number.isFinite(filterYear[1]) ? filterYear[1] : new Date().getFullYear()}
                value={Number.isFinite(filterYear[0]) ? filterYear[0] : (Number.isFinite(minYear) ? minYear : 1900)}
                onChange={e => setFilterYear([Number(e.target.value), filterYear[1]])}
                className="w-20"
              />
              <span>-</span>
              <Input
                type="number"
                min={Number.isFinite(filterYear[0]) ? filterYear[0] : (Number.isFinite(minYear) ? minYear : 1900)}
                max={Number.isFinite(maxYear) ? maxYear : new Date().getFullYear()}
                value={Number.isFinite(filterYear[1]) ? filterYear[1] : (Number.isFinite(maxYear) ? maxYear : new Date().getFullYear())}
                onChange={e => setFilterYear([filterYear[0], Number(e.target.value)])}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="media-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredMedia && filteredMedia.length > 0 ? (
          <div className="media-grid">
            {filteredMedia.map((media: MediaDetails & {
              userRating?: number;
              userNote?: string;
              userStatus?: string;
              watchedAt?: string;
            }) => {
              const title = getMediaTitle(media);
              const posterUrl = getImageUrl(media.poster_path, "w342");
              const year = (media.release_date || media.first_air_date)?.slice(0, 4);

              return (
                <Link
                  key={`${media.id}-${media.media_type}`}
                  to={`/${media.media_type}/${media.id}`}
                  className="group relative block overflow-hidden rounded-lg transition-all duration-300"
                >
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      srcSet={`${getImageUrl(media.poster_path, "w185")} 185w, ${getImageUrl(media.poster_path, "w342")} 342w, ${getImageUrl(media.poster_path, "w500")} 500w`}
                      sizes="(max-width: 639px) calc(50vw - 16px), (max-width: 1023px) calc(33vw - 24px), 220px"
                      alt={`${title} poster`}
                      width={342}
                      height={513}
                      className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                      showSkeleton
                    />
                  ) : (
                    <div className="w-full bg-muted aspect-[2/3] flex items-center justify-center">
                      <Star className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2 text-xs">
                        <Badge
                          variant="outline"
                          className="text-xs bg-black/50 border-white/20"
                        >
                          {media.media_type === "movie"
                            ? t("common.movie")
                            : t("common.tvShow")}
                        </Badge>
                        {year && <span className="text-gray-300">{year}</span>}
                      </div>

                      {media.userRating && (
                        <div
                          className={cn(
                            "text-sm font-semibold mb-2 flex items-center gap-1",
                            (media.userRating || 0) >= 7
                              ? "text-green-400"
                              : (media.userRating || 0) >= 5
                                ? "text-yellow-400"
                                : "text-red-400",
                          )}
                        >
                          <Star className="w-3 h-3 fill-current" />
                          {media.userRating}/10
                        </div>
                      )}

                      {media.userStatus && (
                        <Badge className="bg-primary/80 text-white text-xs capitalize">
                          {t(`status.${media.userStatus}`)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Check className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t("watched.empty", "Nothing here yet")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "watched.emptyDesc",
                "Mark movies as watched to build your history.",
              )}
            </p>
            <Link
              to="/search"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Find something to watch
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
