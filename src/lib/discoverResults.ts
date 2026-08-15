import type { Media, TMDBResponse } from "@/types/media";

export type DiscoverMediaType = "movie" | "tv";

export type DiscoverMedia = Media & {
  media_type: DiscoverMediaType;
};

export type TaggedDiscoverResponse = {
  totalPages: number;
  results: DiscoverMedia[];
};

export type PagedDiscoverMedia = {
  page: number;
  total_pages: number;
  results: Media[];
};

/**
 * Labels a single TMDB discover response with its endpoint's media type.
 * TMDB omits `media_type` from endpoint-specific discover results, while the
 * UI requires it for links, filtering, and stable deduplication.
 */
export function tagDiscoverResponse(
  response: TMDBResponse<Media>,
  mediaType: DiscoverMediaType,
): TaggedDiscoverResponse {
  return {
    totalPages: response.total_pages,
    results: response.results.map((item) => ({
      ...item,
      media_type: mediaType,
    })),
  };
}

/**
 * Combines one or more already-tagged endpoint responses into the pagination
 * shape expected by the Search infinite query. All result rows retain an
 * explicit movie or TV discriminator.
 */
export function combineDiscoverResponses(
  page: number,
  responses: readonly TaggedDiscoverResponse[],
): PagedDiscoverMedia {
  return {
    page,
    total_pages: responses.reduce(
      (maximumPages, response) => Math.max(maximumPages, response.totalPages),
      0,
    ),
    results: responses.flatMap((response) => response.results),
  };
}
