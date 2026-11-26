import { motion, type Variants } from "framer-motion";
import { Award, BarChart3, CalendarDays, Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ProfileTasteBreakdownProps {
  text: (key: string, fallback: string) => string;
  itemVariants: Variants;
  favoriteGenres: number[];
  genres: Array<{ id: number; name: string }>;
  genreWatchCounts: Map<number, number>;
  onToggleGenre: (genreId: number) => void;
  topDecade?: { decade: string; count: number } | null;
  decadeDistribution: Array<{ decade: string; count: number }>;
  mostUsedRating?: { rating: number; count: number } | null;
  ratingDistribution: Array<{ rating: number; count: number }>;
  maxRatingCount: number;
  ratingsCount: number;
  topDirectors: Array<{ name: string; count: number }>;
  topCast: Array<{ name: string; count: number }>;
}

export function ProfileTasteBreakdown({
  text,
  itemVariants,
  favoriteGenres,
  genres,
  genreWatchCounts,
  onToggleGenre,
  topDecade,
  decadeDistribution,
  mostUsedRating,
  ratingDistribution,
  maxRatingCount,
  ratingsCount,
  topDirectors,
  topCast,
}: ProfileTasteBreakdownProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <motion.section variants={itemVariants} className="md:col-span-2">
        <Card className="border-primary/20 bg-primary/[0.045]">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-foreground">
                {text("profile.tasteMethodTitle", "How your Taste & Stats are calculated")}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {text(
                  "profile.tasteMethodCopy",
                  "These insights reflect the titles you log, the ratings you give, and the genres and favorites you choose. They are personal summaries, not recommendations or objective scores.",
                )}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/watched">{text("profile.reviewHistory", "Review history")}</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.section>

      {/* Left Column: Genres & Decades */}
      <div className="space-y-6">
        <motion.section variants={itemVariants} className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            {text("profile.favoriteGenres", "Favorite Genres")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("profile.genresSelected", "{{count}} genres selected", {
              count: favoriteGenres.length,
            })}
          </p>
          <Card className="ct-panel">
            <CardContent className="pt-5 pb-5">
              {favoriteGenres.length === 0 && (
                <p className="mb-3 rounded-lg border border-dashed border-border/50 bg-background/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
                  {text("profile.tapGenresToSelect", "Tap genres below to build your taste profile — this powers recommendations.")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => {
                  const selected = favoriteGenres.includes(genre.id);
                  const watchCount = genreWatchCounts.get(genre.id) || 0;
                  return (
                    <Tooltip key={genre.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onToggleGenre(genre.id)}
                          className={cn(
                            "group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:bg-accent",
                          )}
                        >
                          {selected && <Check className="h-3 w-3 shrink-0" />}
                          {genre.name}
                          {watchCount > 0 && (
                            <span
                              className={cn(
                                "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                                selected
                                  ? "bg-white/20 text-white"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {watchCount}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("profile.genreFilmsCount", "{{genre}} ({{count}} films)", {
                          genre: genre.name,
                          count: watchCount,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              {favoriteGenres.length > 0 && (
                <p className="mt-3 text-[10px] text-muted-foreground border-t border-border/20 pt-3">
                  {t("profile.genresSelected", "{{count}} genres selected", {
                    count: favoriteGenres.length,
                  })}{" — "}{text("profile.genresSavedAutomatically", "saved automatically.")}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            {text("profile.decadeDistribution", "Decade Distribution")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {text("profile.decadeDistributionSubtitle", "Distribution of logged films across decades of release.")}
          </p>
          {topDecade ? (
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground/85">
              {t("profile.decadeTakeaway", "You return to {{decade}} most often: {{count}} logged title(s).", {
                decade: topDecade.decade,
                count: topDecade.count,
              })}
            </p>
          ) : null}
          <Card className="ct-panel w-full">
            <CardContent className="space-y-4 pt-6">
              {decadeDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">{text("profile.noDecadeStats", "No decade statistics available yet.")}</p>
              ) : (
                decadeDistribution.map((entry) => {
                  const max = Math.max(
                    ...decadeDistribution.map((value) => value.count),
                    1,
                  );
                  const progressValue = (entry.count / max) * 100;
                  return (
                    <div key={entry.decade} className="flex items-center gap-3">
                      <span className="w-12 text-xs text-neutral-400 font-semibold">{entry.decade}</span>
                      <Progress value={progressValue} className="h-2 flex-1" />
                      <span className="w-8 text-right text-xs text-neutral-400">{entry.count}</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>

      {/* Right Column: Ratings & Crew */}
      <div className="space-y-6">
        <motion.section
          variants={itemVariants}
          id="ratings-distribution"
          className="space-y-3"
        >
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <BarChart3 className="h-5 w-5 text-primary" />
            {text("profile.ratingDistribution", "Rating Distribution")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {text("profile.ratingDistributionSubtitle", "Spread of your rated titles.")}
          </p>
          {mostUsedRating ? (
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground/85">
              {t("profile.ratingTakeaway", "Your most common score is {{rating}} stars across {{count}} title(s).", {
                rating: mostUsedRating.rating,
                count: mostUsedRating.count,
              })}
            </p>
          ) : null}
          <Card className="ct-panel w-full">
            <CardContent className="space-y-4 pt-6">
              {ratingDistribution.map((entry) => {
                const max = Math.max(
                  ...ratingDistribution.map((value) => value.count),
                  1,
                );
                const progressValue = (entry.count / max) * 100;
                const isTopBar =
                  maxRatingCount > 0 &&
                  entry.count === maxRatingCount;
                void isTopBar;

                return (
                  <div key={entry.rating} className="flex items-center gap-3">
                    <span className="w-8 text-xs text-neutral-400">
                      {entry.rating}
                    </span>
                    <Progress value={progressValue} className="h-2 flex-1" />
                    <span className="w-8 text-right text-xs text-neutral-400">
                      {entry.count}
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-neutral-400 pt-1 border-t border-border/20">
                {mostUsedRating
                  ? t("profile.mostFrequentRating", "Most frequent rating: {{rating}} stars", { rating: mostUsedRating.rating })
                  : text("profile.noRatingsYet", "No ratings yet")}
              </p>
              {ratingsCount === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 mt-2">
                  <p className="text-sm font-medium text-foreground">
                    {text("profile.noRatingsTitle", "You have not rated anything yet")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {text(
                      "profile.noRatingsDesc",
                      "Rate a few titles to unlock recommendations, actor matches, and a full ratings breakdown.",
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to="/search">{text("profile.browseMoviesToRate", "Browse movies to rate")}</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/watched">{text("profile.openWatchedList", "Open watched list")}</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Award className="h-5 w-5 text-muted-foreground" />
            {text("profile.crewInsights", "Crew Insights")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {text("profile.crewInsightsSubtitle", "Directors and actors you watch most frequently.")}
          </p>
          {topDirectors[0] || topCast[0] ? (
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground/85">
              {topDirectors[0]
                ? t("profile.directorTakeaway", "Your most revisited director is {{name}} ({{count}} title(s)).", {
                    name: topDirectors[0].name,
                    count: topDirectors[0].count,
                  })
                : t("profile.castTakeaway", "Your most revisited performer is {{name}} ({{count}} title(s)).", {
                    name: topCast[0].name,
                    count: topCast[0].count,
                  })}
            </p>
          ) : null}
          <Card className="w-full transition-all duration-200">
            <CardContent className="space-y-6 pt-6">
              {/* Directors */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{text("profile.topDirectors", "Most Watched Directors")}</p>
                {topDirectors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{text("profile.noDirectorsYet", "No director statistics yet.")}</p>
                ) : (
                  topDirectors.map((director) => {
                    const max = Math.max(...topDirectors.map((d) => d.count), 1);
                    const progressValue = (director.count / max) * 100;
                    return (
                      <div key={director.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{director.name}</span>
                          <span className="text-muted-foreground">{t("profile.watchedCount", "{{count}} films", { count: director.count })}</span>
                        </div>
                        <Progress value={progressValue} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cast */}
              <div className="space-y-3 pt-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{text("profile.topCast", "Most Watched Cast")}</p>
                {topCast.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{text("profile.noCastYet", "No actor statistics yet.")}</p>
                ) : (
                  topCast.map((actor) => {
                    const max = Math.max(...topCast.map((c) => c.count), 1);
                    const progressValue = (actor.count / max) * 100;
                    return (
                      <div key={actor.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{actor.name}</span>
                          <span className="text-muted-foreground">{t("profile.watchedCount", "{{count}} films", { count: actor.count })}</span>
                        </div>
                        <Progress value={progressValue} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}
