# Quick Start Guide - Using New Hooks

Fast reference for common use cases. See `IMPLEMENTATION_GUIDE.md` for detailed docs.

---

## Adding to Watchlist

```typescript
import { useAddToWatchlist, useIsInWatchlist, useRemoveFromWatchlist } from '@/hooks/useWatchlistQueries';

function MyComponent({ media }) {
  const { mutate: addToWatchlist } = useAddToWatchlist();
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist();
  const isInWatchlist = useIsInWatchlist(media.id, 'movie');

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlist({ mediaId: media.id, mediaType: 'movie' });
    } else {
      addToWatchlist({ mediaId: media.id, mediaType: 'movie' });
    }
  };

  return (
    <button onClick={toggleWatchlist}>
      {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
    </button>
  );
}
```

---

## Marking as Watched

```typescript
import { useAddToWatched, useIsWatched, useGetWatchedItem } from '@/hooks/useWatchedQueries';

function MarkedWatchedButton({ media }) {
  const { mutate: addToWatched } = useAddToWatched();
  const isWatched = useIsWatched(media.id, 'tv');
  const watchedItem = useGetWatchedItem(media.id, 'tv');

  const handleMarkWatched = () => {
    addToWatched({
      mediaId: media.id,
      mediaType: 'tv',
      rating: 8,
      note: 'Great series!',
      status: 'completed'
    });
  };

  return (
    <div>
      <button onClick={handleMarkWatched}>Mark as Watched</button>
      {isWatched && watchedItem && (
        <div>⭐ {watchedItem.rating}/10</div>
      )}
    </div>
  );
}
```

---

## Updating Watched Item

```typescript
import { useUpdateWatched } from '@/hooks/useWatchedQueries';

function RatingEditor({ media }) {
  const { mutate: updateWatched } = useUpdateWatched();

  const handleSetRating = (rating: number) => {
    updateWatched({
      mediaId: media.id,
      mediaType: 'movie',
      updates: { rating }
    });
  };

  return (
    <div>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
        <button key={num} onClick={() => handleSetRating(num)}>
          {num} ⭐
        </button>
      ))}
    </div>
  );
}
```

---

## Searching (with Debounce)

```typescript
import { useMultiSearch } from '@/hooks/useSearch';
import { SearchResultsSkeletons } from '@/components/SearchSkeletons';

function SearchExample() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useMultiSearch(query);

  if (isLoading) return <SearchResultsSkeletons count={12} />;

  return (
    <div>
      <input 
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search movies, TV, actors..."
      />
      <div className="grid grid-cols-3 gap-4">
        {results?.results.map(item => (
          <div key={item.id}>
            <h3>{item.title || item.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Searching Movies Only

```typescript
import { useMovieSearch } from '@/hooks/useSearch';

const { data: movies, isLoading } = useMovieSearch(query);
```

---

## Searching TV Shows Only

```typescript
import { useTVSearch } from '@/hooks/useSearch';

const { data: shows, isLoading } = useTVSearch(query);
```

---

## Searching Actors

```typescript
import { usePeopleSearch } from '@/hooks/useSearch';

const { data: actors, isLoading } = usePeopleSearch(query);

// Render actors
{actors?.results.map(actor => (
  <div key={actor.id}>
    {actor.profile_path && (
      <img src={getImageUrl(actor.profile_path)} alt={actor.name} />
    )}
    <h4>{actor.name}</h4>
    <p>{actor.known_for_department}</p>
  </div>
))}
```

---

## Hiding from Recommendations

```typescript
import { useHideFromRecommendations, useIsHiddenFromRecommendations } from '@/hooks/useHiddenRecommendationsQueries';

function HideButton({ media }) {
  const { mutate: hideFromRecs } = useHideFromRecommendations();
  const isHidden = useIsHiddenFromRecommendations(media.id, media.media_type);

  return (
    <button 
      onClick={() => hideFromRecs({ mediaId: media.id, mediaType: media.media_type })}
      disabled={isHidden}
    >
      {isHidden ? '✓ Hidden' : 'Hide from Recommendations'}
    </button>
  );
}
```

---

## Fetching All Watchlist Items

```typescript
import { useWatchlistQuery } from '@/hooks/useWatchlistQueries';

function WatchlistPage() {
  const { data: watchlist = [], isLoading } = useWatchlistQuery();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1>My Watchlist ({watchlist.length})</h1>
      {watchlist.map(item => (
        <MediaCard 
          key={`${item.mediaType}-${item.mediaId}`}
          id={item.mediaId}
          type={item.mediaType}
        />
      ))}
    </div>
  );
}
```

---

## Fetching All Watched Items

```typescript
import { useWatchedQuery } from '@/hooks/useWatchedQueries';

