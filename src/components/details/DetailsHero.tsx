import type { ComponentType, RefObject } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, DollarSign, Film, PlayCircle, Star, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/Image";
import { ScoreRing } from "@/components/details/ScoreRing";
import { getStatusConfig } from "@/components/details/detailsFormatters";
import { getMediaAltText } from "@/lib/seo";
import { cn } from "@/lib/utils";

export interface DetailsHeroFact {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

export interface DetailsHeroProps {
  heroRef: RefObject<HTMLDivElement | null>;
  backdropRef: RefObject<HTMLDivElement | null>;
  backdropUrl: string | null;
  backdropSrcSet: string | null;
  posterUrl: string;
  posterSrcSet: string | null;
  hasPoster: boolean;
  title: string;
  mediaType: "movie" | "tv";
  year: string | number | null | undefined;
  contentRatingTag: string | null | undefined;
  statusConfig: ReturnType<typeof getStatusConfig> | null;
  status?: string | null;
  tagline?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  directors: Array<{ name: string }>;
  creators: Array<{ name: string }>;
  networks?: Array<{ name: string }>;
  genres?: Array<{ id: number; name: string }>;
  rating: number;
  watchedItem?: {
    status?: string | null;
    rating?: number | null;
  } | null;
  personalStats?: {
    percentageComplete: number;
  } | null;
  heroFacts: DetailsHeroFact[];
  enrichedRatings?: {
    rottenTomatoes?: string | null;
    metascore?: string | null;
    imdbRating?: string | null;
    boxOffice?: string | null;
  } | null;
  tvSchedule?: {
    network?: string | null;
    days: string[];
    time?: string | null;
    nextEpisode?: {
      season: number;
      number: number;
      name: string;
      airdate: string;
    } | null;
  } | null;
  featuredTrailerKey?: string | null;
  onPlayVideo: (key: string) => void;
}

export function DetailsHero({
  heroRef,
  backdropRef,
  backdropUrl,
  backdropSrcSet,
  posterUrl,
  posterSrcSet,
  hasPoster,
  title,
  mediaType,
  year,
  contentRatingTag,
  statusConfig,
  status,
  tagline,
  numberOfSeasons,
  numberOfEpisodes,
  directors,
  creators,
  networks,
  genres,
  rating,
  watchedItem,
  personalStats,
  heroFacts,
  enrichedRatings,
  tvSchedule,
  featuredTrailerKey,
  onPlayVideo,
}: DetailsHeroProps) {
  const { t } = useTranslation();

  return (
    <div ref={heroRef} className="details-hero relative overflow-hidden md:min-h-[clamp(420px,68vh,740px)]">
      {/* Parallax backdrop */}
      <div ref={backdropRef} className="details-hero-backdrop absolute will-change-transform" style={{ inset: "-15% 0 0 0", height: "130%" }}>
        {backdropUrl ? (
          <Image src={backdropUrl} srcSet={backdropSrcSet || undefined} sizes="100vw" alt={getMediaAltText(title, mediaType, "backdrop")} width={1280} height={720} fetchPriority="high" loading="eager" priority className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
        )}
      </div>

      {/* Layered overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/78 to-black/15 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent pointer-events-none" />

      {/* Back button */}
      <Link to="/" className="absolute top-20 left-4 z-20 flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-white/80 transition-colors hover:border-white/30 hover:bg-black/65 hover:text-white" aria-label={t("nav.home")}>
        <ChevronLeft className="w-4 h-4" />{t("nav.home")}
      </Link>

      {/* Hero content */}
      <div className="details-hero-content absolute bottom-0 left-0 right-0 z-10">
        <div className="details-hero-container page-container pb-8 pt-16 md:pb-10">
          <div className="details-hero-layout flex flex-col md:flex-row md:items-end gap-6 lg:gap-8">

            {/* Poster — large and prominent in the hero */}
            <div className="details-hero-poster flex-shrink-0 mx-auto md:mx-0 relative group">
              <div className="relative">
                {hasPoster ? (
                  <Image
                    src={posterUrl} srcSet={posterSrcSet || undefined}
                    sizes="(max-width: 768px) 140px, 200px"
                    alt={getMediaAltText(title, mediaType, "poster")}
                    width={500} height={750} loading="lazy" showSkeleton
                    className="w-36 rounded-xl border border-white/10 shadow-2xl transition-colors duration-200 group-hover:border-primary/40 md:w-44"
                  />
                ) : (
                  <div className="flex w-36 aspect-[2/3] items-center justify-center rounded-xl border border-white/10 bg-muted/30 md:w-44">
                    <Film className="w-12 h-12 text-white/30" />
                  </div>
                )}
                {/* Score ring on poster */}
                {rating > 0 && (
                  <div className="absolute -bottom-3 -right-3 rounded-full border border-white/10 bg-background p-1 shadow-lg">
                    <ScoreRing score={rating} size={54} />
                  </div>
                )}
              </div>
            </div>

            {/* Title and metadata */}
            <div className="details-hero-copy min-w-0 flex-1 space-y-3 md:pb-1">
              {/* Primary metadata */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/70">
                <span className="uppercase tracking-[0.16em] text-primary">{mediaType === "movie" ? t("common.movie") : t("common.tvShow")}</span>
                {year && <><span aria-hidden="true">•</span><span>{year}</span></>}
                {contentRatingTag && <><span aria-hidden="true">•</span><span>{contentRatingTag}</span></>}
                {statusConfig && status && (
                  <><span aria-hidden="true">•</span><span className="inline-flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />{status}</span></>
                )}
              </div>

              {/* Title */}
              <h1 className="max-w-4xl text-3xl font-black leading-[1.03] text-white drop-shadow-lg md:text-5xl md:leading-[0.98] lg:text-6xl tracking-tight">
                {title}
              </h1>

              {/* Tagline */}
              {tagline && (
                <p className="max-w-[58ch] text-sm italic leading-6 text-white/62 md:text-base">"{tagline}"</p>
              )}

              {/* Meta row */}
              <div className="details-hero-meta flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/68">
                {numberOfSeasons && (
                  <span>{numberOfSeasons} {t("details.seasons")}</span>
                )}
                {numberOfEpisodes && (
                  <span>{numberOfEpisodes} {t("details.episodes")}</span>
                )}
                {(directors.length > 0 || creators.length > 0) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    {(directors.length > 0 ? directors : creators).slice(0, 2).map((d) => d.name).join(", ")}
                  </span>
                )}
                {networks && networks.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5" />
                    {networks.slice(0, 2).map((n) => n.name).join(", ")}
                  </span>
                )}
              </div>

              {/* Genres */}
              {genres && genres.length > 0 && (
                <p className="text-sm leading-6 text-white/72">{genres.map((g) => g.name).join(" · ")}</p>
              )}

              {watchedItem || heroFacts.length > 0 ? (
                <div className="details-hero-facts flex min-w-0 flex-wrap items-center gap-2">
                  {watchedItem && (
                    <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                      <span className="font-semibold uppercase tracking-[0.16em] text-white/55">
                        {t("details.yourLibrary", "Your library")}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-medium">
                        {watchedItem.status?.replace(/_/g, " ") || t("details.watched", "Watched")}
                      </span>
                      {typeof watchedItem.rating === "number" ? (
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-medium">
                          {watchedItem.rating}/10
                        </span>
                      ) : null}
                      {mediaType === "tv" && personalStats ? (
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-medium">
                          {personalStats.percentageComplete}%
                        </span>
                      ) : null}
                    </span>
                  )}

                  {heroFacts.map((fact) => {
                    const Icon = fact.icon;
                    return (
                      <span
                        key={fact.label}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white/78 backdrop-blur-sm"
                      >
                        <Icon className="h-3.5 w-3.5 text-white/55" />
                        <span>{fact.value}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {/* Multi-API Enriched Ratings (Rotten Tomatoes, Metacritic, IMDb) */}
              {enrichedRatings && (enrichedRatings.rottenTomatoes || enrichedRatings.metascore || enrichedRatings.imdbRating) ? (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {enrichedRatings.rottenTomatoes && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/50 px-3 py-1 text-xs font-semibold text-red-300 shadow-sm backdrop-blur-sm">
                      <span aria-hidden="true">🍅</span>
                      <span>{enrichedRatings.rottenTomatoes} Rotten Tomatoes</span>
                    </span>
                  )}
                  {enrichedRatings.metascore && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-sm backdrop-blur-sm">
                      <span aria-hidden="true">Ⓜ️</span>
                      <span>{enrichedRatings.metascore} Metascore</span>
                    </span>
                  )}
                  {enrichedRatings.imdbRating && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/50 px-3 py-1 text-xs font-semibold text-amber-300 shadow-sm backdrop-blur-sm">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{enrichedRatings.imdbRating}/10 IMDb</span>
                    </span>
                  )}
                  {enrichedRatings.boxOffice && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/75 backdrop-blur-sm">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{enrichedRatings.boxOffice}</span>
                    </span>
                  )}
                </div>
              ) : null}

              {/* TV Broadcast Schedule & Next Episode Countdown (TVMaze) */}
              {tvSchedule && (tvSchedule.network || tvSchedule.nextEpisode) ? (
                <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs text-white/90 shadow-sm backdrop-blur-sm">
                  <Tv className="h-3.5 w-3.5 text-primary shrink-0" />
                  {tvSchedule.network && (
                    <span className="font-semibold text-primary">{tvSchedule.network}</span>
                  )}
                  {tvSchedule.days.length > 0 && tvSchedule.time && (
                    <span className="text-white/70">
                      {tvSchedule.days.join(", ")} at {tvSchedule.time}
                    </span>
                  )}
                  {tvSchedule.nextEpisode && (
                    <span className="rounded-md bg-black/40 px-2 py-0.5 font-medium text-white/90">
                      Next: S{tvSchedule.nextEpisode.season}E{tvSchedule.nextEpisode.number} &ldquo;{tvSchedule.nextEpisode.name}&rdquo; ({tvSchedule.nextEpisode.airdate})
                    </span>
                  )}
                </div>
              ) : null}

              {/* Hero CTA */}
              {featuredTrailerKey && (
                <Button
                  size="lg"
                  className="w-full justify-center gap-2 bg-white text-black hover:bg-white/90 font-bold shadow-xl hover:shadow-white/20 transition-all hover:scale-[1.02] active:scale-95 rounded-xl sm:w-auto"
                  onClick={() => onPlayVideo(featuredTrailerKey)}
                >
                  <PlayCircle className="w-5 h-5 fill-black" />
                  {t("details.watchTrailer", "Watch Trailer")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
