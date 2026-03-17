import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { searchMulti } from '@/services/tmdb';
import { useCollections } from '@/hooks/useCollections';
import { useContentPolicy } from '@/contexts/content-policy-context';
import { applySafetyFilter } from '@/lib/contentFilter';
import { Media } from '@/types/media';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { toggle: toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const { data: collections = [] } = useCollections();
  const safeCollections = (Array.isArray(collections) ? (collections as unknown[]) : []).filter((value) => {
    return (
      !!value &&
      typeof value === 'object' &&
      'id' in value &&
      'name' in value &&
      typeof (value as { id?: unknown }).id === 'string' &&
      typeof (value as { name?: unknown }).name === 'string'
    );
  }) as Array<{ id: string; name: string }>;

  // Global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const onAppEscape = () => setOpen(false);
    window.addEventListener('app:escape', onAppEscape as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('app:escape', onAppEscape as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['cmdk-search', query, includeAdult],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const res = await searchMulti(query, 1, 'en', includeAdult);
      return applySafetyFilter(res.results || [], strictFiltering, moderateFiltering);
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const onSelectMedia = (item: Media) => {
    setOpen(false);
    if (!item) return;
    const mediaType = (item as { media_type?: string }).media_type;
    const type = mediaType === 'person' ? 'person' : (mediaType || (item.title ? 'movie' : 'tv'));
    if (type === 'person') navigate(`/person/${item.id}`);
    else navigate(`/${type}/${item.id}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="w-[min(680px,92vw)]">
        <CommandInput
          ref={inputRef}
          placeholder="Search movies, people, collections... (Cmd/Ctrl+K)"
          onValueChange={(val: string) => setQuery(val)}
        />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { toggleTheme(); setOpen(false); }}>
              Cycle Theme
              <CommandShortcut>⌘/Ctrl K</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/watchlist'); setOpen(false); }}>
              Go to Watchlist
            </CommandItem>
            <CommandItem onSelect={async () => { await signOut(); navigate('/'); setOpen(false); }}>
              Logout
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Collections">
            {safeCollections.length === 0 && <CommandItem disabled> No collections </CommandItem>}
            {safeCollections.map((c) => (
              <CommandItem key={c.id} onSelect={() => { navigate(`/watchlist?collection=${c.id}`); setOpen(false); }}>
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Search Results">
            {isFetching && <CommandItem disabled>Searching...</CommandItem>}
            {!isFetching && searchResults.slice(0, 10).map((r: Media) => (
              <CommandItem key={`${r.id}-${r.media_type || 'm'}`} onSelect={() => onSelectMedia(r)}>
                {r.title || r.name}
                <CommandShortcut>{r.media_type || (r.title ? 'Movie' : 'TV')}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
/* Duplicate alternative implementation removed — keep the primary CommandPalette above. */

