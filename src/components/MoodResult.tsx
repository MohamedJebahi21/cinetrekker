import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getBackdropUrl, getMediaTitle } from "@/services/tmdb";
import { useUserLists } from "@/contexts/UserListsContext";
import { HeroSkeleton, MovieCardSkeleton } from "@/components/skeletons";
import {
  fetchMoodMatch,
  type MoodId,
  type TimeSlot,
} from "@/components/mood-result.utils";
import type { Media } from "@/types/media";
import { cn } from "../lib/utils";
import { Image } from "@/components/ui/Image";

type Props = {
  mood: MoodId;
  time?: TimeSlot;
  onTryAnother?: () => void;
  className?: string;
};

export default function MoodResult({
  mood,
  time,
  onTryAnother,
  className = "",
}: Props) {
  const { i18n, t } = useTranslation();
  const language = i18n.language;
  const { addToWatchlist } = useUserLists();

  const {
    data: match,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Media | null>({
    queryKey: ["mood-match", mood, time, language],
    queryFn: () => fetchMoodMatch(mood, time, language),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const handleAdd = async () => {
    if (!match) return;
    const mediaType = match.media_type === "tv" ? "tv" : "movie";
    try {
      addToWatchlist?.(match.id, mediaType);
    } catch {
      // ignore
    }
  };

  const handleTryAnother = async () => {
    await refetch();
    onTryAnother?.();
  };

  if (isLoading) {
    return (
      <div className={cn("w-full space-y-6", className)}>
        <HeroSkeleton />
        <div className="page-container">
          <div className="max-w-3xl mx-auto">
            <MovieCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className={cn("page-container py-12 text-center", className)}>
        <p className="text-lg font-semibold">
          {t("mood.noMatch", "No matches available")}
        </p>
        <p className="text-muted-foreground mt-2">
          {t("mood.tryDifferent", "Try a different mood or time")}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={handleTryAnother} variant="outline">
            {t("mood.tryAnother", "Try Another")}
          </Button>
        </div>
      </div>
    );
  }

  const backdrop = getBackdropUrl(match.backdrop_path);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative w-full h-56 md:h-96 rounded-xl overflow-hidden bg-black/40"
        aria-live="polite"
      >
        {backdrop ? (
          <Image
            src={backdrop}
            alt={getMediaTitle(match)}
            width={1280}
            height={720}
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 md:left-16 md:right-auto md:max-w-3xl">
          <h2 className="text-2xl md:text-4xl font-bold">
            {getMediaTitle(match)}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2 py-1 rounded bg-black/60 text-sm">
              {match.vote_average?.toFixed(1) ?? t("common.unknown")}
            </span>
            {match.release_date && (
              <span className="text-sm text-muted-foreground">
                {new Date(match.release_date).getFullYear()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="page-container mt-6 max-w-3xl">
        <p className="text-base text-muted-foreground leading-relaxed">
          {match.overview}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handleAdd} className="gap-2">
            Watchlist
          </Button>
          <Button
            onClick={handleTryAnother}
            variant="outline"
            disabled={isFetching}
          >
            {isFetching
              ? t("common.loading")
              : t("mood.tryAnother", "Try Another")}
          </Button>
        </div>
      </div>
    </div>
  );
}
