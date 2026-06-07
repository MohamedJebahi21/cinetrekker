import {
  getMovieDetails,
  getTVDetails,
  type MediaDetails,
} from "@/services/tmdb";
import { createFallbackMedia } from "@/lib/mediaFallback";
import { createLogger } from "@/lib/logger";
import { mapWithConcurrency } from "@/lib/requestUtils";
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

  const settled = await mapWithConcurrency(items, 4, async (item) => {
    try {
      const value = await fetchMediaDetailsByReference(
        getReference(item),
        language,
      );
      return { status: "fulfilled" as const, value };
    } catch (reason) {
      return { status: "rejected" as const, reason };
    }
  });

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
