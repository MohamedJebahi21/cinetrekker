import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink, Film, MapPin, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import { FilmingLocationsMap } from "@/components/FilmingLocationsMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CURATED_FILMING_LOCATIONS } from "@/data/filmingLocationsDataset";
import { getTrending } from "@/services/tmdb";
import { buildCanonicalUrl, buildMediaPath, toBreadcrumbJsonLd } from "@/lib/seo";
import { useContentPolicy } from "@/contexts/content-policy-context";

const ERA_OPTIONS = [
  { key: "all", label: "All eras" },
  { key: "classic", label: "Classic" },
  { key: "modern", label: "Modern" },
];

export default function Locations() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [eraFilter, setEraFilter] = useState<string>("all");

  const { data: trendingTitles } = useQuery({
    queryKey: ["locations-page-trending", language, includeAdult],
    queryFn: () => getTrending("all", "week", language, 1, includeAdult),
  });

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          CURATED_FILMING_LOCATIONS.flatMap((entry) =>
            entry.locations.map((location) => location.country),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const locationRecords = useMemo(
    () =>
      CURATED_FILMING_LOCATIONS.map((entry) => {
        const releaseHint =
          entry.tmdbId && entry.tmdbId > 500000 ? "modern" : "classic";

        return {
          ...entry,
          releaseHint,
        };
      }).filter((entry) => {
        const matchesCountry =
          countryFilter === "all" ||
          entry.locations.some((location) => location.country === countryFilter);
        const matchesEra = eraFilter === "all" || entry.releaseHint === eraFilter;
        return matchesCountry && matchesEra;
      }),
    [countryFilter, eraFilter],
  );

  const mapPoints = useMemo(
    () =>
      locationRecords.flatMap((entry, index) =>
        entry.locations.map((location, locationIndex) => ({
          id: `${entry.mediaType}-${entry.tmdbId ?? index}-${locationIndex}`,
          title: entry.title,
          ...location,
        })),
      ),
    [locationRecords],
  );

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("locations.seoTitle", "Filming Locations Map | CineTrekker")}
        description={t(
          "locations.seoDescription",
          "Explore iconic filming locations, cinematic travel ideas, and map-first discovery on CineTrekker.",
        )}
        canonical={buildCanonicalUrl("/locations")}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("nav.locations", "Locations"), path: "/locations" },
          ]),
        ]}
      />

      <div className="page-container space-y-8 pb-24 pt-20 md:pb-10">
        <section className="ct-panel-strong overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
            <div>
              <p className="ct-kicker mb-3 text-primary/80">
                {t("locations.kicker", "Cine tourism, not just another TMDB wrapper")}
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                {t("locations.title", "Explore where your favorite films were made")}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t(
                  "locations.subtitle",
                  "Browse a first-class filming locations hub with a global map, country filters, scene notes, and direct jumps into the titles behind each stop.",
                )}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="btn-primary-glow">
                  <a href="#map-mode">{t("locations.jumpToMap", "Open Map Mode")}</a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/discover">{t("locations.backToDiscover", "Back to Discover")}</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: MapPin,
                  title: t("locations.signal.cities", "Real places"),
                  body: t("locations.signal.citiesBody", "Browse curated city, landmark, and landscape stops."),
                },
                {
                  icon: Compass,
                  title: t("locations.signal.routes", "Travel hooks"),
                  body: t("locations.signal.routesBody", "Jump from title discovery into real-world route planning."),
                },
                {
                  icon: Sparkles,
                  title: t("locations.signal.unique", "The product moat"),
                  body: t("locations.signal.uniqueBody", "Locations are now a first-class path, not buried detail-page trivia."),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/60 bg-card/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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

        <section className="ct-panel space-y-5" id="map-mode">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {t("locations.mapMode", "Map Mode")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {t(
                  "locations.mapModeBody",
                  "Filter the curated set by country or era, then pan across the map to jump into each title's filming trail.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
                className="min-h-[44px] rounded-xl border border-border/60 bg-card/70 px-4 text-sm text-foreground"
                aria-label={t("locations.filterCountry", "Filter by country")}
              >
                <option value="all">{t("locations.allCountries", "All countries")}</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <div className="ct-toggle-group">
                {ERA_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setEraFilter(option.key)}
                    className={`ct-toggle-button ${eraFilter === option.key ? "ct-toggle-button-active" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FilmingLocationsMap points={mapPoints} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <div className="ct-panel space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {t("locations.curatedTrips", "Curated cinematic stops")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "locations.curatedTripsBody",
                    "Each card links back to the title route so locations discovery feeds directly into tracking and planning.",
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                {locationRecords.length} {t("locations.routes", "routes")}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {locationRecords.map((record, index) => {
                const primaryLocation = record.locations[0];
                const detailsPath = buildMediaPath(
                  record.mediaType,
                  record.tmdbId ?? index,
                  record.title,
                );

                return (
                  <article
                    key={`${record.mediaType}-${record.tmdbId ?? record.title}`}
                    className="rounded-3xl border border-border/60 bg-card/60 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="ct-kicker mb-2 text-primary/80">
                          {record.mediaType === "movie" ? "Movie route" : "Series route"}
                        </p>
                        <h3 className="text-xl font-semibold text-foreground">{record.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {primaryLocation.label} and {Math.max(record.locations.length - 1, 0)} more stop
                          {record.locations.length === 1 ? "" : "s"}.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full capitalize">
                        {record.releaseHint}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      {record.locations.slice(0, 3).map((location) => (
                        <div
                          key={`${record.title}-${location.label}`}
                          className="rounded-2xl border border-border/50 bg-background/35 px-4 py-3"
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            {location.label}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{location.scene}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {record.tmdbId ? (
                        <Button asChild size="sm" className="btn-primary-glow">
                          <Link to={`/${record.mediaType}/${record.tmdbId}/locations`}>
                            {t("locations.openTrail", "Open location trail")}
                          </Link>
                        </Button>
                      ) : null}
                      {record.tmdbId ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to={detailsPath}>{t("locations.openTitle", "Open title")}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="ct-panel space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {t("locations.trendingTieIn", "Titles to pair with map mode")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(
                    "locations.trendingTieInBody",
                    "Use the weekly pulse to move from hype to real places without leaving the product loop.",
                  )}
                </p>
              </div>
              <div className="space-y-3">
                {(trendingTitles?.results || []).slice(0, 5).map((item) => (
                  <Link
                    key={`location-trending-${item.id}`}
                    to={buildMediaPath(item.media_type === "tv" ? "tv" : "movie", item.id, item.title || item.name || "")}
                    className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/35 px-4 py-3 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-background/55"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title || item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.media_type === "tv" ? "TV" : "Movie")} • {item.vote_average.toFixed(1)}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="ct-panel space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {t("locations.productPromise", "What this hub does")}
                </h2>
              </div>
              {[
                t("locations.promise1", "Makes filming locations discoverable before users ever hit a detail page."),
                t("locations.promise2", "Connects movie tracking with travel-first exploration, which is the app's clearest moat."),
                t("locations.promise3", "Creates a distinct route the rest of the product can keep reinforcing from home, discover, and detail pages."),
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Film className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{line}</p>
                </div>
              ))}
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
