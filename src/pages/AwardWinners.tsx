import React from "react";
import { useQuery } from "@tanstack/react-query";
import { discoverMovies, discoverTV } from "@/services/tmdb";
import { MediaCard } from "@/components/MediaCard";
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
import { getMovieGenres, getTVGenres, searchPeople } from "@/services/tmdb";

export default function AwardWinners() {
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear() - 1,
  );
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);


  // Category filter (Oscar, Emmy, Golden Globe, etc.)
  const [selectedCategory, setSelectedCategory] = useState<string>("oscar");
  const categoryOptions = [
    { value: "oscar", label: "Oscar" },
    { value: "emmy", label: "Emmy" },
    { value: "golden_globe", label: "Golden Globe" },
    { value: "bafta", label: "BAFTA" },
  ];

  // Ceremony filter (for demo, just year for now)
  const years = Array.from({ length: 20 }, (_, i) => selectedYear - i);
  const [selectedCeremony, setSelectedCeremony] = useState<number>(selectedYear);

  // Actor filter (searchable)
  const [actorQuery, setActorQuery] = useState("");
  const [selectedActor, setSelectedActor] = useState<string>("");
  const [actorOptions, setActorOptions] = useState<{ id: number; name: string }[]>([]);

  // Fetch genres for category filter (optional, not shown in UI for now)
  // const { data: movieGenres } = useQuery(["movie-genres"], () => getMovieGenres());
  // const { data: tvGenres } = useQuery(["tv-genres"], () => getTVGenres());

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
  const { data: oscarMovies, isLoading: loadingOscar } = useQuery({
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
  const { data: emmyShows, isLoading: loadingEmmy } = useQuery({
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
  const { data: criticallyAcclaimed, isLoading: loadingCritical } = useQuery({
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

  return (
    <>
      <SEO
        title="Award Winners & Nominees"
        description="Explore Oscar, Emmy, and critically acclaimed movies and TV shows"
        canonical="https://cinetrekker.vercel.app/awards"
      />

      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="flex items-center gap-3 mb-6">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Award Winners & Nominees</h1>
            <p className="text-muted-foreground mt-1">
              Celebrating excellence in film and television
            </p>
          </div>
        </div>


        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          {/* Category Filter */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Ceremony Filter (Year) */}
          <div className="min-w-[120px]">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">Ceremony</label>
            <Select value={selectedCeremony.toString()} onValueChange={(v) => { setSelectedCeremony(Number(v)); setSelectedYear(Number(v)); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Actor Filter */}
          <div className="min-w-[200px]">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">Actor</label>
            <Select value={selectedActor} onValueChange={setSelectedActor}>
              <SelectTrigger>
                <SelectValue placeholder="Search actor" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1">
                  <input
                    className="w-full px-2 py-1 rounded bg-neutral-800 text-sm text-white mb-1"
                    placeholder="Type to search..."
                    value={actorQuery}
                    onChange={(e) => setActorQuery(e.target.value)}
                  />
                </div>
                {actorOptions.length === 0 && actorQuery.length >= 2 ? (
                  <div className="px-2 py-1 text-xs text-neutral-400">No results</div>
                ) : (
                  actorOptions.map((actor) => (
                    <SelectItem key={actor.id} value={actor.id.toString()}>{actor.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="oscars" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="oscars">Oscar Contenders</TabsTrigger>
            <TabsTrigger value="emmys">Emmy Contenders</TabsTrigger>
            <TabsTrigger value="critical">Critically Acclaimed</TabsTrigger>
          </TabsList>

          <TabsContent value="oscars">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                Academy Award Contenders {selectedYear}
              </h2>
              <p className="text-sm text-muted-foreground">
                Top-rated films from {selectedYear} eligible for Oscar
                consideration
              </p>
            </div>

            {loadingOscar ? (
              <div className="media-grid">
                {[...Array(12)].map((_, i) => (
                  <MovieSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="media-grid">
                {oscarMovies?.map((movie) => (
                  <MediaCard key={movie.id} media={movie} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="emmys">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                Emmy Award Contenders {selectedYear}
              </h2>
              <p className="text-sm text-muted-foreground">
                Top-rated series from {selectedYear} eligible for Emmy
                consideration
              </p>
            </div>

            {loadingEmmy ? (
              <div className="media-grid">
                {[...Array(12)].map((_, i) => (
                  <MovieSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="media-grid">
                {emmyShows?.map((show) => (
                  <MediaCard key={show.id} media={show} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="critical">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                Critically Acclaimed {selectedYear}
              </h2>
              <p className="text-sm text-muted-foreground">
                Highest-rated and most popular films from {selectedYear}
              </p>
            </div>

            {loadingCritical ? (
              <div className="media-grid">
                {[...Array(12)].map((_, i) => (
                  <MovieSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="media-grid">
                {criticallyAcclaimed?.map((movie) => (
                  <MediaCard key={movie.id} media={movie} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
