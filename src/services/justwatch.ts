export type JWProvider = {
  provider_id: number;
  short_name?: string;
  clear_name?: string;
  icon_url?: string;
  urls?: { standard_web?: string };
};

export async function getWatchProviders(title: string, year?: number, country = 'US'): Promise<JWProvider[]> {
  try {
    // Try JustWatch public API pattern — may require a server-side proxy in production.
    // We'll attempt a best-effort fetch and return an empty array on failure.
    const query = encodeURIComponent(title);
    const url = `https://apis.justwatch.com/content/titles/${country.toLowerCase()}/popular?body=${encodeURIComponent(JSON.stringify({query: title, page_size: 1}))}`;

    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) {
      // graceful fallback
      return [];
    }

    const json = await resp.json();
    // The structure varies; attempt to extract offers/providers if present.
    const results = json.items || json.elements || json || [];

    // We'll map providers from available fields — this is best-effort.
    const providers: JWProvider[] = [];

    for (const item of results) {
      if (item.offers && Array.isArray(item.offers)) {
        for (const offer of item.offers) {
          if (offer.provider_id) {
            providers.push({
              provider_id: offer.provider_id,
              short_name: offer.provider_name || offer.provider_id?.toString(),
              clear_name: offer.monetization_type || offer.presentation_type,
              icon_url: offer.package?.icon || offer.thumbnail || undefined,
              urls: { standard_web: offer.standard_web_url || offer.url || undefined },
            });
          }
        }
      }
    }

    // Deduplicate by provider_id
    const unique = new Map<number, JWProvider>();
    for (const p of providers) {
      if (p.provider_id && !unique.has(p.provider_id)) unique.set(p.provider_id, p);
    }

    return Array.from(unique.values());
  } catch (err) {
    // console.warn('JustWatch lookup failed', err);
    return [];
  }
}
