import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Film,
  Tv,
  Star,
  ExternalLink,
  Instagram,
  Twitter,
  ChevronRight,
  User,
} from "lucide-react";
import { getPersonDetails, getImageUrl } from "@/services/tmdb";
import { MediaCard } from "@/components/MediaCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { buildCanonicalUrl, buildPersonPath, parseMediaPath, toBreadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

// ── age or lifespan helper ──
function calcAge(birthday: string | null, deathday: string | null): number | null {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const born = new Date(birthday);
  let age = end.getFullYear() - born.getFullYear();
  const m = end.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < born.getDate())) age--;
  return age;
}

export default function Person() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const parsed = slug ? parseMediaPath("person", slug) : null;
  const personId = parsed?.id ?? 0;
  const backdropRef = useRef<HTMLDivElement>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("movies");

  // Parallax on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!backdropRef.current) return;
      backdropRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: person, isLoading, isError, error } = useQuery({
    queryKey: ["person", personId, language],
    queryFn: () => getPersonDetails(personId, language),
    enabled: !!personId,
  });

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="relative h-64 overflow-hidden -mt-16">
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="page-container -mt-24 relative z-10 pb-24">
          <div className="flex flex-col gap-8 md:flex-row md:items-end">
            <div className="mx-auto md:mx-0 w-40 md:w-56 aspect-[2/3] rounded-2xl skeleton-shimmer flex-shrink-0" />
            <div className="flex-1 space-y-4 pb-4">
              <div className="h-10 w-1/2 rounded-xl skeleton-shimmer" />
              <div className="h-5 w-1/4 rounded-lg skeleton-shimmer" />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 w-24 rounded-full skeleton-shimmer" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !person) {
    return (
      <div className="page-container py-16 text-center min-h-screen pt-24">
        <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">{t("common.error")}</p>
        {error && <p className="mt-2 text-sm text-destructive">{(error as Error).message}</p>}
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
          <ChevronLeft className="w-4 h-4" /> {t("nav.home")}
        </Link>
      </div>
    );
  }

  // ── Derived data ──
  const castCredits = person.combined_credits?.cast ?? [];
  const crewCredits = person.combined_credits?.crew ?? [];

  const movies = castCredits
    .filter((c) => c.media_type === "movie")
    .sort((a, b) => {
      const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
      const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 24);

  const tvShows = castCredits
    .filter((c) => c.media_type === "tv")
    .sort((a, b) => {
      const dateA = a.first_air_date ? new Date(a.first_air_date).getTime() : 0;
      const dateB = b.first_air_date ? new Date(b.first_air_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 24);

  // Crew credits (directing / writing)
  const directedMovies = crewCredits
    .filter((c) => c.job === "Director" && c.media_type === "movie")
    .sort((a, b) => {
      return (b.release_date ? new Date(b.release_date).getTime() : 0) - (a.release_date ? new Date(a.release_date).getTime() : 0);
    })
    .slice(0, 12);

  // Notable works — top 6 by vote_count
  const notableWorks = [...castCredits]
    .filter((c) => c.poster_path)
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 6);

  const profileUrl = getImageUrl(person.profile_path, "w500");
  const profileSrcSet = person.profile_path
    ? `${getImageUrl(person.profile_path, "w185")} 185w, ${getImageUrl(person.profile_path, "w342")} 342w, ${getImageUrl(person.profile_path, "w500")} 500w`
    : undefined;

  // Photos from images append
  const photos: Array<{ file_path: string }> = person.images?.profiles?.slice(0, 8) || [];

  const birthYear = person.birthday ? new Date(person.birthday).getFullYear() : null;
  const deathYear = person.deathday ? new Date(person.deathday).getFullYear() : null;
  const age = calcAge(person.birthday, person.deathday);

  const personPath = buildPersonPath(personId, person.name);
  const bioText = person.biography || "";
  const bioIsLong = bioText.length > 400;

  // External links
  const imdbId = person.external_ids?.imdb_id;
  const instagramId = person.external_ids?.instagram_id;
  const twitterId = person.external_ids?.twitter_id;

  return (
    <>
      <SEO
        title={`${person.name} | CineTrekker`}
        description={bioText ? bioText.slice(0, 160) : `View ${person.name}'s filmography and biography.`}
        image={profileUrl}
        canonical={buildCanonicalUrl(personPath)}
        jsonLd={[toBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "People", path: "/search?type=person" },
          { name: person.name, path: personPath },
        ])]}
      />

      {/* ═══════════════════════════════════════
          ATMOSPHERIC HEADER
      ═══════════════════════════════════════ */}
      <div className="relative overflow-hidden -mt-16" style={{ height: "280px" }}>
        {/* Blurred profile photo as backdrop */}
        <div ref={backdropRef} className="absolute inset-0 will-change-transform" style={{ height: "130%", top: "-15%" }}>
          {profileUrl ? (
            <img
              src={profileUrl}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-top blur-2xl scale-110 opacity-30"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent pointer-events-none" />

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-20 left-4 z-20 flex items-center gap-2 text-sm text-white/80 hover:text-white bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors border border-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("nav.home")}
        </Link>
      </div>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════ */}
      <div className="page-container relative z-10 -mt-32 pb-24 md:pb-0">

        {/* ── Profile header row ── */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end">

          {/* Profile photo */}
          <div className="flex-shrink-0 mx-auto md:mx-0 relative group">
            {profileUrl ? (
              <Image
                src={profileUrl}
                srcSet={profileSrcSet}
                sizes="(max-width: 768px) 160px, 224px"
                alt={`${person.name} profile photo`}
                width={500}
                height={750}
                className="w-40 md:w-56 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-2 border-white/10 group-hover:border-primary/40 transition-all"
                showSkeleton
              />
            ) : (
              <div className="flex w-40 md:w-56 aspect-[2/3] items-center justify-center rounded-2xl bg-muted border-2 border-white/10">
                <span className="text-5xl font-bold text-muted-foreground">{person.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4 pb-4">
            {/* Department badge */}
            {person.known_for_department && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs uppercase tracking-widest font-semibold px-3 py-1">
                {person.known_for_department}
              </Badge>
            )}

            {/* Name */}
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">{person.name}</h1>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {birthYear && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {birthYear}{deathYear ? ` – ${deathYear}` : ""}
                  {age !== null && <span className="text-foreground/60">({age}{person.deathday ? " at death" : " years old"})</span>}
                </div>
              )}
              {person.place_of_birth && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {person.place_of_birth}
                </div>
              )}
              {movies.length > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Film className="w-3.5 h-3.5" />
                  {movies.length} films
                </div>
              )}
              {tvShows.length > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Tv className="w-3.5 h-3.5" />
                  {tvShows.length} TV shows
                </div>
              )}
            </div>

            {/* External links */}
            <div className="flex flex-wrap gap-2">
              {imdbId && (
                <a
                  href={`https://www.imdb.com/name/${imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] text-xs font-bold hover:bg-[#F5C518]/20 transition-colors"
                >
                  IMDb <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {instagramId && (
                <a
                  href={`https://instagram.com/${instagramId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold hover:bg-pink-500/20 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" /> @{instagramId}
                </a>
              )}
              {twitterId && (
                <a
                  href={`https://twitter.com/${twitterId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-colors"
                >
                  <Twitter className="w-3.5 h-3.5" /> @{twitterId}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            BIOGRAPHY
        ═══════════════════════════════════════ */}
        {bioText && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55 mb-4">Biography</h2>
            <p className={cn("text-sm leading-8 text-foreground/80 md:text-base whitespace-pre-line", bioIsLong && !bioExpanded && "line-clamp-5")}>
              {bioText}
            </p>
            {bioIsLong && (
              <Button variant="link" size="sm" className="mt-2 px-0 text-primary" onClick={() => setBioExpanded(s => !s)}>
                {bioExpanded ? t("common.readLess", "Read Less") : t("common.readMore", "Read More")}
              </Button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            NOTABLE WORKS
        ═══════════════════════════════════════ */}
        {notableWorks.length > 0 && (
          <section className="mt-10">
            <h2 className="section-title mb-4">Notable Works</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {notableWorks.map((credit) => (
                <Link
                  key={`notable-${credit.id}-${credit.credit_id}`}
                  to={credit.media_type === "movie" ? `/movie/${credit.id}` : `/tv/${credit.id}`}
                  className="group relative"
                >
                  <div className="relative rounded-xl overflow-hidden aspect-[2/3] border border-white/10 group-hover:border-primary/50 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-primary/10">
                    {credit.poster_path ? (
                      <Image
                        src={getImageUrl(credit.poster_path, "w342") || ""}
                        alt={credit.title || credit.name || ""}
                        width={170}
                        height={255}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        showSkeleton
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Film className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
                      {credit.vote_average && credit.vote_average > 0 && (
                        <span className="flex items-center gap-1 text-xs text-white font-semibold">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {credit.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium line-clamp-2 text-foreground/80 group-hover:text-foreground transition-colors">
                    {credit.title || credit.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(credit.release_date || credit.first_air_date)
                      ? new Date(credit.release_date || credit.first_air_date || "").getFullYear()
                      : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            PHOTO GALLERY
        ═══════════════════════════════════════ */}
        {photos.length > 1 && (
          <section className="mt-10">
            <h2 className="section-title mb-4">Photos</h2>
            <div className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory">
              {photos.map((photo: { file_path: string }, i: number) => (
                <div
                  key={`photo-${i}`}
                  className="flex-shrink-0 w-28 md:w-36 snap-start rounded-xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all aspect-[2/3]"
                >
                  <Image
                    src={getImageUrl(photo.file_path, "w342") || ""}
                    alt={`${person.name} photo ${i + 1}`}
                    width={185}
                    height={278}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
            FILMOGRAPHY TABS
        ═══════════════════════════════════════ */}
        {(movies.length > 0 || tvShows.length > 0 || directedMovies.length > 0) && (
          <section className="mt-10 mb-12">
            <h2 className="section-title mb-4">{t("person.filmography", "Filmography")}</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 gap-1">
                {movies.length > 0 && (
                  <TabsTrigger value="movies" className="gap-2">
                    <Film className="h-4 w-4" />
                    {t("person.movies")} <span className="ml-1 opacity-60">({movies.length})</span>
                  </TabsTrigger>
                )}
                {tvShows.length > 0 && (
                  <TabsTrigger value="tv" className="gap-2">
                    <Tv className="h-4 w-4" />
                    {t("person.tvSeries")} <span className="ml-1 opacity-60">({tvShows.length})</span>
                  </TabsTrigger>
                )}
                {directedMovies.length > 0 && (
                  <TabsTrigger value="directed" className="gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Directed <span className="ml-1 opacity-60">({directedMovies.length})</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="movies">
                {movies.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {movies.map((movie) => (
                      <MediaCard
                        key={`movie-${movie.id}-${movie.credit_id}`}
                        media={{ ...movie, media_type: "movie" }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">{t("person.noMovies")}</p>
                )}
              </TabsContent>

              <TabsContent value="tv">
                {tvShows.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {tvShows.map((show) => (
                      <MediaCard
                        key={`tv-${show.id}-${show.credit_id}`}
                        media={{ ...show, media_type: "tv" }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">{t("person.noTvSeries")}</p>
                )}
              </TabsContent>

              {directedMovies.length > 0 && (
                <TabsContent value="directed">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {directedMovies.map((movie) => (
                      <MediaCard
                        key={`directed-${movie.id}-${movie.credit_id}`}
                        media={{ ...movie, media_type: "movie" }}
                      />
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </section>
        )}

        {movies.length === 0 && tvShows.length === 0 && (
          <div className="py-16 text-center">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("person.noCredits")}</p>
          </div>
        )}
      </div>
    </>
  );
}
