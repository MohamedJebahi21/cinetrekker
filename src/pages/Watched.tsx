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

export default function Watched() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();
  const language = i18n.language;

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

  return (
    <>
      <SEO
        title="Watched History — CineTrekker"
        description="Movies and TV shows you've watched with ratings and notes"
        canonical="https://cinetrekker.vercel.app/watched"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">{t("watched.title")}</h1>

        {isLoading ? (
          <div className="media-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : mediaDetails && mediaDetails.length > 0 ? (
          <div className="media-grid">
            {mediaDetails.map((media: MediaDetails & {
              userRating?: number;
              userNote?: string;
              userStatus?: string;
              watchedAt?: string;
            }) => {
              const title = getMediaTitle(media);
              const posterUrl = getImageUrl(media.poster_path, "w342");
              const year = (media.release_date || media.first_air_date)?.slice(
                0,
                4,
              );

              return (
                <Link
                  key={`${media.id}-${media.media_type}`}
                  to={`/${media.media_type}/${media.id}`}
                  className="group relative block overflow-hidden rounded-lg transition-all duration-300"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={title}
                      className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
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
            <h2 className="text-xl font-semibold mb-2">{t("watched.empty")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("watched.emptyDesc")}
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
