import { ArrowRight, Bookmark, Play, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { getBackdropUrl, getMediaTitle, getTrending } from "@/services/tmdb";

export function HeroSection() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  const { data: featuredResponse } = useQuery({
    queryKey: ["hero-featured", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
  });

  const featured = featuredResponse?.results?.find((item) => item.backdrop_path);
  const featuredTitle = featured ? getMediaTitle(featured) : t("home.hero.featuredFallback", "Tonight's featured pick");
  const featuredBackdrop = featured ? getBackdropUrl(featured.backdrop_path, "w1280") : null;
  const featuredMeta = [
    featured?.media_type === "tv" ? t("common.tvShow", "TV Show") : t("common.movie", "Movie"),
    featured?.release_date?.slice(0, 4) || featured?.first_air_date?.slice(0, 4) || t("home.hero.newRelease", "Featured now"),
  ];
  const featuredDescription =
    featured?.overview?.trim() ||
    t(
      "home.hero.featuredDescriptionFallback",
      "Open the featured title, save it to your list, and keep your next watch one tap away.",
    );

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-background">
      {featuredBackdrop ? (
        <img
          src={featuredBackdrop}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-30"
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.24),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(245,158,11,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_40%),linear-gradient(135deg,rgba(7,10,18,0.14),transparent_56%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,12,0.96)_0%,rgba(4,6,12,0.72)_48%,rgba(4,6,12,0.94)_100%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_48%)] lg:block" />
      <div className="page-container relative grid grid-cols-1 gap-6 py-10 sm:py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] md:items-center md:gap-10 md:py-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-medium text-primary sm:px-4 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span className="truncate sm:whitespace-normal">
              {t("home.hero.badge", "Featured tonight, with tracking built around it")}
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            {t("home.hero.featuredNow", "Featured now")}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-foreground sm:text-5xl md:text-7xl">
            {featuredTitle}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/82">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <Star className="h-3.5 w-3.5 text-yellow-300" />
              {featured?.vote_average ? featured.vote_average.toFixed(1) : "8.0"}
            </span>
            {featuredMeta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-foreground/78 line-clamp-4 sm:text-base sm:leading-7 md:line-clamp-none md:text-lg">
            {featuredDescription}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {featured?.media_type ? (
              <Button
                asChild
                size="lg"
                className="btn-primary-glow h-11 w-full gap-2 px-4 text-sm shadow-[0_10px_28px_hsla(var(--primary)/0.28)] sm:h-12 sm:w-auto sm:px-6 sm:text-base"
              >
                <Link to={`/${featured.media_type}/${featured.id}`}>
                  <Play className="h-4 w-4" />
                  {t("home.hero.openFeatured", "Open Featured Title")}
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 w-full gap-2 px-4 text-sm sm:h-12 sm:w-auto sm:px-6 sm:text-base"
            >
              <Link to="/watchlist">
                {user
                  ? t("home.hero.openWatchlist", "Open My Watchlist")
                  : t("home.startTracking", "Start Tracking")}
                <Bookmark className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Link
            to="/discover"
            className="mt-4 inline-flex items-center text-sm font-medium text-foreground/82 transition-colors hover:text-primary"
          >
            {t("home.hero.browse", "Browse Movies & TV")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
