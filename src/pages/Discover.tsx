import { Compass, Flame, Layers, Sparkles, Trophy, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { MediaSection } from "@/components/MediaSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildCanonicalUrl,
  buildMediaPath,
  toBreadcrumbJsonLd,
} from "@/lib/seo";
import {
  getAiringTodayTV,
  getNowPlayingMovies,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTrending,
  getBackdropUrl,
} from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";

export default function Discover() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  const { data: trendingNow } = useQuery({
    queryKey: ["discover-page", "trending", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
  });

  const { data: trendingWeek } = useQuery({
    queryKey: ["discover-page", "trending-week", language, includeAdult],
    queryFn: () => getTrending("all", "week", language, 1, includeAdult),
  });

  const { data: popularMovies } = useQuery({
    queryKey: ["discover-page", "popular-movies", language, includeAdult],
    queryFn: () => getPopularMovies(1, language, includeAdult),
  });

  const { data: popularTV } = useQuery({
    queryKey: ["discover-page", "popular-tv", language, includeAdult],
    queryFn: () => getPopularTV(1, language, includeAdult),
  });

  const { data: topRatedMovies } = useQuery({
    queryKey: ["discover-page", "top-rated-movies", language, includeAdult],
    queryFn: () => getTopRatedMovies(1, language, includeAdult),
  });

  const { data: nowPlayingMovies } = useQuery({
    queryKey: ["discover-page", "now-playing", language, includeAdult],
    queryFn: () => getNowPlayingMovies(1, language, includeAdult),
  });

  const { data: airingTodayTV } = useQuery({
    queryKey: ["discover-page", "airing-today", language, includeAdult],
    queryFn: () => getAiringTodayTV(1, language, includeAdult),
  });

  const spotlight = trendingNow?.results?.[0];
  const moodFilters = [
    { label: "Cozy", href: "/search?genre=35&sort=vote_average.desc" },
    { label: "Intense", href: "/search?genre=28&sort=popularity.desc" },
    { label: "Mind-bending", href: "/search?genre=878&sort=vote_average.desc" },
    { label: "Funny", href: "/search?genre=35&sort=popularity.desc" },
  ];

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("discover.seoTitle", "Discover Movies and TV | CineTrekker")}
        description={t(
          "discover.seoDescription",
          "Discover trending movies, streaming-ready picks, and acclaimed titles in CineTrekker.",
        )}
        canonical={buildCanonicalUrl("/discover")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
          ]),
        ]}
      />

      <div className="page-container space-y-8 pb-24 pt-20 md:pb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <p className="ct-kicker text-primary font-semibold tracking-wider uppercase mb-1">
              {t("discover.kicker", "Curated Selection")}
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl heading-cinematic flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Compass className="h-6 w-6 animate-pulse" />
              </span>
              {t("nav.discover", "Discover")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
              {t(
                "discover.heroCopy",
                "Explore featured spotlight titles, filter by your mood, and browse recommendations tailored to your taste.",
              )}
            </p>
          </div>
          <div className="shrink-0">
            <Button asChild className="btn-primary-glow rounded-full px-6 py-5 text-sm font-semibold">
              <Link to="/search">{t("discover.searchAll", "Search Everything")}</Link>
            </Button>
          </div>
        </div>

        {spotlight ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/20 p-6 md:p-10 z-10 shadow-xl">
            {spotlight.backdrop_path && (
              <div className="absolute inset-0 -z-10 select-none">
                <img
                  src={getBackdropUrl(spotlight.backdrop_path, "w1280") || ""}
                  alt=""
                  className="h-full w-full object-cover object-center opacity-30 md:opacity-45 transition-transform duration-1000 hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-[#0d0d0f]/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent hidden md:block" />
              </div>
            )}
            
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-center relative z-10">
              <div className="space-y-4">
                <p className="ct-kicker text-primary font-semibold tracking-wider uppercase">
                  {t("discover.spotlight", "Hero spotlight")}
                </p>
                <h2 className="heading-cinematic text-3xl font-extrabold tracking-tight text-white md:text-5xl drop-shadow-md leading-tight">
                  {spotlight.title || spotlight.name}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base drop-shadow-sm">
                  {spotlight.overview ||
                    t(
                      "discover.spotlightFallback",
                      "This title is leading the global conversation right now and anchors the discover page with a clearer top-of-page hierarchy.",
                    )}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="rounded-full bg-white/10 text-white backdrop-blur-md border border-white/15 px-3.5 py-1 text-xs">
                    {spotlight.media_type === "tv" ? "TV" : "Movie"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full bg-amber-500/10 border-amber-500/35 text-amber-300 px-3.5 py-1 flex items-center gap-1 font-semibold text-xs">
                    ★ {spotlight.vote_average.toFixed(1)}
                  </Badge>
                </div>
                <div className="pt-4">
                  <Button asChild className="btn-primary-glow rounded-full px-6 py-5 h-auto text-base font-semibold">
                    <Link to={buildMediaPath(spotlight.media_type === "tv" ? "tv" : "movie", spotlight.id, spotlight.title || spotlight.name || "")}>
                      {t("discover.openSpotlight", "Open spotlight")}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/45 p-6 backdrop-blur-md shadow-2xl space-y-5">
                <p className="ct-kicker text-zinc-400 font-medium">{t("discover.moodBoard", "By mood")}</p>
                <div className="flex flex-wrap gap-2">
                  {moodFilters.map((filter) => (
                    <Button
                      key={filter.label}
                      asChild
                      variant="outline"
                      className="rounded-full bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/15 hover:border-white/20 transition-all hover:scale-[1.04]"
                    >
                      <Link to={filter.href}>{filter.label}</Link>
                    </Button>
                  ))}
                </div>
                <div className="grid gap-2 pt-1">
                  {[
                    {
                      icon: Layers,
                      title: t("discover.pathways.genres", "Browse by genre"),
                      to: "/genres",
                    },
                    {
                      icon: Sparkles,
                      title: t("discover.pathways.decades", "Browse by decade"),
                      to: "/decades",
                    },
                    {
                      icon: Trophy,
                      title: t("discover.pathways.awards", "Award winners"),
                      to: "/awards",
                    },
                  ].map((pathway) => {
                    const Icon = pathway.icon;
                    return (
                      <Link
                        key={pathway.to}
                        to={pathway.to}
                        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm font-medium text-zinc-300 transition-all hover:border-primary/40 hover:bg-white/10 hover:text-white hover:translate-x-1"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        {pathway.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <MediaSection
          title={t("discover.trendingNow", "Trending Today")}
          items={trendingNow?.results || []}
          showMoreLink="/trending"
          emptyMessage={t("discover.emptyTrending", "Trending titles will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.hotOnStreaming", "Hot on Streaming")}
          items={airingTodayTV?.results || []}
          showMoreLink="/tv"
          emptyMessage={t("discover.emptyStreaming", "Streaming-ready shows will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.newOnStreaming", "New on Streaming")}
          items={nowPlayingMovies?.results || []}
          showMoreLink="/movies"
          emptyMessage={t("discover.emptyNowPlaying", "New releases will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.hiddenGems", "Hidden Gems")}
          items={topRatedMovies?.results || []}
          showMoreLink="/search?sort=vote_average.desc"
          emptyMessage={t("discover.emptyTopRated", "Top rated titles will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.trendingWeek", "Trending This Week")}
          items={trendingWeek?.results || []}
          showMoreLink="/trending"
          emptyMessage={t("discover.emptyTrendingWeek", "Weekly trending titles will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.popularTV", "Popular TV Shows")}
          items={popularTV?.results || []}
          showMoreLink="/tv"
          emptyMessage={t("discover.emptyPopularTV", "Popular TV shows will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.popularMovies", "Popular Movies")}
          items={popularMovies?.results || []}
          showMoreLink="/movies"
          emptyMessage={t("discover.emptyPopularMovies", "Popular movies will show up here shortly.")}
        />
      </div>
    </div>
  );
}
