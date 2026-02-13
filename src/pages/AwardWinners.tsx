import { useQuery } from '@tanstack/react-query';
import { discoverMovies, discoverTV } from '@/services/tmdb';
import { MediaCard } from '@/components/MediaCard';
import MovieSkeleton from '@/components/ui/MovieSkeleton';
import { SEO } from '@/components/SEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Award from 'lucide-react/dist/esm/icons/award';
import { useState } from 'react';

export default function AwardWinners() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  
  const years = Array.from({ length: 20 }, (_, i) => selectedYear - i);

  // Fetch Oscar-nominated movies (using high vote average + vote count as proxy)
  const { data: oscarMovies, isLoading: loadingOscar } = useQuery({
    queryKey: ['oscar-winners', selectedYear],
    queryFn: async () => {
      const results = await discoverMovies({
        page: 1,
        'primary_release_year': selectedYear.toString(),
        'sort_by': 'vote_average.desc',
      });
      return results.results.slice(0, 12);
    }
  });

  // Fetch Emmy-nominated shows (using high vote average as proxy)
  const { data: emmyShows, isLoading: loadingEmmy } = useQuery({
    queryKey: ['emmy-winners', selectedYear],
    queryFn: async () => {
      const results = await discoverTV({
        page: 1,
        'first_air_date_year': selectedYear.toString(),
        'sort_by': 'vote_average.desc',
      });
      return results.results.slice(0, 12);
    }
  });

  // Fetch critically acclaimed movies (Golden Globe style)
  const { data: criticallyAcclaimed, isLoading: loadingCritical } = useQuery({
    queryKey: ['critically-acclaimed', selectedYear],
    queryFn: async () => {
      const results = await discoverMovies({
        page: 1,
        'primary_release_year': selectedYear.toString(),
        'sort_by': 'popularity.desc',
      });
      return results.results.slice(0, 12);
    }
  });

  return (
    <>
      <SEO 
        title="Award Winners & Nominees"
        description="Explore Oscar, Emmy, and critically acclaimed movies and TV shows"
      />
      
      <div className="page-container pt-20 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Award Winners & Nominees</h1>
            <p className="text-muted-foreground mt-1">
              Celebrating excellence in film and television
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {years.map(year => (
            <Badge
              key={year}
              variant={selectedYear === year ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Badge>
          ))}
        </div>

        <Tabs defaultValue="oscars" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="oscars">Oscar Contenders</TabsTrigger>
            <TabsTrigger value="emmys">Emmy Contenders</TabsTrigger>
            <TabsTrigger value="critical">Critically Acclaimed</TabsTrigger>
          </TabsList>

          <TabsContent value="oscars">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Academy Award Contenders {selectedYear}</h2>
              <p className="text-sm text-muted-foreground">
                Top-rated films from {selectedYear} eligible for Oscar consideration
              </p>
            </div>
            
            {loadingOscar ? (
              <div className="media-grid">
                {[...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
              </div>
            ) : (
              <div className="media-grid">
                {oscarMovies?.map(movie => (
                  <MediaCard key={movie.id} media={movie} mediaType="movie" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="emmys">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Emmy Award Contenders {selectedYear}</h2>
              <p className="text-sm text-muted-foreground">
                Top-rated series from {selectedYear} eligible for Emmy consideration
              </p>
            </div>
            
            {loadingEmmy ? (
              <div className="media-grid">
                {[...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
              </div>
            ) : (
              <div className="media-grid">
                {emmyShows?.map(show => (
                  <MediaCard key={show.id} media={show} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="critical">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Critically Acclaimed {selectedYear}</h2>
              <p className="text-sm text-muted-foreground">
                Highest-rated and most popular films from {selectedYear}
              </p>
            </div>
            
            {loadingCritical ? (
              <div className="media-grid">
                {[...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
              </div>
            ) : (
              <div className="media-grid">
                {criticallyAcclaimed?.map(movie => (
                  <MediaCard key={movie.id} media={movie} mediaType="movie" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
