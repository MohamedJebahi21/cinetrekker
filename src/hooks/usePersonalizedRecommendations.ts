import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { getSimilar } from "@/services/tmdb";
import { Media } from "@/types/media";

export function usePersonalizedRecommendations(language: string) {
  const { watchlist } = useUserLists();
  return useQuery({
    queryKey: ["personalized-recommendations", watchlist, language],
    queryFn: async () => {
      const recs: Media[] = [];
      for (const item of watchlist.slice(0, 5)) {
        try {
          const similar = await getSimilar(item.mediaType, item.mediaId, language);
          recs.push(...(similar.results || []));
        } catch {
          // TODO: surface recommendation fetch errors via telemetry if needed
        }
      }
      // Deduplicate by id
      return recs.filter((v, i, arr) => arr.findIndex(x => x.id === v.id && x.media_type === v.media_type) === i);
    },
    enabled: watchlist.length > 0,
  });
}
