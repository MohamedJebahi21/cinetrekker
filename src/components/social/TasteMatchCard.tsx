import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { HeartHandshake, Sparkles, Tv, Film } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profile";
import type { PublicProfileSummary } from "@/services/social";
import { getMediaTitle, getMovieDetails, getTVDetails } from "@/services/tmdb";
import { cn } from "@/lib/utils";

interface TasteMatchResult {
  score: number | null;
  sharedTitleKeys: string[];
  sharedGenreCount: number;
  hasComparableData: boolean;
}

function normalizeKeys(values: string[] | null | undefined) {
  return new Set(
    (values ?? []).filter((value) => /^(movie|tv)-\d+$/.test(value)),
  );
}

function calculateTasteMatch(
  ownTitles: string[] | null | undefined,
  ownGenres: number[] | null | undefined,
  target: PublicProfileSummary,
): TasteMatchResult {
  const ownTitleSet = normalizeKeys(ownTitles);
  const targetTitleSet = normalizeKeys(target.favorite_titles);
  const sharedTitleKeys = Array.from(ownTitleSet).filter((key) => targetTitleSet.has(key));
  const ownGenreSet = new Set((ownGenres ?? []).filter(Number.isInteger));
  const targetGenreSet = new Set((target.favorite_genres ?? []).filter(Number.isInteger));
  const sharedGenreCount = Array.from(ownGenreSet).filter((genre) => targetGenreSet.has(genre)).length;
  const titleUnion = new Set([...ownTitleSet, ...targetTitleSet]).size;
  const genreUnion = new Set([...ownGenreSet, ...targetGenreSet]).size;
  const hasComparableData = ownTitleSet.size > 0 || targetTitleSet.size > 0 || ownGenreSet.size > 0 || targetGenreSet.size > 0;

  if (!hasComparableData) {
    return { score: null, sharedTitleKeys, sharedGenreCount, hasComparableData };
  }

  const titleSimilarity = titleUnion > 0 ? sharedTitleKeys.length / titleUnion : 0;
  const genreSimilarity = genreUnion > 0 ? sharedGenreCount / genreUnion : 0;
  const score = Math.max(1, Math.min(99, Math.round(titleSimilarity * 65 + genreSimilarity * 35)));

  return { score, sharedTitleKeys, sharedGenreCount, hasComparableData };
}

function SharedTitleNames({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  const { data: names = [] } = useQuery({
    queryKey: ["taste-match-shared-titles", keys],
    enabled: keys.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const results = await Promise.all(
        keys.slice(0, 3).map(async (key) => {
          const [mediaType, idText] = key.split("-");
          const id = Number(idText);
          const details = mediaType === "tv" ? await getTVDetails(id) : await getMovieDetails(id);
          return { key, title: getMediaTitle(details) || t("common.title", "Title") };
        }),
      );
      return results;
    },
  });

  if (keys.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {names.map((item) => (
        <Link
          key={item.key}
          to={`/${item.key.startsWith("tv-") ? "tv" : "movie"}/${item.key.split("-")[1]}`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-background/35 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:text-primary"
        >
          {item.key.startsWith("tv-") ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
          <span className="max-w-[12rem] truncate">{item.title}</span>
        </Link>
      ))}
    </div>
  );
}

export function TasteMatchCard({ target }: { target: PublicProfileSummary }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: ownProfile, isLoading } = useQuery({
    queryKey: ["taste-match-own-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    queryFn: () => profileService.getProfile(user!.id),
  });

  if (!user || isLoading || !ownProfile || !target.is_public) return null;

  const result = calculateTasteMatch(
    ownProfile.favorite_titles,
    ownProfile.favorite_genres,
    target,
  );
  const targetName = target.display_name || t("common.user", "CineTrekker User");

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-3xl border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.16),transparent_42%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.94))] p-5 md:p-6"
      aria-labelledby="taste-match-title"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300/90">
            <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            {t("tasteMatch.eyebrow", "Taste match")}
          </div>
          <h2 id="taste-match-title" className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {t("tasteMatch.title", "You and {{name}} might watch well together", { name: targetName })}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {result.hasComparableData
              ? t("tasteMatch.description", "Your match is based on shared favorites and genre signals — a quick way to find your cinematic people.")
              : t("tasteMatch.noData", "Add a few favorites to unlock a more meaningful taste comparison.")}
          </p>
          {result.score !== null && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{t("tasteMatch.sharedTitles", "{{count}} shared favorites", { count: result.sharedTitleKeys.length })}</span>
              <span className="text-border">•</span>
              <span>{t("tasteMatch.sharedGenres", "{{count}} shared genres", { count: result.sharedGenreCount })}</span>
            </div>
          )}
          <SharedTitleNames keys={result.sharedTitleKeys} />
        </div>
        <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end">
          <div className={cn("flex h-24 w-24 flex-col items-center justify-center rounded-full border-4", result.score !== null && result.score >= 70 ? "border-fuchsia-300/60 bg-fuchsia-300/12" : "border-border/60 bg-background/35")}>
            {result.score !== null ? (
              <>
                <span className="text-3xl font-black text-foreground">{result.score}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-200/80">{t("tasteMatch.match", "match")}</span>
              </>
            ) : (
              <Sparkles className="h-7 w-7 text-fuchsia-300" aria-hidden="true" />
            )}
          </div>
          <Link to={`/user/${target.user_id}`} className="text-xs font-semibold text-fuchsia-200 transition hover:text-fuchsia-100">
            {t("tasteMatch.viewProfile", "View profile")}
          </Link>
        </div>
      </div>
    </section>
  );
}
