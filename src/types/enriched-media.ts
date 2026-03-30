import type { Media } from "@/types/media";

export type ProductionCountry =
  | string
  | {
      iso_3166_1?: string;
      iso31661?: string;
      name?: string;
    };

export type EnrichedMediaExtras = {
  userRating?: number;
  userNote?: string;
  userStatus?: string;
  watchedAt?: string;
  addedAt?: string;
  originalLanguage?: string;
  mediaType?: "movie" | "tv";
  originCountry?: string;
  releaseDate?: string;
  firstAirDate?: string;
  number_of_episodes?: number;
  production_countries?: ProductionCountry[];
};

export type EnrichedUserMedia = Media & EnrichedMediaExtras;

export function getEnrichedMediaType(media: EnrichedUserMedia): "movie" | "tv" | undefined {
  return media.media_type ?? media.mediaType;
}

export function getEnrichedMediaLanguage(media: EnrichedUserMedia): string | undefined {
  return media.original_language ?? media.originalLanguage;
}

export function getEnrichedMediaDate(media: EnrichedUserMedia): string {
  return (
    media.watchedAt ??
    media.addedAt ??
    media.release_date ??
    media.first_air_date ??
    media.releaseDate ??
    media.firstAirDate ??
    ""
  );
}

export function getEnrichedMediaYear(media: EnrichedUserMedia): number | null {
  const rawDate = getEnrichedMediaDate(media);
  const year = Number.parseInt(rawDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

export function getEnrichedMediaCountries(media: EnrichedUserMedia): string[] {
  const countries = new Set<string>();

  const origin = media.origin_country ?? media.originCountry;
  if (typeof origin === "string" && origin.trim()) {
    countries.add(origin);
  }

  if (Array.isArray(origin)) {
    origin
      .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
      .forEach((entry) => countries.add(entry));
  }

  if (Array.isArray(media.production_countries)) {
    media.production_countries.forEach((country) => {
      if (typeof country === "string") {
        if (country.trim()) countries.add(country);
        return;
      }

      if (country.iso_3166_1) countries.add(country.iso_3166_1);
      else if (country.iso31661) countries.add(country.iso31661);
    });
  }

  return Array.from(countries);
}
