import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { useUserLists } from "@/contexts/UserListsContext";
import { getImageUrl, getMediaTitle, getMovieDetails, getTVDetails } from "@/services/tmdb";
import type { Media } from "@/types/media";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

type WatchedMedia = Media & {
  userRating?: number;
  userNote?: string;
  userStatus?: string;
  watchedAt?: string;
};

export default function Watched() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();
  const language = i18n.language;

  const { data: mediaDetails = [], isLoading } = useQuery({
    queryKey: ["watched-details", watched.map((item) => `${item.mediaType}-${item.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watched.map(async (item) => {
          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId, language)
                : await getTVDetails(item.mediaId, language);

            return {
              ...details,
              media_type: item.mediaType,
              userRating: item.rating,
              userNote: item.note,
              userStatus: item.status,
              watchedAt: item.watchedAt,
            } as WatchedMedia;
          } catch {
            return null;
          }
        }),
      );

      return results.filter(Boolean) as WatchedMedia[];
    },
    enabled: watched.length > 0,
  });

  return (
    <>
      <SEO
        title="Watched History — CineTrekker"
        description="Movies and TV shows you've watched with ratings and notes."
        canonical="https://cinetrekker.vercel.app/watched"
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ct-kicker mb-2">{t("watchedPage.kicker", "Your History")}</p>
            <h1 className="section-title mb-0">{t("watched.title", "Watched")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("watched.count", "{{count}} titles logged", { count: mediaDetails.length })}
          </p>
        </div>

        {isLoading ? (
          <div className="ct-panel py-20 text-center text-sm text-muted-foreground">
            {t("common.loading", "Loading...")}
          </div>
        ) : mediaDetails.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mediaDetails.map((media) => {
              const title = getMediaTitle(media);
              const posterUrl = getImageUrl(media.poster_path, "w342");
              const year = (media.release_date || media.first_air_date)?.slice(0, 4);
              const status = media.userStatus ? media.userStatus.replace(/_/g, " ") : "";
              const rating = media.userRating ?? 0;

              return (
                <Link
                  key={`${media.media_type}-${media.id}`}
                  to={`/${media.media_type}/${media.id}`}
                  className="group overflow-hidden rounded-3xl border border-border/60 bg-card/60 transition hover:border-border/80 hover:bg-card/80"
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-muted/60 to-muted/20">
                          <Check className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
                        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                          {media.media_type}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {year && <span>{year}</span>}
                        {rating > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            {rating.toFixed(1)}
                          </span>
                        )}
                        {status && <span className="capitalize">{status}</span>}
                      </div>

                      {media.userNote ? (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {media.userNote}
                        </p>
                      ) : null}
                    </div>
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
              {t("watched.emptyDesc", "Mark movies and shows as watched to build your history.")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
