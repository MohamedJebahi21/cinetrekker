import {
  getMovieDetails,
  getTVDetails,
  type MediaDetails,
} from "@/services/tmdb";
import { createFallbackMedia } from "@/lib/mediaFallback";
import { createLogger } from "@/lib/logger";
import type { Media } from "@/types/media";

const enrichmentLogger = createLogger("media-enrichment");

export interface MediaReference {
  mediaId: number;
  mediaType: "movie" | "tv";
}

export interface EnrichMediaItemsOptions<
  TItem,
  TExtra extends Record<string, unknown>,
> {
  language?: string;
  getReference: (item: TItem) => MediaReference;
  mapExtras?: (item: TItem, details: MediaDetails | null) => TExtra;
  logScope?: string;
}

export function createMediaLookupKey(
  mediaType: "movie" | "tv",
  mediaId: number,
): string {
  return `${mediaType}-${mediaId}`;
}

export function buildMediaLookupMap<T extends Pick<Media, "id" | "media_type">>(
  items: T[] | undefined,
): Map<string, T> {
  return new Map(
    (items ?? [])
      .filter(
        (item): item is T & { media_type: "movie" | "tv" } =>
          typeof item.id === "number" &&
          (item.media_type === "movie" || item.media_type === "tv"),
      )
      .map((item) => [createMediaLookupKey(item.media_type, item.id), item]),
  );
}

export async function fetchMediaDetailsByReference(
  reference: MediaReference,
  language = "en",
): Promise<MediaDetails> {
  return reference.mediaType === "movie"
    ? getMovieDetails(reference.mediaId, language)
    : getTVDetails(reference.mediaId, language);
}

export async function enrichMediaItems<
  TItem,
  TExtra extends Record<string, unknown> = Record<string, never>,
>(
  items: TItem[],
  options: EnrichMediaItemsOptions<TItem, TExtra>,
): Promise<Array<Media & TExtra>> {
  const {
    language = "en",
    getReference,
    mapExtras,
    logScope = "media-enrichment",
  } = options;

  const settled = await Promise.allSettled(
    items.map(async (item, index) => {
      // Stagger requests to prevent proxy burst overload
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, index * 100));
      return fetchMediaDetailsByReference(getReference(item), language);
    }),
  );

  const fallbackEntries = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [];
    }

    const reference = getReference(items[index]);
    return [
      {
        mediaType: reference.mediaType,
        mediaId: reference.mediaId,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      },
    ];
  });

  if (fallbackEntries.length > 0) {
    enrichmentLogger.warn(`${logScope}: fallback`, {
      count: fallbackEntries.length,
      items: fallbackEntries.slice(0, 5),
    });
  }

  return settled.map((result, index) => {
    const item = items[index];
    const reference = getReference(item);
    const extras =
      mapExtras?.(item, result.status === "fulfilled" ? result.value : null) ??
      ({} as TExtra);

    if (result.status === "fulfilled") {
      return {
        ...result.value,
        media_type: reference.mediaType,
        ...extras,
      } as Media & TExtra;
    }

    return createFallbackMedia(reference, extras) as Media & TExtra;
  });
}
