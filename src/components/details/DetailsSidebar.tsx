import type { ReactNode, RefObject } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DollarSign, ExternalLink, Globe, TrendingUp } from "lucide-react";
import { Image } from "@/components/ui/Image";
import { Reveal } from "@/components/details/Reveal";
import { formatCurrency, getStatusConfig } from "@/components/details/detailsFormatters";
import { getImageUrl } from "@/services/tmdb";
import { buildPersonPath } from "@/lib/seo";
import { Provider } from "@/types/media";
import { cn } from "@/lib/utils";

export interface DetailsSidebarProps {
  cast?: Array<{
    id: number;
    name: string;
    character?: string;
    profile_path?: string | null;
  }>;
  castPreviewScrollRef: RefObject<HTMLDivElement | null>;
  onScrollToCast: () => void;
  flatrateProviders: Provider[];
  rentProviders: Provider[];
  buyProviders: Provider[];
  renderProvider: (p: Provider) => ReactNode;
  status?: string | null;
  statusConfig: ReturnType<typeof getStatusConfig> | null;
  releaseDate?: string | null;
  mediaType: "movie" | "tv";
  language: string;
  runtime?: number | null;
  originalLanguage?: string | null;
  productionCountries?: Array<{ name: string }>;
  budget?: number | null;
  revenue?: number | null;
  productionCompanies?: Array<{ name: string }>;
  imdbId?: string | null;
  homepage?: string | null;
  showPersonalStats: boolean;
  personalStats?: {
    episodesWatched: number;
    totalHours: string;
    percentageComplete: number;
  } | null;
}