function WatchedPage() {
  const { data: watched = [], isLoading } = useWatchedQuery();

  return (
    <div>
      {watched.map(item => (
        <div key={`${item.mediaType}-${item.mediaId}`}>
          <h3>{item.note}</h3>
          <p>⭐ {item.rating}/10</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Combining Multiple Operations

```typescript
import { 
  useAddToWatchlist, 
  useRemoveFromWatchlist,
  useIsInWatchlist 
} from '@/hooks/useWatchlistQueries';
import { 
  useAddToWatched,
  useRemoveFromWatched,
  useIsWatched 
} from '@/hooks/useWatchedQueries';

function CompleteMediaCard({ media }) {
  // Watchlist
  const { mutate: addWatchlist } = useAddToWatchlist();
  const { mutate: removeWatchlist } = useRemoveFromWatchlist();
  const inWatchlist = useIsInWatchlist(media.id, media.media_type);

  // Watched
  const { mutate: addWatched } = useAddToWatched();
  const { mutate: removeWatched } = useRemoveFromWatched();
  const watched = useIsWatched(media.id, media.media_type);

  return (
    <div>
      <button onClick={() => inWatchlist 
        ? removeWatchlist({ mediaId: media.id, mediaType: media.media_type })
        : addWatchlist({ mediaId: media.id, mediaType: media.media_type })
      }>
        {inWatchlist ? '✓' : '+'} Watchlist
      </button>

      <button onClick={() => watched
        ? removeWatched({ mediaId: media.id, mediaType: media.media_type })
        : addWatched({ mediaId: media.id, mediaType: media.media_type })
      }>
        {watched ? '✓' : '+'} Watched
      </button>
    </div>
  );
}
```

---

## Error Handling

All mutations automatically handle errors and rollback. Optional manual handling:

```typescript
import { useAddToWatchlist } from '@/hooks/useWatchlistQueries';

function SafeButton({ media }) {
  const { mutate: addToWatchlist, isError, error } = useAddToWatchlist();

  return (
    <div>
      <button onClick={() => addToWatchlist({ mediaId: media.id, mediaType: 'movie' })}>
        Add to Watchlist
      </button>
      {isError && <div className="error">{error?.message}</div>}
    </div>
  );
}
```

---

## Loading States

```typescript
import { useWatchlistQuery } from '@/hooks/useWatchlistQueries';

const { data, isLoading, isError } = useWatchlistQuery();

if (isLoading) return <Skeleton />;
if (isError) return <ErrorMessage />;
if (!data?.length) return <EmptyState />;

return <WatchlistGrid items={data} />;
```

---

## Common Patterns

### Pattern 1: Toggle Button
```typescript
const isActive = useIsInWatchlist(id, type);
const { mutate } = isActive ? useRemoveFromWatchlist() : useAddToWatchlist();
```

### Pattern 2: Conditional Rendering
```typescript
if (useIsWatched(id, type)) {
  return <RatingDisplay />;
} else {
  return <MarkAsWatchedButton />;
}
```

### Pattern 3: Form Integration
```typescript
const handleSubmit = (data) => {
  updateWatched({
    mediaId: media.id,
    mediaType: 'movie',
    updates: data // { rating, note, status }
  });
};
```

---

## Debugging Tips

### Check React Query DevTools
```bash
# Install if not already done
npm i @tanstack/react-query-devtools --save-dev

# Import in App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
<ReactQueryDevtools initialIsOpen={false} />
```

### Log Mutation Status
```typescript
const { mutate, status, data } = useAddToWatchlist();
console.log('Status:', status); // 'idle' | 'pending' | 'success' | 'error'
```

### Check Network Tab
- Open DevTools → Network tab
- Type in search box
- Should see requests debounced (max 1 per 300ms)

---

## Performance Tips

1. **Memoize Components** - Prevent unnecessary re-renders
   ```typescript
   const MyComponent = React.memo(({ media }) => {...});
   ```

2. **Use Select** - Only subscribe to needed data
   ```typescript
   const { data: ids } = useWatchlistQuery({
     select: data => data?.map(item => item.mediaId) || []
   });
   ```

3. **Disable Auto-Fetch** - When not needed
   ```typescript
   const { data } = useWatchlistQuery({ enabled: false });
   ```

---

## FAQ

**Q: Do I need to update UserListsContext?**
A: No, it still works. But new hooks are recommended for new code.

**Q: Will old context break?**
A: No, both work in parallel. Migrate when ready.

**Q: How to check if localStorage is persisted?**
A: Open DevTools → Application → Local Storage

**Q: Why isn't my search debouncing?**
A: Check Network tab. If many requests, may not be using `useSearch` hook.

**Q: Can I change debounce time?**
A: Yes, see `useSearch.ts` implementation (default 300ms).

**Q: How do I test optimistic updates?**
A: Open DevTools → Network → Throttle to "Slow 3G" and perform action.

---

## Next Steps

1. **Migrate one component** using this guide
2. **Test in browser** - Check Network tab for debouncing
3. **Check React Query DevTools** - Verify state management
4. **Read IMPLEMENTATION_GUIDE.md** - For detailed explanations
5. **Use MIGRATION_CHECKLIST.md** - For component-by-component migration

Happy coding! 🚀
