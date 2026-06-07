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
        <section className="ct-panel-strong overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:items-end">
            <div>
              <p className="ct-kicker mb-3">{t("discover.kicker", "Editorial discovery, not a flat dump")}</p>
              <h1 className="mb-4 flex items-center gap-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary">
                  <Compass className="h-6 w-6" />
                </span>
                <span className="heading-cinematic text-[1.15em] leading-none">
                  {t("nav.discover", "Discover")}
                </span>
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "discover.heroCopy",
                  "Start with a spotlight title, then move through rows built around momentum, mood, and streaming usefulness.",
                )}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="btn-primary-glow">
                  <Link to="/search">{t("discover.searchAll", "Search Everything")}</Link>
                </Button>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                  {t("discover.browseByMood", "Browse by Mood")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {moodFilters.map((mood) => (
                    <Button
                      key={mood.label}
                      asChild
                      variant="outline"
                      className="rounded-full bg-white/[0.02] border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs h-9 px-4"
                    >
                      <Link to={mood.href}>
                        {mood.label === "Cozy" ? "😊 Cozy" :
                         mood.label === "Intense" ? "⚡ Intense" :
                         mood.label === "Mind-bending" ? "🧠 Mind-bending" :
                         mood.label === "Funny" ? "🍿 Funny" : mood.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              {[
                {
                  icon: Flame,
                  title: t("discover.signal.trending", "Trending today"),
                  body: t("discover.signal.trendingBody", "Start with live momentum when you want the cultural pulse."),
                },
                {
                  icon: Tv,
                  title: t("discover.signal.streaming", "Streaming-ready"),
                  body: t("discover.signal.streamingBody", "Use airing and now-playing rails for what feels current, not stale."),
                },
                {
                  icon: Sparkles,
                  title: t("discover.signal.curated", "Curated picks"),
                  body: t("discover.signal.curatedBody", "Editorial rails help you move quickly from trend to next best watch."),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {spotlight ? (
          <section className="ct-panel overflow-hidden">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end">
              <div>
                <p className="ct-kicker mb-3 text-primary/80">
                  {t("discover.spotlight", "Hero spotlight")}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {spotlight.title || spotlight.name}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  {spotlight.overview ||
                    t(
                      "discover.spotlightFallback",
                      "This title is leading the global conversation right now and anchors the discover page with a clearer top-of-page hierarchy.",
                    )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {spotlight.media_type === "tv" ? "TV" : "Movie"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {spotlight.vote_average.toFixed(1)}
                  </Badge>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild className="btn-primary-glow">
                    <Link to={buildMediaPath(spotlight.media_type === "tv" ? "tv" : "movie", spotlight.id, spotlight.title || spotlight.name || "")}>
                      {t("discover.openSpotlight", "Open spotlight")}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-background/35 p-5">
                <p className="ct-kicker mb-3">{t("discover.moodBoard", "By mood")}</p>
                <div className="flex flex-wrap gap-3">
                  {moodFilters.map((filter) => (
                    <Button
                      key={filter.label}
                      asChild
                      variant="outline"
                      className="rounded-full bg-card/50"
                    >
                      <Link to={filter.href}>{filter.label}</Link>
                    </Button>
                  ))}
                </div>
                <div className="mt-5 grid gap-3">
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
                        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-card/80"
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
