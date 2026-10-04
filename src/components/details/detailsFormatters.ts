export function getPolicyRatingTag(mediaType: "movie" | "tv", details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  if (mediaType === "movie") {
    const releaseDates = (details as { release_dates?: { results?: Array<{ iso_3166_1?: string; release_dates?: Array<{ certification?: string }> }> } }).release_dates?.results;
    if (!Array.isArray(releaseDates)) return undefined;
    const ordered = [...releaseDates.filter(e => e?.iso_3166_1 === "US"), ...releaseDates.filter(e => e?.iso_3166_1 !== "US")];
    for (const entry of ordered) {
      const found = (entry?.release_dates || []).map(i => i?.certification?.trim()).find(Boolean);
      if (found) return found;
    }
    return undefined;
  }
  const contentRatings = (details as { content_ratings?: { results?: Array<{ iso_3166_1?: string; rating?: string }> } }).content_ratings?.results;
  if (!Array.isArray(contentRatings)) return undefined;
  return [...contentRatings.filter(e => e?.iso_3166_1 === "US"), ...contentRatings.filter(e => e?.iso_3166_1 !== "US")]
    .map(e => e?.rating?.trim()).find(Boolean);
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${amount.toLocaleString()}`;
}

export function getStatusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case "returning series": return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" };
    case "in production":   return { cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",   dot: "bg-blue-400" };
    case "ended":           return { cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",   dot: "bg-slate-400" };
    case "cancelled":       return { cls: "bg-red-500/15 text-red-400 border-red-500/30",     dot: "bg-red-400" };
    case "released":        return { cls: "bg-violet-500/15 text-violet-400 border-violet-500/30", dot: "bg-violet-400" };
    case "post production": return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   dot: "bg-amber-400" };
    default:                return { cls: "bg-white/10 text-foreground/70 border-white/15",        dot: "bg-foreground/40" };
  }
}
