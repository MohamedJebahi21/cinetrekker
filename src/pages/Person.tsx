import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Calendar, MapPin, Film, Tv } from 'lucide-react';
import { getPersonDetails, getImageUrl } from '@/services/tmdb';
import { MediaCard } from '@/components/MediaCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Person() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const personId = parseInt(id || '0');

  const { data: person, isLoading, isError, error } = useQuery({
    queryKey: ['person', personId, language],
    queryFn: () => getPersonDetails(personId, language),
    enabled: !!personId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (isError || !person) {
    return (
      <div className="page-container text-center py-16">
        <p className="text-lg text-muted-foreground">{t('common.error')}</p>
        {error && <p className="text-sm text-destructive mt-2">{(error as Error).message}</p>}
      </div>
    );
  }

  // Extract movies and TV shows from combined_credits
  const movies = person.combined_credits?.cast
    ?.filter((credit) => credit.media_type === 'movie')
    .sort((a, b) => {
      const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
      const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 20) || [];

  const tvShows = person.combined_credits?.cast
    ?.filter((credit) => credit.media_type === 'tv')
    .sort((a, b) => {
      const dateA = a.first_air_date ? new Date(a.first_air_date).getTime() : 0;
      const dateB = b.first_air_date ? new Date(b.first_air_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 20) || [];

  const profileUrl = getImageUrl(person.profile_path, 'w500');
  const birthYear = person.birthday ? new Date(person.birthday).getFullYear() : null;
  const deathYear = person.deathday ? new Date(person.deathday).getFullYear() : null;

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="page-container pt-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('nav.home')}
        </Link>

        {/* Person Info */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Profile Image */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={person.name}
                className="w-48 md:w-64 rounded-xl shadow-2xl"
              />
            ) : (
              <div className="w-48 md:w-64 aspect-[2/3] bg-muted rounded-xl flex items-center justify-center">
                <span className="text-4xl text-muted-foreground">
                  {person.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">{person.name}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {person.known_for_department && (
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {person.known_for_department}
                </span>
              )}
              {birthYear && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {birthYear}{deathYear ? ` - ${deathYear}` : ''}
                </div>
              )}
              {person.place_of_birth && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {person.place_of_birth}
                </div>
              )}
            </div>

            {person.biography && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('person.biography')}</h2>
                <p className="text-muted-foreground leading-relaxed line-clamp-6">
                  {person.biography}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Filmography Tabs */}
        {(movies.length > 0 || tvShows.length > 0) && (
          <Tabs defaultValue="movies" className="mb-12">
            <TabsList className="mb-6">
              <TabsTrigger value="movies" className="gap-2">
                <Film className="w-4 h-4" />
                {t('person.movies')} ({movies.length})
              </TabsTrigger>
              <TabsTrigger value="tv" className="gap-2">
                <Tv className="w-4 h-4" />
                {t('person.tvSeries')} ({tvShows.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movies">
              {movies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {movies.map((movie) => (
                    <MediaCard 
                      key={`movie-${movie.id}-${movie.credit_id}`} 
                      media={{ ...movie, media_type: 'movie' }} 
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t('person.noMovies')}</p>
              )}
            </TabsContent>

            <TabsContent value="tv">
              {tvShows.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tvShows.map((show) => (
                    <MediaCard 
                      key={`tv-${show.id}-${show.credit_id}`} 
                      media={{ ...show, media_type: 'tv' }} 
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t('person.noTvSeries')}</p>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* No credits message */}
        {movies.length === 0 && tvShows.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t('person.noCredits')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
