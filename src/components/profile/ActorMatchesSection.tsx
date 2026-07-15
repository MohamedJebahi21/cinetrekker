import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, User, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getImageUrl,
  getPersonDetails,
  getPopularPeople,
  type PersonDetails,
} from "@/services/tmdb";
import { profileService } from "@/services/profile";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { Image } from "@/components/ui/Image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActorMatchesSectionProps = {
  dateOfBirth: string;
  userAge: number | null;
  language: string;
  hasPreferences: boolean;
  ratingsCount: number;
  favoriteGenres: number[];
};

const LOCAL_CACHE_KEY = "cinetrekker_actor_matches_v2";
const MIN_ACTOR_MATCHES = 6;

interface CachedMatches {
  data: PersonDetails[];
  context: {
    age: number | null;
    genres: number[];
    language: string;
  };
  updatedAt: string;
}

type ScoredActorMatch = {
  person: PersonDetails;
  score: number;
  ageDiff: number;
  popularity: number;
};

function getActorAge(birthday?: string | null): number | null {
  if (!birthday) return null;
  const [year, month, day] = birthday.split("-").map(Number);
  if (!year || !month || !day) return null;

  const birthDate = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getTopWorks(person: PersonDetails): string[] {
  const cast = person.combined_credits?.cast ?? [];

  const sortedWorks = [...cast].sort((workA, workB) => {
    const popularityDiff = (workB.popularity ?? 0) - (workA.popularity ?? 0);
    if (popularityDiff !== 0) return popularityDiff;
    return (workB.vote_count ?? 0) - (workA.vote_count ?? 0);
  });

  const names = sortedWorks
    .map((work) => work.title || work.name)
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(names)).slice(0, 2);
}

function getPersonGenreSet(person: PersonDetails): Set<number> {
  const credits = person.combined_credits?.cast ?? [];
  const topCredits = [...credits]
    .sort(
      (workA, workB) =>
        (workB.popularity ?? 0) - (workA.popularity ?? 0) ||
        (workB.vote_count ?? 0) - (workA.vote_count ?? 0),
    )
    .slice(0, 20);

  const genres = new Set<number>();
  for (const credit of topCredits) {
    const genreIds = (credit as { genre_ids?: number[] }).genre_ids ?? [];
    for (const genreId of genreIds) {
      genres.add(genreId);
    }
  }

  return genres;
}

function getGenreMatchScore(
  person: PersonDetails,
  favoriteGenres: number[],
): number {
  if (favoriteGenres.length === 0) return 0;
  const personGenres = getPersonGenreSet(person);
  if (personGenres.size === 0) return 0;

  const overlap = favoriteGenres.filter((genreId) =>
    personGenres.has(genreId),
  ).length;

  return overlap / favoriteGenres.length;
}

function getAgeMatchScore(actorAge: number | null, targetAge: number): number {
  if (actorAge === null) return 0.3;
  const ageDiff = Math.abs(actorAge - targetAge);
  // Linear decay from exact match to 0 at 20+ years difference.
  return Math.max(0, 1 - ageDiff / 20);
}

function getPopularityScore(person: PersonDetails): number {
  const popularity = person.popularity ?? 0;
  return Math.max(0, Math.min(1, popularity / 100));
}

function calculateMatchScore(
  person: PersonDetails,
  targetAge: number,
  favoriteGenres: number[],
): number {
  const actorAge = getActorAge(person.birthday);
  const ageScore = getAgeMatchScore(actorAge, targetAge);
  const genreScore = getGenreMatchScore(person, favoriteGenres);
  const popularityScore = getPopularityScore(person);

  const weighted = ageScore * 0.55 + genreScore * 0.35 + popularityScore * 0.1;

  // Keep output in a human-friendly 0-100 range.
  return Math.round(weighted * 100);
}

function selectBestMatches(
  people: PersonDetails[],
  targetAge: number,
  favoriteGenres: number[],
  minCount: number,
): PersonDetails[] {
  const scored: ScoredActorMatch[] = people.map((person) => {
    const actorAge = getActorAge(person.birthday);
    return {
      person,
      score: calculateMatchScore(person, targetAge, favoriteGenres),
      ageDiff:
        actorAge === null
          ? Number.POSITIVE_INFINITY
          : Math.abs(actorAge - targetAge),
      popularity: person.popularity ?? 0,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.ageDiff !== b.ageDiff) return a.ageDiff - b.ageDiff;
    return b.popularity - a.popularity;
  });

  const ordered = scored.map((item) => item.person);

  const uniqueById = Array.from(
    new Map(ordered.map((person) => [person.id, person])).values(),
  );

  return uniqueById.slice(0, Math.min(uniqueById.length, minCount));
}

