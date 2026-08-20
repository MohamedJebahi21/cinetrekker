import { useState } from "react";
import { Compass, Flame, Layers, Sparkles, Trophy, Tv, Film, Star, ChevronRight, Play, TrendingUp, Clock, Popcorn } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { MediaSection } from "@/components/MediaSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  getTopRatedTV,
  getTrending,
  getUpcomingMovies,
  getOnTheAirTV,
  getBackdropUrl,
  getImageUrl,
} from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";
import type { Media } from "@/types/media";

// ── Mood filter definitions with correct genre IDs ──────────────────────────
const MOODS = [
  { label: "😂 Funny",        genre: 35,    sort: "popularity.desc",    color: "from-yellow-500/20 to-yellow-600/5",  border: "border-yellow-500/25",  text: "text-yellow-300" },
  { label: "😨 Scary",        genre: 27,    sort: "vote_average.desc",  color: "from-red-900/30 to-red-800/5",        border: "border-red-700/30",      text: "text-red-300" },
  { label: "🤯 Mind-bending", genre: 878,   sort: "vote_average.desc",  color: "from-violet-500/20 to-violet-600/5", border: "border-violet-500/25",   text: "text-violet-300" },
  { label: "❤️ Romantic",     genre: 10749, sort: "popularity.desc",    color: "from-pink-500/20 to-pink-600/5",     border: "border-pink-500/25",     text: "text-pink-300" },
  { label: "🏃 Action",       genre: 28,    sort: "popularity.desc",    color: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/25",   text: "text-orange-300" },
  { label: "😢 Emotional",    genre: 18,    sort: "vote_average.desc",  color: "from-blue-500/20 to-blue-600/5",     border: "border-blue-500/25",     text: "text-blue-300" },
  { label: "👨‍👩‍👧 Family",  genre: 10751, sort: "popularity.desc",    color: "from-green-500/20 to-green-600/5",   border: "border-green-500/25",    text: "text-green-300" },
  { label: "🔍 Mystery",      genre: 9648,  sort: "vote_average.desc",  color: "from-slate-500/20 to-slate-600/5",  border: "border-slate-500/25",    text: "text-slate-300" },
  { label: "🎭 Drama",        genre: 18,    sort: "popularity.desc",    color: "from-amber-500/20 to-amber-600/5",  border: "border-amber-500/25",    text: "text-amber-300" },
  { label: "🚀 Sci-Fi",       genre: 878,   sort: "popularity.desc",    color: "from-cyan-500/20 to-cyan-600/5",    border: "border-cyan-500/25",     text: "text-cyan-300" },
];

// ── Spotlight auto-cycle hero ────────────────────────────────────────────────
function SpotlightHeroSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading featured title"
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-card/45 shadow-2xl"
      style={{ minHeight: "clamp(370px, 52vh, 560px)" }}
    >
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="relative z-10 flex min-h-[clamp(370px,52vh,560px)] flex-col justify-end p-6 sm:p-8 lg:p-10">
        <div className="max-w-2xl space-y-4">
          <div className="h-6 w-32 rounded-full skeleton-shimmer" />
          <div className="h-10 w-3/4 rounded-md skeleton-shimmer sm:h-12" />
          <div className="h-4 w-full rounded-md skeleton-shimmer" />
          <div className="h-4 w-4/5 rounded-md skeleton-shimmer" />
          <div className="h-11 w-40 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </section>
  );
}

