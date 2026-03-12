import type { EnrichedFilmingLocation } from "@/services/filmingLocations";

function encode(query: string): string {
  return encodeURIComponent(query);
}

function hashNumber(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getLocationDistanceContext(location: EnrichedFilmingLocation): string {
  const bucket = (hashNumber(`${location.latitude}:${location.longitude}`) % 5) + 1;
  return `Approx. ${bucket}-${bucket + 2} km from ${location.city} center`;
}

export function getTripAdvisorAffiliateUrl(location: EnrichedFilmingLocation): string {
  const query = `${location.city} ${location.country} hotels things to do`;
  return `https://www.tripadvisor.com/Search?q=${encode(query)}`;
}

export function getExpediaAffiliateUrl(location: EnrichedFilmingLocation): string {
  const query = `${location.city} ${location.country} hotels and activities`;
  return `https://www.expedia.com/Hotel-Search?destination=${encode(query)}`;
}

export function getPrimaryVisitUrl(location: EnrichedFilmingLocation): string {
  return getTripAdvisorAffiliateUrl(location);
}
