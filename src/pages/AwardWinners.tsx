import React from "react";
import { useQuery } from "@tanstack/react-query";
import { discoverMovies, discoverTV, getPersonDetails, searchPeople } from "@/services/tmdb";
import { MediaCard } from "@/components/MediaCard";
import type { Media } from "@/types/media";
import MovieSkeleton from "@/components/ui/MovieSkeleton";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { useState, useMemo } from "react";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { applySafetyFilter } from "@/lib/contentFilter";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { useTranslation } from "react-i18next";

export default function AwardWinners() {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear() - 1,
  );
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);


  // Category filter (Oscar, Emmy, Golden Globe, etc.)
  const [selectedCategory, setSelectedCategory] = useState<string>("oscar");
  const categoryOptions = [
    { value: "oscar", label: t("awards.categoryOscar", "Oscar"), enabled: true },
    { value: "emmy", label: t("awards.categoryEmmy", "Emmy"), enabled: true },
    { value: "golden_globe", label: t("awards.categoryGoldenGlobe", "Golden Globe"), enabled: true },
    { value: "bafta", label: t("awards.categoryBafta", "BAFTA"), enabled: false },
  ];

  // Ceremony filter (for demo, just year for now)
  const years = Array.from({ length: 20 }, (_, i) => selectedYear - i);
  const [selectedCeremony, setSelectedCeremony] = useState<number>(selectedYear);

  // Actor filter (searchable)
  const [actorQuery, setActorQuery] = useState("");
  const [selectedActor, setSelectedActor] = useState<string>("");
  const [actorOptions, setActorOptions] = useState<{ id: number; name: string }[]>([]);

  // Actor search effect
  React.useEffect(() => {
    let ignore = false;
    if (actorQuery.length < 2) {
      setActorOptions([]);
      return;
    }
    searchPeople(actorQuery).then((res) => {
      if (!ignore) {
        setActorOptions(res.results.map((p) => ({ id: p.id, name: p.name })));
      }
    });
    return () => {
      ignore = true;
    };
  }, [actorQuery]);

  // Fetch Oscar-nominated movies (using high vote average + vote count as proxy)
  const { data: oscarMovies, isLoading: loadingOscar, isError: isOscarError, error: oscarError } = useQuery({
    queryKey: ["oscar-winners", selectedYear, includeAdult],
    queryFn: async () => {
      const results = await discoverMovies({
        page: 1,
        primary_release_year: selectedYear.toString(),
        sort_by: "vote_average.desc",
        vote_count_gte: "200",
        include_adult: includeAdult ? "true" : "false",
      });
      return applySafetyFilter(
        results.results || [],
        strictFiltering,
        moderateFiltering,
      ).slice(0, 12);
    },
  });

  // Fetch Emmy-nominated shows (using high vote average as proxy)
  const { data: emmyShows, isLoading: loadingEmmy, isError: isEmmyError, error: emmyError } = useQuery({
    queryKey: ["emmy-winners", selectedYear, includeAdult],
    queryFn: async () => {
      const results = await discoverTV({
        page: 1,
        first_air_date_year: selectedYear.toString(),
        sort_by: "vote_average.desc",
        include_adult: includeAdult ? "true" : "false",
      });
      return applySafetyFilter(
        results.results || [],
        strictFiltering,
        moderateFiltering,
      ).slice(0, 12);
    },
  });

  // Fetch critically acclaimed movies (Golden Globe style)
  const { data: criticallyAcclaimed, isLoading: loadingCritical, isError: isCriticalError, error: criticalError } = useQuery({
    queryKey: ["critically-acclaimed", selectedYear, includeAdult],
    queryFn: async () => {
      const results = await discoverMovies({
        page: 1,
        primary_release_year: selectedYear.toString(),
        sort_by: "popularity.desc",
        include_adult: includeAdult ? "true" : "false",
      });
      return applySafetyFilter(
        results.results || [],
        strictFiltering,
        moderateFiltering,
      ).slice(0, 12);
    },
  });

  const { data: selectedActorDetails } = useQuery({
    queryKey: ["awards-selected-actor", selectedActor, includeAdult],
    queryFn: () => getPersonDetails(Number(selectedActor)),
    enabled: Boolean(selectedActor),
  });

  const actorMediaIds = useMemo(() => {
    if (!selectedActorDetails?.combined_credits) return null;
    const ids = new Set<number>();
    selectedActorDetails.combined_credits.cast.forEach((credit) => {
      if (typeof credit.id === "number") ids.add(credit.id);
    });
    return ids;
  }, [selectedActorDetails]);

  const applyActorFilter = <T extends { id: number }>(items: T[] | undefined) => {
    if (!items) return [] as T[];
    if (!actorMediaIds) return items;
    return items.filter((item) => actorMediaIds.has(item.id));
  };

  const filteredOscarMovies = applyActorFilter(oscarMovies);
  const filteredEmmyShows = applyActorFilter(emmyShows);
  const filteredCritical = applyActorFilter(criticallyAcclaimed);

  const categoryToTab: Record<string, "oscars" | "emmys" | "critical"> = {
    oscar: "oscars",
    emmy: "emmys",
    golden_globe: "critical",
  };
  const activeTab = categoryToTab[selectedCategory] || "oscars";
  const categoryImplemented = selectedCategory !== "bafta";

  const awardsLoadingTimedOut = useLoadingTimeout(
    loadingOscar || loadingEmmy || loadingCritical,
    12000,
  );

  const renderGrid = (
    items: Media[],
    loading: boolean,
    emptyMessage: string,
    hasError?: boolean,
    errorMessage?: string,
  ) => {
    if (loading) {
      return (
        <div className="media-grid">
          {[...Array(12)].map((_, i) => (
            <MovieSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (hasError || awardsLoadingTimedOut) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center text-destructive">
          {awardsLoadingTimedOut
            ? t("awards.loadingTimeout", "Loading award contenders took too long. Please try again.")
            : errorMessage || t("awards.loadFailed", "Failed to load award contenders.")}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-border/50 bg-card/40 p-8 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="media-grid">
        {items.map((item) => (
          <MediaCard key={item.id} media={item} />
        ))}
      </div>
    );
  };

  return (
    <>
      <SEO
        title={t("awards.seoTitle", "Award Winners & Nominees")}
        description={t("awards.seoDescription", "Explore Oscar, Emmy, and critically acclaimed movies and TV shows")}
        canonical="https://cinetrekker.vercel.app/awards"
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="mb-6 flex items-start gap-3 sm:items-center">
          <Award className="h-8 w-8 text-primary" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t("awards.title", "Award Winners & Nominees")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("awards.subtitle", "Celebrating excellence in film and television")}
            </p>
          </div>
        </div>


        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Category Filter */}
          <div className="min-w-0">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">{t("awards.filterCategory", "Category")}</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("awards.selectCategory", "Select category")} />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} disabled={!cat.enabled}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Ceremony Filter (Year) */}
          <div className="min-w-0">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">{t("awards.filterCeremony", "Ceremony")}</label>
            <Select value={selectedCeremony.toString()} onValueChange={(v) => { setSelectedCeremony(Number(v)); setSelectedYear(Number(v)); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("awards.selectYear", "Select year")} />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Actor Filter */}
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">{t("awards.filterActor", "Actor")}</label>
            <Select value={selectedActor} onValueChange={setSelectedActor}>
              <SelectTrigger>
                <SelectValue placeholder={t("awards.searchActor", "Search actor")} />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1">
                  <input
                    className="mb-1 w-full rounded bg-neutral-800 px-2 py-2 text-sm text-white"
                    placeholder={t("awards.typeToSearch", "Type to search...")}
                    value={actorQuery}
                    onChange={(e) => setActorQuery(e.target.value)}
                  />
                </div>
                {actorOptions.length === 0 && actorQuery.length >= 2 ? (
                  <div className="px-2 py-1 text-xs text-neutral-400">{t("awards.noResults", "No results")}</div>
                ) : (
                  actorOptions.map((actor) => (
                    <SelectItem key={actor.id} value={actor.id.toString()}>{actor.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!categoryImplemented && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            {t("awards.baftaComingSoon", "BAFTA filtering is coming soon. For now, use Oscar, Emmy, or Golden Globe.")}
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "oscars") setSelectedCategory("oscar");
            if (value === "emmys") setSelectedCategory("emmy");
            if (value === "critical") setSelectedCategory("golden_globe");
          }}
          className="w-full"
        >
          <TabsList className="mb-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-0">
            <TabsTrigger value="oscars">{t("awards.tabsOscar", "Oscar Contenders")}</TabsTrigger>
            <TabsTrigger value="emmys">{t("awards.tabsEmmy", "Emmy Contenders")}</TabsTrigger>
            <TabsTrigger value="critical">{t("awards.tabsCritical", "Critically Acclaimed")}</TabsTrigger>
          </TabsList>

          <TabsContent value="oscars">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                {t("awards.oscarHeading", "Academy Award Contenders {{year}}", { year: selectedYear })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("awards.oscarDescription", "Top-rated films from {{year}} eligible for Oscar consideration", { year: selectedYear })}
              </p>
            </div>

            {renderGrid(
              filteredOscarMovies,
              loadingOscar,
              selectedActor
                ? t("awards.noOscarWithActor", "No Oscar contenders matched the selected actor and filters.")
                : t("awards.noOscarForYear", "No Oscar contenders found for this year."),
              isOscarError,
              (oscarError as Error | undefined)?.message,
            )}
          </TabsContent>

          <TabsContent value="emmys">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                {t("awards.emmyHeading", "Emmy Award Contenders {{year}}", { year: selectedYear })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("awards.emmyDescription", "Top-rated series from {{year}} eligible for Emmy consideration", { year: selectedYear })}
              </p>
            </div>

            {renderGrid(
              filteredEmmyShows,
              loadingEmmy,
              selectedActor
                ? t("awards.noEmmyWithActor", "No Emmy contenders matched the selected actor and filters.")
                : t("awards.noEmmyForYear", "No Emmy contenders found for this year."),
              isEmmyError,
              (emmyError as Error | undefined)?.message,
            )}
          </TabsContent>

          <TabsContent value="critical">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                {t("awards.criticalHeading", "Critically Acclaimed {{year}}", { year: selectedYear })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("awards.criticalDescription", "Highest-rated and most popular films from {{year}}", { year: selectedYear })}
              </p>
            </div>

            {renderGrid(
              filteredCritical,
              loadingCritical,
              selectedActor
                ? t("awards.noCriticalWithActor", "No Golden Globe-style contenders matched the selected actor and filters.")
                : t("awards.noCriticalForYear", "No critically acclaimed titles found for this year."),
              isCriticalError,
              (criticalError as Error | undefined)?.message,
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
