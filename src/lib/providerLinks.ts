// Helper to map TMDB provider IDs to provider-specific search/watch URLs
export function getProviderWatchUrl(providerId?: number, title?: string, tmdbId?: number): string | null {
  if (!providerId) return null;

  // Encode title for search queries when available
  const q = title ? encodeURIComponent(title) : '';

  const mappings: Record<number, (q: string, tmdbId?: number) => string> = {
    // Netflix (TMDB: 8 and legacy 1)
    8: (q) => `https://www.netflix.com/search?q=${q}`,
    1: (q) => `https://www.netflix.com/search?q=${q}`,
    // Disney+
    337: (q) => `https://www.disneyplus.com/search/${q}`,
    // Apple TV+
    350: (q) => `https://tv.apple.com/search/${q}`,
  };

  const mapper = mappings[providerId];
  if (mapper && q) return mapper(q, tmdbId);

  // If we don't have a direct mapping or no title, return null so callers can fallback
  return null;
}
