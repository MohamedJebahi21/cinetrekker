import { CalendarDays, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AsyncSection } from '@/components/state/AsyncSection';
import { getImageUrl } from '@/services/tmdb';

interface ActorMatchItem {
  id: number;
  name: string;
  profile_path: string | null;
}

interface ActorMatchesSectionProps {
  title: string;
  sameBirthdayTitle: string;
  sameAgeTitle: string;
  noDateMessage: string;
  noMatchesMessage: string;
  loading: boolean;
  hasDateOfBirth: boolean;
  sameBirthday: ActorMatchItem[];
  sameAge: ActorMatchItem[];
}

function MatchGrid({ items, noMatchesMessage }: { items: ActorMatchItem[]; noMatchesMessage: string }) {
  return (
    <AsyncSection
      isLoading={false}
      isError={false}
      isEmpty={items.length === 0}
      loadingFallback={null}
      emptyFallback={<p className="text-sm text-neutral-500">{noMatchesMessage}</p>}
    >
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 6).map((person) => (
          <Link key={person.id} to={`/person/${person.id}`} className="group" aria-label={`Open ${person.name}`}>
            <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800/40 transition-colors group-hover:border-red-500/50">
              {person.profile_path ? (
                <img
                  src={getImageUrl(person.profile_path, 'w185') || ''}
                  alt={person.name}
                  className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-neutral-800">
                  <UserIcon className="h-6 w-6 text-neutral-600" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-neutral-300">{person.name}</p>
          </Link>
        ))}
      </div>
    </AsyncSection>
  );
}

export function ActorMatchesSection({
  title,
  sameBirthdayTitle,
  sameAgeTitle,
  noDateMessage,
  noMatchesMessage,
  loading,
  hasDateOfBirth,
  sameBirthday,
  sameAge,
}: ActorMatchesSectionProps) {
  const loadingFallback = (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg bg-neutral-800/40 animate-pulse">
          <div className="h-32 w-full bg-neutral-800" />
          <div className="mx-2 mb-2 mt-2 h-8 rounded bg-neutral-800" />
        </div>
      ))}
    </div>
  );

  if (!hasDateOfBirth) {
    return (
      <section aria-label={title}>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">{title}</h2>
        <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-neutral-400">{noDateMessage}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <CalendarDays className="h-4 w-4 text-red-500" aria-hidden="true" />
              {sameBirthdayTitle}
            </h3>
            <AsyncSection
              isLoading={loading}
              isError={false}
              isEmpty={false}
              loadingFallback={loadingFallback}
              emptyFallback={null}
            >
              <MatchGrid items={sameBirthday} noMatchesMessage={noMatchesMessage} />
            </AsyncSection>
          </CardContent>
        </Card>

        <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <UserIcon className="h-4 w-4 text-red-500" aria-hidden="true" />
              {sameAgeTitle}
            </h3>
            <AsyncSection
              isLoading={loading}
              isError={false}
              isEmpty={false}
              loadingFallback={loadingFallback}
              emptyFallback={null}
            >
              <MatchGrid items={sameAge} noMatchesMessage={noMatchesMessage} />
            </AsyncSection>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
