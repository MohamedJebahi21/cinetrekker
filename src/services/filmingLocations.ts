import type { Media } from "@/types/media";
import { CURATED_FILMING_LOCATIONS } from "@/data/filmingLocationsDataset";
import { getFilmingLocation, type FilmingLocation } from "@/lib/filmingLocations";

export interface EnrichedFilmingLocation extends FilmingLocation {
  source: "curated" | "shotonwhat" | "fallback";
  trivia: string[];
}

interface FetchParams {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  media: Media;
}

const SHOT_ON_WHAT_BASE_URL = import.meta.env.VITE_SHOTONWHAT_API_BASE_URL;
const SHOT_ON_WHAT_KEY = import.meta.env.VITE_SHOTONWHAT_API_KEY;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeLocations(items: EnrichedFilmingLocation[]): EnrichedFilmingLocation[] {
  const seen = new Set<string>();
  const result: EnrichedFilmingLocation[] = [];

  items.forEach((item) => {
    const key = `${item.latitude.toFixed(3)}:${item.longitude.toFixed(3)}:${item.label.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });

  return result;
}

function fromCurated(params: FetchParams): EnrichedFilmingLocation[] {
  const normalizedTitle = normalizeTitle(params.title);
  const matched = CURATED_FILMING_LOCATIONS.find((entry) => {
    if (entry.mediaType !== params.mediaType) return false;
    if (entry.tmdbId && entry.tmdbId === params.mediaId) return true;
    return normalizeTitle(entry.title) === normalizedTitle;
  });

  if (!matched) return [];

  return matched.locations.map((location) => ({
    ...location,
    source: "curated" as const,
    trivia: location.trivia || [],
  }));
}

async function fromShotOnWhat(title: string): Promise<EnrichedFilmingLocation[]> {
  if (!SHOT_ON_WHAT_BASE_URL || !SHOT_ON_WHAT_KEY) {
    return [];
  }

  try {
    const endpoint = new URL(SHOT_ON_WHAT_BASE_URL);
    endpoint.searchParams.set("title", title);

    const response = await fetch(endpoint.toString(), {
      headers: {
        Authorization: `Bearer ${SHOT_ON_WHAT_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      locations?: Array<{
        name?: string;
        city?: string;
        country?: string;
        lat?: number;
        lng?: number;
        scene?: string;
      }>;
    };

    return (data.locations || [])
      .filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng))
      .map((location) => ({
        label: location.name || `${location.city || "Unknown"}, ${location.country || "Unknown"}`,
        city: location.city || "Unknown",
        country: location.country || "Unknown",
        latitude: Number(location.lat),
        longitude: Number(location.lng),
        scene: location.scene || "Referenced filming location",
        source: "shotonwhat" as const,
        trivia: [],
      }));
  } catch {
    return [];
  }
}

export async function getEnrichedFilmingLocations(
  params: FetchParams,
): Promise<EnrichedFilmingLocation[]> {
  const curated = fromCurated(params);
  const shotOnWhat = await fromShotOnWhat(params.title);

  const fallback: EnrichedFilmingLocation = {
    ...getFilmingLocation(params.media),
    source: "fallback",
    trivia: [
      "Local permits and access windows often determine how scenes are staged here.",
    ],
  };

  return dedupeLocations([...shotOnWhat, ...curated, fallback]).slice(0, 12);
}