export default function ActorMatchesSection({
  dateOfBirth,
  userAge,
  language,
  hasPreferences,
  ratingsCount,
  favoriteGenres,
}: ActorMatchesSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isReady = Boolean(dateOfBirth) && userAge !== null && hasPreferences;

  const {
    data: peopleDetails = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "actor-matches",
      user?.id,
      dateOfBirth,
      favoriteGenres,
      language,
    ],
    enabled: isReady,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours client session
    queryFn: async () => {
      if (userAge === null) {
        return [];
      }

      // 1. Context Helper
      const currentContext = {
        age: userAge,
        genres: [...favoriteGenres].sort((a, b) => a - b),
        language,
      };

      // 2. Try Primary Cache (Supabase)
      if (user?.id) {
        try {
          const profile = await profileService.getProfile(user.id);
          if (profile?.actor_matches && profile.actor_matches_context) {
            const {
              age,
              genres,
              language: cachedLanguage,
            } = profile.actor_matches_context;
            const cacheDate = profile.actor_matches_updated_at
              ? new Date(profile.actor_matches_updated_at)
              : null;

            const isContextSame =
              age === userAge &&
              cachedLanguage === language &&
              JSON.stringify([...(genres || [])].sort((a, b) => a - b)) ===
                JSON.stringify(currentContext.genres);

            const isFresh =
              cacheDate &&
              Date.now() - cacheDate.getTime() < 30 * 24 * 60 * 60 * 1000;
            const hasEnoughMatches =
              Array.isArray(profile.actor_matches) &&
              profile.actor_matches.length >= MIN_ACTOR_MATCHES;

            if (isContextSame && isFresh && hasEnoughMatches) {
              logger.debug("ActorMatches: Loaded from Supabase cache");
              return profile.actor_matches as PersonDetails[];
            }
          }
        } catch (err) {
          console.warn(
            "ActorMatches: Supabase cache lookup failed (column likely missing)",
            err,
          );
        }
      }

      // 3. Try Secondary Cache (LocalStorage) - Fallback for speed
      try {
        const localRaw = localStorage.getItem(
          `${LOCAL_CACHE_KEY}_${user?.id || "guest"}`,
        );
        if (localRaw) {
          const localParsed = JSON.parse(localRaw) as CachedMatches;
          const isContextSame =
            localParsed.context.age === userAge &&
            localParsed.context.language === language &&
            JSON.stringify(
              [...(localParsed.context.genres || [])].sort((a, b) => a - b),
            ) === JSON.stringify(currentContext.genres);

          const isFresh =
            Date.now() - new Date(localParsed.updatedAt).getTime() <
            14 * 24 * 60 * 60 * 1000;
          const hasEnoughMatches =
            Array.isArray(localParsed.data) &&
            localParsed.data.length >= MIN_ACTOR_MATCHES;

          if (isContextSame && isFresh && hasEnoughMatches) {
            logger.debug("ActorMatches: Loaded from LocalStorage cache");
            return localParsed.data;
          }
        }
      } catch (err) {
        console.warn("ActorMatches: Local cache lookup failed", err);
      }

      // 4. Recalculation (Speed Boosted)
      logger.debug("ActorMatches: Recalculating matches...");
      const pages = await Promise.all([
        getPopularPeople(1, language),
        getPopularPeople(2, language),
        getPopularPeople(3, language),
      ]);

      const people = pages.flatMap((page) => page.results).slice(0, 60);
      const details: (PersonDetails | null)[] = [];
      const chunkSize = 20;

      for (let i = 0; i < people.length; i += chunkSize) {
        const chunk = people.slice(i, i + chunkSize);
        const chunkDetails = await Promise.all(
          chunk.map((person) =>
            getPersonDetails(person.id, language).catch(() => null),
          ),
        );
        details.push(...chunkDetails);
      }

      const freshDetails = details.filter(Boolean) as PersonDetails[];

      const bestCandidates = selectBestMatches(
        freshDetails,
        userAge,
        favoriteGenres,
        MIN_ACTOR_MATCHES,
      );

      // Prune details to save space
      const prunedMatches = bestCandidates.map((person) => ({
        id: person.id,
        name: person.name,
        birthday: person.birthday,
        profile_path: person.profile_path,
        combined_credits: {
          cast: (person.combined_credits?.cast || [])
            .map((c) => ({
              id: c.id,
              title: c.title,
              name: c.name,
              popularity: c.popularity,
              vote_count: c.vote_count,
              genre_ids: (c as { genre_ids?: number[] }).genre_ids,
            }))
            .slice(0, 10), // Only top 10 works needed for UI
        },
      })) as unknown as PersonDetails[];

      // 5. Save to Caches
      if (prunedMatches.length > 0) {
        const updatePayload = {
          data: prunedMatches,
          context: currentContext,
          updatedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem(
            `${LOCAL_CACHE_KEY}_${user?.id || "guest"}`,
            JSON.stringify(updatePayload),
          );
          logger.debug("ActorMatches: Saved to LocalStorage");
        } catch (e) {
          console.warn("ActorMatches: Failed to save to localStorage", e);
        }

        if (user?.id) {
          try {
            await profileService.updateProfile(user.id, {
              actor_matches: prunedMatches,
              actor_matches_context: currentContext,
              actor_matches_updated_at: updatePayload.updatedAt,
            });
            logger.debug("ActorMatches: Saved to Supabase");
          } catch (err) {
            console.warn("ActorMatches: Failed to save to Supabase", err);
          }
        }
      }

      return prunedMatches;
    },
  });

  const sameAgeMatches = peopleDetails;

  if (ratingsCount < 20) {
    const cappedRatings = Math.min(ratingsCount, 20);
    const progress = (cappedRatings / 20) * 100;

    return (
      <Card>
        <CardContent className="space-y-3 pt-6 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
          <p className="text-sm font-semibold text-foreground">
            {t("profile.actorMatchesWaiting", "Actor Matches are waiting")}
          </p>
          <p className="text-xs text-muted-foreground">
            Actor Matches compare your favorite genres and rated titles with
            performers who share a similar cinematic lane.
          </p>
          <p className="text-xs text-muted-foreground/85">
            {t(
              "profile.actorMatchesUnlockHint",
              "Rate 20+ movies to unlock Actor Matches",
            )}
          </p>
          <div className="mx-auto w-full max-w-xs space-y-1">
            <Progress
              value={progress}
              className="h-2.5"
            />
            <p className="text-[11px] text-muted-foreground">
              {cappedRatings}/20 ratings
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dateOfBirth || userAge === null || !hasPreferences) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
          <p className="text-sm font-semibold text-foreground">
            {t("profile.actorMatchesWaiting", "Actor Matches are waiting")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This feature uses your age range plus favorite genres to surface
            performers with a similar taste profile.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {t(
              "profile.actorMatchesSetupHint",
              "Add your age and at least one favorite genre to discover matching actors.",
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex gap-3">
                <div className="h-24 w-20 rounded-md skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded skeleton-shimmer" />
                  <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                  <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sameAgeMatches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            {t("profile.actorMatchesEmpty", "No Matches Found")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "profile.actorMatchesEmptyDesc",
              "Try adjusting your age or adding different genres to improve match quality.",
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {t("profile.actorMatchesTopGlobal", "Top Global Matches")}
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help rounded-full p-1 hover:bg-accent">
                  <Info className="h-3.5 w-3.5 text-muted-foreground/80" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-[11px] leading-relaxed">
                {t(
                  "profile.actorMatchesHowItWorks",
                  "Matches blend age similarity, genre overlap, and actor popularity from TMDB.",
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Optimization Status Badge */}
        {!error && (
          <div className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/5 px-2 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-green-500/80">
              {t("profile.optimized", "Optimized")}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sameAgeMatches.slice(0, 6).map((person) => {
          const actorAge = getActorAge(person.birthday);
          const topWorks = getTopWorks(person);
          const matchScore = calculateMatchScore(
            person,
            userAge,
            favoriteGenres,
          );

          return (
            <Link
              key={person.id}
              to={`/person/${person.id}`}
              className="group block min-w-0"
            >
              <div className="actor-match-card min-h-[188px] rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <div className="flex items-start gap-2.5">
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-32 sm:w-24">
                    {person.profile_path ? (
                      <Image
                        src={getImageUrl(person.profile_path, "w342") || ""}
                        srcSet={`${getImageUrl(person.profile_path, "w342")} 342w, ${getImageUrl(person.profile_path, "w500")} 500w`}
                        sizes="(max-width: 640px) 80px, 96px"
                        width={96}
                        height={144}
                        loading="lazy"
                        decoding="async"
                        alt={person.name}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p
                        className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-foreground break-words"
                        title={person.name}
                      >
                        {person.name}
                      </p>
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {t("profile.matchScore", "Match {{score}}%", {
                          score: matchScore,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {actorAge !== null
                        ? t("profile.actorAge", "Age {{age}}", {
                            age: actorAge,
                          })
                        : t("profile.actorAgeUnavailable", "Age unavailable")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {t(
                        "profile.actorMatchesBasedOnRatings",
                        "Based on your top-rated films",
                      )}
                    </p>

                    <div className="mt-2">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground/60">
                        {t("profile.topWorks", "Top Works")}
                      </p>
                      {topWorks.length > 0 ? (
                        <ul className="space-y-0.5">
                          {topWorks.map((work) => (
                            <li
                              key={`${person.id}-${work}`}
                              className="line-clamp-1 text-xs text-foreground/80"
                            >
                              - {work}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">
                          {t(
                            "profile.noTopWorksAvailable",
                            "No top works available",
                          )}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="inline-block rounded-md border border-border px-2.5 py-1 text-xs text-foreground/80">
                        {t("profile.viewFilmography", "View Filmography")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
