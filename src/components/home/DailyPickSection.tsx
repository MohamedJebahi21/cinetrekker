import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Play, Sparkles, Star } from "lucide-react";
import type { Media } from "@/types/media";
import { getBackdropUrl, getImageUrl, getMediaTitle, getMediaType } from "@/services/tmdb";
import { Button } from "@/components/ui/button";
import { useUserLists } from "@/contexts/UserListsContext";

type DailyPickSectionProps = {
  pick: Media | null;
  sourceLabel?: string;
};

export function DailyPickSection({
  pick,
  sourceLabel,
}: DailyPickSectionProps) {
  const { t } = useTranslation();
  const { addToWatched, removeFromWatched, isWatched } = useUserLists();

  if (!pick) return null;

  const title = getMediaTitle(pick);
  const mediaType = getMediaType(pick);
  const backdrop = getBackdropUrl(pick.backdrop_path, "w1280");
  const poster = getImageUrl(pick.poster_path, "w342");
  const description =
    pick.overview ||
    t("home.dailyPickFallback", "A strong next pick chosen from your library signals and what is trending right now.");
  const meta = [
    mediaType === "movie"
      ? t("common.movie", "Movie")
      : t("common.tvShow", "TV Show"),
    pick.release_date?.slice(0, 4) || pick.first_air_date?.slice(0, 4) || t("common.now", "Now"),
  ];
  const watched = isWatched(pick.id, mediaType);

  const handleWatchedToggle = async () => {
    if (watched) {
      await removeFromWatched(pick.id, mediaType);
      return;
    }

    await addToWatched(pick.id, mediaType, undefined, undefined, "completed");
  };

  return (
    <section className="ct-panel-strong relative overflow-hidden rounded-[2rem]">
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,12,0.94)_0%,rgba(4,6,12,0.8)_50%,rgba(4,6,12,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.16),transparent_22%)]" />

      <div className="relative grid gap-6 p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.55fr)] md:items-center md:p-7">
        <div className="max-w-3xl">
          <p className="ct-kicker mb-3 text-primary/90">
            {sourceLabel || t("home.dailyPick", "Tonight's Pick")}
          </p>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("home.dailyPickBadge", "Chosen to keep your streak moving")}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/80">
            {pick.vote_average ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                <Star className="h-3.5 w-3.5 text-yellow-300" />
                {pick.vote_average.toFixed(1)}
              </span>
            ) : null}
            {meta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 md:text-base">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="btn-primary-glow">
              <Link to={`/${mediaType}/${pick.id}`}>
                <Play className="h-4 w-4" />
                {t("home.openTodaysPick", "Open Tonight's Pick")}
              </Link>
            </Button>
            <Button
              type="button"
              variant={watched ? "secondary" : "outline"}
              className="border-white/15 bg-white/5"
              onClick={() => {
                void handleWatchedToggle();
              }}
            >
              <Check className="h-4 w-4" />
              {watched
                ? t("nav.watched", "Watched")
                : t("actions.markWatched", "Mark as Watched")}
            </Button>
            <Button asChild variant="outline" className="border-white/15 bg-white/5">
              <Link to="/watchlist">
                <Bookmark className="h-4 w-4" />
                {t("nav.watchlist", "Watchlist")}
              </Link>
            </Button>
          </div>
        </div>

        {poster ? (
          <div className="hidden justify-end md:flex">
            <div className="relative w-[220px] overflow-hidden rounded-[1.5rem] border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.4)]">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_18%,rgba(0,0,0,0.18)_100%)]" />
              <img
                src={poster}
                alt={title}
                className="aspect-[2/3] w-full object-cover"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
