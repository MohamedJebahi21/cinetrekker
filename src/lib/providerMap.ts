// Maps common provider names or TMDB provider IDs to direct provider URLs
// This is a best-effort mapping; entries can be expanded as needed.
const providerNameMap: Record<string, string> = {
  netflix: 'https://www.netflix.com',
  'netflix streaming': 'https://www.netflix.com',
  'apple tv+': 'https://tv.apple.com',
  appletv: 'https://tv.apple.com',
  'apple tv': 'https://tv.apple.com',
  'amazon prime video': 'https://www.primevideo.com',
  primevideo: 'https://www.primevideo.com',
  hulu: 'https://www.hulu.com',
  'disney plus': 'https://www.disneyplus.com',
  disneyplus: 'https://www.disneyplus.com',
  peacock: 'https://www.peacocktv.com',
  'hbomax': 'https://www.hbomax.com',
  'hbo max': 'https://www.hbomax.com',
  'paramount+': 'https://www.paramountplus.com',
  paramount: 'https://www.paramountplus.com',
  'youtube': 'https://www.youtube.com',
  'vudu': 'https://www.vudu.com',
  'microsoft': 'https://www.microsoft.com',
};

export function getProviderUrlFromData(p: Provider, providerData?: ProviderDataResult): string | null {
  // Prefer explicit URLs present in the provider record
  const explicit = p?.url || p?.provider_url || p?.urls?.standard_web || p?.urls?.web || null;
  if (explicit) return explicit;

  // Try mapping by provider name
  const name = (p?.provider_name || p?.short_name || '').toString().toLowerCase().trim();
  if (name && providerNameMap[name]) return providerNameMap[name];

  // Try normalized variants
  const normalized = name.replace(/[+\s.]/g, '').replace(/\s+/g, '');
  if (normalized && providerNameMap[normalized]) return providerNameMap[normalized];

  // As a last resort, fall back to the TMDB provided link for the media
  if (providerData && providerData.link) return providerData.link;

  return null;
}
