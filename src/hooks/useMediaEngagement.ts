import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { socialService } from "@/services/social";

interface MediaEngagementInput {
  id: number;
  media_type?: string;
}

/**
 * Fetches public engagement totals in one request for a collection of media cards.
 * The normalized signature keeps the React Query cache stable when parent lists rerender.
 */
export function useMediaEngagement(
  mediaItems: MediaEngagementInput[],
  fallbackMediaType: "movie" | "tv" = "movie",
) {
  const mediaSignature = mediaItems
    .map((item) => `${item.media_type || fallbackMediaType}:${item.id}`)
    .sort()
    .join("|");

  const normalizedItems = useMemo(
    () =>
      mediaSignature
        ? mediaSignature.split("|").map((entry) => {
            const [mediaType, id] = entry.split(":");
            return { id: Number(id), media_type: mediaType };
          })
        : [],
    [mediaSignature],
  );

  return useQuery({
    queryKey: ["media-engagement", mediaSignature],
    queryFn: () =>
      socialService.getMediaEngagement(
        normalizedItems.map((item) => item.id),
        normalizedItems.map((item) => item.media_type),
      ),
    enabled: normalizedItems.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export type { MediaEngagement } from "@/services/social";