function SpotlightHero({ items }: { items: Media[] }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const { t } = useTranslation();

  const cycle = (next: number) => {
    setFading(true);
    setTimeout(() => { setActive(next); setFading(false); }, 350);
  };

  // Preserve the initial LCP candidate. Spotlight changes remain available through
  // the pagination controls and poster strip, without an automatic late repaint.

  if (!items.length) return null;
  const item = items[Math.min(active, items.length - 1)];
  const href = buildMediaPath(item.media_type === "tv" ? "tv" : "movie", item.id, item.title || item.name || "");
  const releaseYear = (item.release_date || item.first_air_date)?.slice(0, 4);

  return (
    <section
      aria-label="Featured title"
      className="discover-spotlight relative isolate overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ minHeight: "clamp(370px, 52vh, 560px)" }}
    >
      {/* Backdrop */}
      <div className={cn("absolute inset-0 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
        {item.backdrop_path ? (
          <img
            src={getBackdropUrl(item.backdrop_path, "w1280") || ""}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover object-center scale-[1.015]"
            style={{ transitionDuration: "8000ms" }}
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--background)))]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,13,0.94)_0%,rgba(8,9,13,0.72)_44%,rgba(8,9,13,0.16)_78%,rgba(8,9,13,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(8,9,13,0.94)_0%,rgba(8,9,13,0.12)_58%,rgba(8,9,13,0.2)_100%)]" />
      </div>

      {/* Content */}
      <div className={cn("relative z-10 flex h-full flex-col justify-end p-6 sm:p-8 lg:p-10 transition-all duration-500", fading ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100")} style={{ minHeight: "clamp(370px, 52vh, 560px)" }}>
        <div className="max-w-2xl space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-primary/25 bg-primary/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-sm">
              Today’s spotlight
            </Badge>
            <Badge variant="outline" className="border-white/20 bg-black/35 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur-sm">
              {item.media_type === "tv" ? "TV Show" : "Movie"}
            </Badge>
          </div>

          {/* Title */}
          <h2 className="max-w-xl text-3xl font-semibold leading-[1.04] tracking-[-0.04em] text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
            {item.title || item.name}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/75">
            {releaseYear && <span>{releaseYear}</span>}
            {releaseYear && item.vote_average > 0 && <span className="h-1 w-1 rounded-full bg-white/35" aria-hidden="true" />}
            {item.vote_average > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                {item.vote_average.toFixed(1)}
              </span>
            )}
          </div>

          {/* Overview */}
          {item.overview && (
            <p className="max-w-xl text-sm leading-6 text-white/70 line-clamp-2 md:text-base md:leading-7 md:line-clamp-3">
              {item.overview}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 bg-white font-semibold text-black shadow-lg hover:bg-white/90">
              <Link to={href}><Play className="w-4 h-4 fill-black" />View Details</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 border-white/20 bg-black/20 font-medium text-white hover:bg-white/15 backdrop-blur-sm">
              <Link to="/search">
                <Compass className="w-4 h-4" />Explore All
              </Link>
            </Button>
          </div>
        </div>

        {/* Pagination dots */}
        {items.length > 1 && (
          <div className="absolute bottom-5 right-6 flex items-center gap-1.5 sm:bottom-6 sm:right-8">
            {items.slice(0, 5).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => cycle(i)}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={`Go to slide ${i + 1}`}
              >
                <span
                  aria-hidden="true"
                  className={cn("h-1.5 rounded-full transition-all duration-300", i === active ? "w-6 bg-white" : "w-1.5 bg-white/35")}
                />
              </button>
            ))}
          </div>
        )}

        {/* Poster strip — thumbnails of other items */}
        <div className="absolute right-5 top-5 hidden flex-col gap-2 xl:flex">
          {items.slice(0, 5).map((it, i) => (
            <button
              key={it.id}
              onClick={() => cycle(i)}
              className={cn("h-16 w-11 shrink-0 overflow-hidden rounded-lg border transition-[border-color,opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white", i === active ? "border-white opacity-100 shadow-lg" : "border-white/20 opacity-55 hover:border-white/50 hover:opacity-90")}
              aria-label={it.title || it.name}
            >
              {it.poster_path ? (
                <img src={getImageUrl(it.poster_path, "w185") || ""} alt={it.title || it.name || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Category quick-nav cards ─────────────────────────────────────────────────
const CATEGORIES = [
  { icon: Flame,     label: "Trending",     to: "/trending",              color: "text-orange-400", bg: "from-orange-500/15 to-orange-600/5",  border: "border-orange-500/20" },
  { icon: Film,      label: "Movies",       to: "/search?type=movie",     color: "text-blue-400",   bg: "from-blue-500/15 to-blue-600/5",      border: "border-blue-500/20" },
  { icon: Tv,        label: "TV Shows",     to: "/search?type=tv",        color: "text-violet-400", bg: "from-violet-500/15 to-violet-600/5",  border: "border-violet-500/20" },
  { icon: Trophy,    label: "Top Rated",    to: "/search?sort=vote_average.desc", color: "text-yellow-400", bg: "from-yellow-500/15 to-yellow-600/5", border: "border-yellow-500/20" },
  { icon: TrendingUp,label: "New Releases", to: "/search?sort=release_date.desc", color: "text-green-400",  bg: "from-green-500/15 to-green-600/5",  border: "border-green-500/20" },
  { icon: Layers,    label: "Genres",       to: "/genres",                color: "text-pink-400",   bg: "from-pink-500/15 to-pink-600/5",      border: "border-pink-500/20" },
  { icon: Sparkles,  label: "By Decade",    to: "/decades",               color: "text-cyan-400",   bg: "from-cyan-500/15 to-cyan-600/5",      border: "border-cyan-500/20" },
  { icon: Popcorn,   label: "Award Winners",to: "/awards",                color: "text-amber-400",  bg: "from-amber-500/15 to-amber-600/5",    border: "border-amber-500/20" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Discover() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;
  const [activeMood, setActiveMood] = useState<number | null>(null);

  const { data: trendingNow } = useQuery({
    queryKey: ["discover", "trending-day", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
  });

  const { data: trendingWeek } = useQuery({
    queryKey: ["discover", "trending-week", language, includeAdult],
    queryFn: () => getTrending("all", "week", language, 1, includeAdult),
  });

  const { data: popularMovies } = useQuery({
    queryKey: ["discover", "popular-movies", language, includeAdult],
    queryFn: () => getPopularMovies(1, language, includeAdult),
  });

  const { data: popularTV } = useQuery({
    queryKey: ["discover", "popular-tv", language, includeAdult],
    queryFn: () => getPopularTV(1, language, includeAdult),
  });

  const { data: topRatedMovies } = useQuery({
    queryKey: ["discover", "top-rated-movies", language, includeAdult],
    queryFn: () => getTopRatedMovies(1, language, includeAdult),
  });

  const { data: topRatedTV } = useQuery({
    queryKey: ["discover", "top-rated-tv", language, includeAdult],
    queryFn: () => getTopRatedTV(1, language, includeAdult),
  });

  const { data: nowPlayingMovies } = useQuery({
    queryKey: ["discover", "now-playing", language, includeAdult],
    queryFn: () => getNowPlayingMovies(1, language, includeAdult),
  });

  const { data: upcomingMovies } = useQuery({
    queryKey: ["discover", "upcoming", language, includeAdult],
    queryFn: () => getUpcomingMovies(1, language, includeAdult),
  });

  const { data: airingTodayTV } = useQuery({
    queryKey: ["discover", "airing-today", language, includeAdult],
    queryFn: () => getAiringTodayTV(1, language, includeAdult),
  });

  const { data: onTheAirTV } = useQuery({
    queryKey: ["discover", "on-the-air", language, includeAdult],
    queryFn: () => getOnTheAirTV(1, language, includeAdult),
  });

  const spotlightItems = trendingNow?.results?.slice(0, 5) ?? [];

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("discover.seoTitle", "Discover Movies and TV | CineTrekker")}
        description={t("discover.seoDescription", "Discover trending movies, streaming-ready picks, and acclaimed titles in CineTrekker.")}
        canonical={buildCanonicalUrl("/discover")}
        jsonLd={[toBreadcrumbJsonLd([{ name: t("nav.home", "Home"), path: "/" }, { name: t("nav.discover", "Discover"), path: "/discover" }])]}
      />

      <div className="page-container space-y-9 pb-24 pt-20 md:pb-12">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ct-kicker mb-2">Curated selection</p>
            <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Compass className="h-5 w-5" />
              </span>
              Discover
            </h1>
          </div>
          <Button asChild variant="outline" className="hidden gap-2 sm:flex">
            <Link to="/search"><Sparkles className="w-4 h-4" />Search Everything</Link>
          </Button>
        </div>

        {/* ── Spotlight Hero ── */}
        <div
          aria-busy={spotlightItems.length === 0 || undefined}
          style={{ minHeight: "clamp(370px, 52vh, 560px)" }}
        >
          {spotlightItems.length > 0 ? <SpotlightHero items={spotlightItems} /> : <SpotlightHeroSkeleton />}
        </div>

        {/* ── Category quick-nav grid ── */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">Browse By</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.to}
                  to={cat.to}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border bg-card/55 p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md active:translate-y-0",
                    cat.bg, cat.border
                  )}
                >
                  <Icon className={cn("w-5 h-5", cat.color)} />
                  <span className="text-[11px] font-semibold text-foreground/80 leading-tight">{cat.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Mood / Vibe filter ── */}
        <section className="ct-panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold">What's your mood?</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Find something that fits how you feel right now</p>
            </div>
            {activeMood !== null && (
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setActiveMood(null)}>
                Clear ×
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {MOODS.map((mood, i) => (
              <button
                key={i}
                onClick={() => setActiveMood(activeMood === i ? null : i)}
                className={cn(
                  "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                  activeMood === i
                    ? cn(mood.color, mood.border, mood.text, "border-opacity-60 shadow-sm")
                    : "bg-card/40 text-foreground/70 hover:bg-card hover:text-foreground"
                )}
              >
                {mood.label}
              </button>
            ))}
          </div>

          {activeMood !== null && (
            <div className="mt-5 pt-5 border-t border-white/8 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-foreground font-semibold">{MOODS[activeMood].label}</span> picks
              </p>
              <Button asChild size="sm" className="rounded-xl gap-1.5">
                <Link to={`/search?genre=${MOODS[activeMood].genre}&sort=${MOODS[activeMood].sort}`}>
                  See All Results <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </section>

        {/* ── Trending Today ── */}
        <MediaSection
          title="🔥 Trending Today"
          items={trendingNow?.results || []}
          showMoreLink="/trending"
          emptyMessage="Trending titles will appear shortly."
        />

        {/* ── Airing on TV Today ── */}
        <MediaSection
          title="📺 Airing on TV Today"
          items={airingTodayTV?.results || []}
          showMoreLink="/search?type=tv"
          emptyMessage="Today's airing shows will appear shortly."
        />

        {/* ── Now Playing in Cinemas ── */}
        <MediaSection
          title="🎬 Now Playing in Cinemas"
          items={nowPlayingMovies?.results || []}
          showMoreLink="/search?type=movie&sort=release_date.desc"
          emptyMessage="Now playing movies will appear shortly."
        />

        {/* ── Upcoming Movies ── */}
        <MediaSection
          title="🗓️ Coming Soon"
          items={upcomingMovies?.results || []}
          showMoreLink="/search?type=movie&sort=release_date.asc"
          emptyMessage="Upcoming movies will appear shortly."
        />

        {/* ── Trending This Week ── */}
        <MediaSection
          title="📈 Trending This Week"
          items={trendingWeek?.results || []}
          showMoreLink="/trending"
          emptyMessage="Weekly trending will appear shortly."
        />

        {/* ── Currently Airing TV ── */}
        <MediaSection
          title="📡 Currently Airing Shows"
          items={onTheAirTV?.results || []}
          showMoreLink="/search?type=tv"
          emptyMessage="On the air shows will appear shortly."
        />

        {/* ── Top Rated Movies ── */}
        <MediaSection
          title="⭐ Top Rated Movies of All Time"
          items={topRatedMovies?.results || []}
          showMoreLink="/search?type=movie&sort=vote_average.desc"
          emptyMessage="Top rated movies will appear shortly."
        />

        {/* ── Top Rated TV ── */}
        <MediaSection
          title="⭐ Top Rated TV Shows"
          items={topRatedTV?.results || []}
          showMoreLink="/search?type=tv&sort=vote_average.desc"
          emptyMessage="Top rated TV shows will appear shortly."
        />

        {/* ── Popular Movies ── */}
        <MediaSection
          title="🎥 Popular Movies"
          items={popularMovies?.results || []}
          showMoreLink="/search?type=movie"
          emptyMessage="Popular movies will appear shortly."
        />

        {/* ── Popular TV ── */}
        <MediaSection
          title="📺 Popular TV Shows"
          items={popularTV?.results || []}
          showMoreLink="/search?type=tv"
          emptyMessage="Popular TV shows will appear shortly."
        />

      </div>
    </div>
  );
}
