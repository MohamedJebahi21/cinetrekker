import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '@/services/tmdb';

type CastPerson = { id: number; name: string; character?: string; profile_path?: string | null };

export default function CastSection({ cast }: { cast?: CastPerson[] }) {
  if (!cast || cast.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="section-title">Cast</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
        {cast.slice(0, 12).map((person) => (
          <Link key={person.id} to={`/person/${person.id}`} className="flex-shrink-0 w-24 text-center group">
            {person.profile_path ? (
              <img src={getImageUrl(person.profile_path, 'w185') || ''} alt={person.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-2" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl text-muted-foreground">{person.name.charAt(0)}</span>
              </div>
            )}
            <p className="text-sm font-medium line-clamp-1">{person.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
