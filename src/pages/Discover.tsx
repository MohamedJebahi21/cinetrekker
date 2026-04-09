import { Compass, Flame, Layers, Sparkles, Trophy, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { MediaSection } from "@/components/MediaSection";
import { Button } from "@/components/ui/button";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
} from "@/lib/seo";
import {
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getTrending,
} from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";

export default function Discover() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

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

  const { data: topRatedTV } = useQuery({
    queryKey: ["discover-page", "top-rated-tv", language, includeAdult],
    queryFn: () => getTopRatedTV(1, language, includeAdult),
  });

  const { data: trendingNow } = useQuery({
    queryKey: ["discover-page", "trending", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
  });

  const pathways = [
    {
      title: t("discover.pathways.genres", "Browse by Genre"),
      description: t(
        "discover.pathways.genresDesc",
        "Jump into action, horror, animation, romance, and more with fast visual browsing.",
      ),
      icon: Layers,
      to: "/genres",
    },
    {
      title: t("discover.pathways.decades", "Browse by Decade"),
      description: t(
        "discover.pathways.decadesDesc",
        "Move from classic eras to modern releases without losing your place.",
      ),
      icon: Sparkles,
      to: "/decades",
    },
    {
      title: t("discover.pathways.awards", "Award Winners"),
      description: t(
        "discover.pathways.awardsDesc",
        "Find celebrated titles when you want something proven, not random.",
      ),
      icon: Trophy,
      to: "/awards",
    },
  ];

  const browseSignals = [
    {
      label: t("discover.signals.trending", "Trending Now"),
      value: t("discover.signals.live", "Live pulse"),
      icon: Flame,
    },
    {
      label: t("discover.signals.tv", "Prestige TV"),
      value: t("discover.signals.episodic", "Episode-first picks"),
      icon: Tv,
    },
    {
      label: t("discover.signals.awards", "Award Winners"),
      value: t("discover.signals.critical", "Critic-backed"),
      icon: Trophy,
    },
  ];

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("discover.seoTitle", "Discover Movies and TV | CineTrekker")}
        description={t(
          "discover.seoDescription",
          "Discover popular movies, trending TV, award winners, and genre collections in CineTrekker.",
        )}
        canonical={buildCanonicalUrl("/discover")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.discover", "Discover"), path: "/discover" },
          ]),
        ]}
      />

      <div className="page-container space-y-8 pt-20 pb-24 md:pb-10">
        <section className="ct-panel-strong overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] md:items-end">
            <div>
              <p className="ct-kicker mb-3">{t("discover.kicker", "Explore without friction")}</p>
              <h1 className="section-title mb-3 flex items-center gap-3">
                <Compass className="h-8 w-8 text-primary" />
                {t("nav.discover", "Discover")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "discover.heroCopy",
                  "Explore breakout series, dependable crowd favorites, and curated browse paths from one polished discovery hub built for finding what to watch next.",
                )}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="btn-primary-glow">
                  <Link to="/search">{t("discover.searchAll", "Search Everything")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/trending">{t("discover.seeTrending", "See Trending")}</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {pathways.map((pathway) => {
                const Icon = pathway.icon;
                return (
                  <Link
                    key={pathway.to}
                    to={pathway.to}
                    className="rounded-2xl border border-border/60 bg-card/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-foreground">{pathway.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{pathway.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {browseSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-border/60 bg-[linear-gradient(180deg,hsla(var(--card)/0.92),hsla(var(--card)/0.72))] p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{signal.label}</p>
                      <p className="text-xs text-muted-foreground">{signal.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <MediaSection
          title={t("discover.trendingNow", "Trending Right Now")}
          items={trendingNow?.results || []}
          showMoreLink="/trending"
          emptyMessage={t("discover.emptyTrending", "Trending titles will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.popularMovies", "Popular Movies")}
          items={popularMovies?.results || []}
          showMoreLink="/movies"
          emptyMessage={t("discover.emptyPopularMovies", "Popular movies will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.popularTV", "Popular TV Shows")}
          items={popularTV?.results || []}
          showMoreLink="/tv"
          emptyMessage={t("discover.emptyPopularTV", "Popular TV shows will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.topRated", "Top Rated Picks")}
          items={topRatedMovies?.results || []}
          showMoreLink="/awards"
          emptyMessage={t("discover.emptyTopRated", "Top rated picks will show up here shortly.")}
        />

        <MediaSection
          title={t("discover.topRatedTV", "Top Rated TV")}
          items={topRatedTV?.results || []}
          showMoreLink="/tv"
          emptyMessage={t("discover.emptyTopRatedTV", "Top rated TV will show up here shortly.")}
        />
      </div>
    </div>
  );
}
