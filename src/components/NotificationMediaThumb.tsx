import { useQuery } from "@tanstack/react-query";
import { Image } from "@/components/ui/Image";
import { getImageUrl, getMovieDetails, getTVDetails } from "@/services/tmdb";
import { parseNotificationTarget } from "@/lib/notificationLinks";

interface NotificationMediaThumbProps {
  movieId: string;
  alt: string;
  className?: string;
}

export function NotificationMediaThumb({
  movieId,
  alt,
  className,
}: NotificationMediaThumbProps) {
  const target = parseNotificationTarget(movieId);

  const { data: posterPath } = useQuery({
    queryKey: ["notification-poster", movieId],
    enabled: Boolean(target),
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!target) {
        return null;
      }

      const details =
        target.mediaType === "movie"
          ? await getMovieDetails(target.mediaId)
          : await getTVDetails(target.mediaId);

      return details.poster_path || null;
    },
  });

  if (!posterPath) {
    return (
      <span
        aria-hidden="true"
        className={
          className ||
          "inline-flex h-12 w-8 shrink-0 rounded-md border border-border/60 bg-muted/60"
        }
      />
    );
  }

  return (
    <Image
      src={getImageUrl(posterPath, "w185") || ""}
      alt={alt}
      width={92}
      height={138}
      className={
        className ||
        "h-12 w-8 shrink-0 rounded-md border border-border/60 object-cover"
      }
      loading="lazy"
      showSkeleton
    />
  );
}