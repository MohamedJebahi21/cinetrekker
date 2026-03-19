import type { Media, UserMediaItem } from "@/types/media";

type FallbackExtras = Record<string, unknown>;

export function createFallbackMedia(
  item: Pick<UserMediaItem, "mediaId" | "mediaType">,
  extras: FallbackExtras = {},
): Media & FallbackExtras {
  const fallbackTitle =
    item.mediaType === "movie"
      ? `Movie #${item.mediaId}`
      : `TV Show #${item.mediaId}`;

  return {
    id: item.mediaId,
    media_type: item.mediaType,
    title: item.mediaType === "movie" ? fallbackTitle : undefined,
    name: item.mediaType === "tv" ? fallbackTitle : undefined,
    overview: "",
    poster_path: null,
    backdrop_path: null,
    vote_average: 0,
    vote_count: 0,
    popularity: 0,
    genre_ids: [],
    genres: [],
    adult: false,
    ...extras,
  };
}