export function DetailsSidebar({
  cast,
  castPreviewScrollRef,
  onScrollToCast,
  flatrateProviders,
  rentProviders,
  buyProviders,
  renderProvider,
  status,
  statusConfig,
  releaseDate,
  mediaType,
  language,
  runtime,
  originalLanguage,
  productionCountries,
  budget,
  revenue,
  productionCompanies,
  imdbId,
  homepage,
  showPersonalStats,
  personalStats,
}: DetailsSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 space-y-4">
      {cast && cast.length > 0 && (
        <Reveal>
          <div className="rounded-2xl border border-white/8 bg-card/40 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Cast</p>
                <p className="mt-1 text-xs text-muted-foreground">Explore the people behind the story.</p>
              </div>
              <button
                type="button"
                onClick={onScrollToCast}
                className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                View all
              </button>
            </div>
            <div
              ref={castPreviewScrollRef}
              className="hide-scrollbar -mx-1 flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
            >
              {cast.slice(0, 8).map((person) => (
                <Link
                  key={`sidebar-cast-${person.id}`}
                  to={buildPersonPath(person.id, person.name)}
                  className="group/cast w-20 shrink-0 snap-start"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-xl border border-white/8 bg-muted/50 transition-colors group-hover/cast:border-primary/40">
                    {person.profile_path ? (
                      <Image
                        src={getImageUrl(person.profile_path, "w185") || ""}
                        alt={person.name}
                        width={185}
                        height={278}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover/cast:scale-105"
                        loading="lazy"
                        showSkeleton
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center bg-muted text-xl font-bold text-muted-foreground"
                        aria-hidden="true"
                      >
                        {person.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-foreground group-hover/cast:text-primary">
                    {person.name}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                    {person.character || "Cast"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* Watch options */}
      <Reveal>
        <div className="details-panel rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
            {t("details.whereToWatch", "Where to Watch")}
          </p>
          {flatrateProviders.length > 0 || rentProviders.length > 0 || buyProviders.length > 0 ? (
            <div className="space-y-3">
              {flatrateProviders.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    {t("details.streaming", "Streaming")}
                  </p>
                  <div className="flex flex-wrap gap-2">{flatrateProviders.map(renderProvider)}</div>
                </div>
              )}
              {rentProviders.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Rent</p>
                  <div className="flex flex-wrap gap-2">{rentProviders.map(renderProvider)}</div>
                </div>
              )}
              {buyProviders.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Buy</p>
                  <div className="flex flex-wrap gap-2">{buyProviders.map(renderProvider)}</div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground pt-1">Watch options data by JustWatch</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("details.notAvailableInRegion", "Not available in your region")}
            </p>
          )}
        </div>
      </Reveal>

      {/* Facts */}
      <Reveal>
        <div className="details-panel rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">Details</p>
          <dl className="space-y-2.5 text-sm">
            {status && statusConfig && (
              <div className="flex min-w-0 justify-between gap-2 items-center">
                <dt className="text-muted-foreground">Status</dt>
                <dd className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border", statusConfig.cls)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />
                  {status}
                </dd>
              </div>
            )}
            {releaseDate && (
              <div className="flex min-w-0 justify-between gap-2">
                <dt className="text-muted-foreground">{mediaType === "movie" ? "Released" : "First aired"}</dt>
                <dd className="min-w-0 break-words font-medium text-right text-sm">
                  {new Date(releaseDate).toLocaleDateString(language, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            )}
            {runtime && (
              <div className="flex min-w-0 justify-between gap-2">
                <dt className="text-muted-foreground">Runtime</dt>
                <dd className="font-medium">
                  {Math.floor(runtime / 60) > 0 ? `${Math.floor(runtime / 60)}h ` : ""}
                  {runtime % 60 > 0 ? `${runtime % 60}m` : ""}
                </dd>
              </div>
            )}
            {originalLanguage && (
              <div className="flex min-w-0 justify-between gap-2">
                <dt className="text-muted-foreground">Language</dt>
                <dd className="flex min-w-0 items-center gap-1 break-words font-medium">
                  <Globe className="w-3 h-3 shrink-0 opacity-60" />
                  {new Intl.DisplayNames([language], { type: "language" }).of(originalLanguage) ||
                    originalLanguage}
                </dd>
              </div>
            )}
            {productionCountries && productionCountries.length > 0 && (
              <div className="flex min-w-0 justify-between gap-2">
                <dt className="text-muted-foreground">Country</dt>
                <dd className="min-w-0 break-words font-medium text-right">
                  {productionCountries.slice(0, 2).map((c) => c.name).join(", ")}
                </dd>
              </div>
            )}
            {mediaType === "movie" && (budget ?? 0) > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3 opacity-60" />
                  Budget
                </dt>
                <dd className="font-medium">{formatCurrency(budget!)}</dd>
              </div>
            )}
            {mediaType === "movie" && (revenue ?? 0) > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 opacity-60" />
                  Box Office
                </dt>
                <dd className="font-bold text-emerald-400">{formatCurrency(revenue!)}</dd>
              </div>
            )}
            {productionCompanies && productionCompanies.length > 0 && (
              <div className="flex min-w-0 justify-between gap-2">
                <dt className="text-muted-foreground shrink-0">Studio</dt>
                <dd className="min-w-0 break-words font-medium text-right text-xs leading-relaxed">
                  {productionCompanies.slice(0, 3).map((c) => c.name).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
          {/* External links */}
          {(imdbId || homepage) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/6">
              {imdbId && (
                <a
                  href={`https://www.imdb.com/title/${imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/25 text-[#F5C518] text-xs font-bold hover:bg-[#F5C518]/20 transition-colors"
                >
                  IMDb <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {homepage && (
                <a
                  href={homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/12 text-foreground/60 text-xs font-medium hover:bg-white/10 hover:text-foreground transition-colors"
                >
                  Official Site <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </Reveal>

      {/* TV personal stats */}
      {showPersonalStats && personalStats && mediaType === "tv" && (
        <Reveal>
          <div className="details-panel rounded-2xl border border-white/8 bg-card/40 backdrop-blur-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
              {t("details.yourStats", "Your Progress")}
            </p>
            <div className="details-progress-grid grid grid-cols-3 gap-3 mb-4">
              <div className="text-center rounded-xl bg-white/5 p-3">
                <p className="text-xl font-black text-foreground">{personalStats.episodesWatched}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Episodes</p>
              </div>
              <div className="text-center rounded-xl bg-white/5 p-3">
                <p className="text-xl font-black text-foreground">{personalStats.totalHours}h</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Watched</p>
              </div>
              <div className="text-center rounded-xl bg-white/5 p-3">
                <p className="text-xl font-black text-primary">{personalStats.percentageComplete}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Done</p>
              </div>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                style={{ width: `${personalStats.percentageComplete}%` }}
              />
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
