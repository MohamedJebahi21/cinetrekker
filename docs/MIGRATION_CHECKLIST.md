# CineTrekker Migration Checklist - Session 1

Complete this checklist to integrate the new query hooks into your existing components.

---

## Priority 1: Core Pages

### [ ] Watchlist Page (`src/pages/Watchlist.tsx`)
**Current Issue**: Uses `useUserLists()` for watchlist state
**Migration**:
```typescript
// Add import
import { useWatchlistQuery } from '@/hooks/useWatchlistQueries';

// Replace
const { watchlist } = useUserLists();

// With
const { data: watchlist = [], isLoading } = useWatchlistQuery();
```

**Update Details UI** to use remove mutation:
```typescript
import { useRemoveFromWatchlist } from '@/hooks/useWatchlistQueries';

const { mutate: removeFromWatchlist } = useRemoveFromWatchlist();

const handleRemove = () => {
  removeFromWatchlist({ mediaId: media.id, mediaType: media.media_type });
};
```

---

### [ ] Watched Page (`src/pages/Watched.tsx`)
**Current Issue**: Uses `useUserLists()` for watched state
**Migration**:
```typescript
// Add imports
import { 
  useWatchedQuery, 
  useRemoveFromWatched, 
  useUpdateWatched 
} from '@/hooks/useWatchedQueries';

// Replace
const { watched } = useUserLists();

// With
const { data: watched = [], isLoading } = useWatchedQuery();
```

**Update Rating/Note Editor**:
```typescript
const { mutate: updateWatched } = useUpdateWatched();

const handleUpdateRating = (rating: number) => {
  updateWatched({
    mediaId: media.id,
    mediaType: media.media_type,
    updates: { rating }
  });
};
```

---

### [ ] Details Page (`src/pages/Details.tsx`)
**Current Issue**: Uses `useUserLists()` for all state operations
**Migration**:
```typescript
// Add imports
import { 
  useAddToWatchlist, 
  useRemoveFromWatchlist, 
  useIsInWatchlist 
} from '@/hooks/useWatchlistQueries';
import { 
  useAddToWatched, 
  useRemoveFromWatched, 
  useIsWatched, 
  useGetWatchedItem 
} from '@/hooks/useWatchedQueries';
import { 
  useHideFromRecommendations, 
  useIsHiddenFromRecommendations 
} from '@/hooks/useHiddenRecommendationsQueries';

// Replace usage
const { addToWatchlist, watchlist, watched } = useUserLists();

// With multiple hooks
const { mutate: addToWatchlist } = useAddToWatchlist();
const { mutate: removeFromWatchlist } = useRemoveFromWatchlist();
const isInWatchlist = useIsInWatchlist(mediaId, mediaType);

const { mutate: addToWatched } = useAddToWatched();
const { mutate: removeFromWatched } = useRemoveFromWatched();
const isWatched = useIsWatched(mediaId, mediaType);
const watchedItem = useGetWatchedItem(mediaId, mediaType);

const { mutate: hideFromRecs } = useHideFromRecommendations();
const isHidden = useIsHiddenFromRecommendations(mediaId, mediaType);
```

---

## Priority 2: Components

### [ ] MediaCard Component (`src/components/MediaCard.tsx`)
**Update Watchlist Button**:
```typescript
import { useAddToWatchlist, useRemoveFromWatchlist, useIsInWatchlist } from '@/hooks/useWatchlistQueries';

function WatchlistButton({ media }) {
  const { mutate: addToWatchlist } = useAddToWatchlist();
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist();
  const isInWatchlist = useIsInWatchlist(media.id, media.media_type);

  const toggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist({ mediaId: media.id, mediaType: media.media_type });
    } else {
      addToWatchlist({ mediaId: media.id, mediaType: media.media_type });
    }
  };

  return <button onClick={toggle}>{isInWatchlist ? '✓' : '+'}</button>;
}
```

---

### [ ] BecauseYouLiked Component (`src/components/BecauseYouLiked.tsx`)
**Update Hidden Logic**:
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
      {isHidden ? 'Hidden' : 'Hide'}
    </button>
  );
}
```

---

### [ ] MediaPreviewModal Component (`src/components/MediaPreviewModal.tsx`)
**Update All Buttons**:
```typescript
// Replace useUserLists() with individual hooks from migration above
```

---

## Priority 3: Search Integration

### [ ] Search Page (`src/pages/Search.tsx`)
**Replace Manual Search**:
```typescript
// Old implementation (if any)
const [query, setQuery] = useState('');
const { data: searchResults } = useQuery({
  queryKey: ['search', query],
  queryFn: () => searchMulti(query),
});

// New implementation
import { useMultiSearch } from '@/hooks/useSearch';
import { SearchResultsSkeletons, MixedSearchSkeletons } from '@/components/SearchSkeletons';

const [query, setQuery] = useState('');
const { data: searchResults, isLoading } = useMultiSearch(query);

if (isLoading) return <SearchResultsSkeletons count={12} />;
```

**Add Actor Support**:
```typescript
const [searchType, setSearchType] = useState('all');

// Use appropriate hook based on type
const actorResults = usePeopleSearch(query, 1, language);

// Display actors if type includes 'person'
{actorResults.data?.results.map(actor => (
  <ActorCard key={actor.id} actor={actor} />
))}
```

---

## Priority 4: UserListsContext Deprecation

### [ ] Remove UserListsContext Dependency
**Once All Components Migrated**:
- Keep `UserListsContext` for backward compatibility
- Add deprecation warning to its hooks
- Schedule removal for Session 2

**Add Deprecation Warning**:
```typescript
export function useUserLists() {
  console.warn(
    'useUserLists is deprecated. Please use individual hooks instead:\n' +
    '- useWatchlistQuery, useAddToWatchlist, useRemoveFromWatchlist\n' +
    '- useWatchedQuery, useAddToWatched, useRemoveFromWatched, useUpdateWatched\n' +
    '- useHiddenRecommendationsQuery, useHideFromRecommendations'
  );
  // ... rest of implementation
}
```

---

## Testing After Migration

### Watchlist Tests
- [ ] Add item to watchlist → appears immediately
- [ ] Navigate to another page → watchlist persists
- [ ] Page refresh → watchlist still there
- [ ] Remove item → disappears immediately
- [ ] Network error → item restored

### Watched Tests
- [ ] Mark as watched → saved immediately
- [ ] Update rating → changes without page refresh
- [ ] Add note → persists across sessions
- [ ] Remove from watched → deleted optimistically

### Search Tests
- [ ] Type quickly → only one request (check Network tab)
- [ ] Clear search → skeletons show
- [ ] Select result → added to watchlist correctly
- [ ] Search results → contain movies, TV, and people

### Hidden Tests
- [ ] Hide recommendation → removed from UI
- [ ] Refresh page → still hidden
- [ ] Unhide → appears again
- [ ] Network error → restored

---

## Rollback Plan (If Issues Arise)

If you encounter breaking changes:

1. **Revert vite.config.ts**:
   ```bash
   git checkout vite.config.ts
   ```

2. **Keep Old Context**:
   - Keep `UserListsContext.tsx` unchanged
   - Don't migrate all components at once
   - Do it page by page

3. **Add Feature Flag**:
   ```typescript
   const USE_NEW_HOOKS = import.meta.env.VITE_USE_QUERY_HOOKS === 'true';
   
   if (USE_NEW_HOOKS) {
     // Use new hooks
   } else {
     // Use old context
   }
   ```

---

## Command Reference

### Check if all imports work
```bash
npm run lint
```

### Test build
```bash
npm run build
```

### Run dev server with CSP
```bash
npm run dev
```

### Check Network calls
1. Open DevTools Network tab
2. Filter by "Fetch/XHR"
3. Look for search requests (should be debounced)
4. Check headers for CSP policies

---

## Component Migration Status

Track your progress here:

```
Pages:
- [ ] Watchlist.tsx
- [ ] Watched.tsx
- [ ] Details.tsx
- [ ] Index.tsx (if uses recommendations)
- [ ] Search.tsx
- [ ] Recommendations.tsx

Components:
- [ ] MediaCard.tsx
- [ ] BecauseYouLiked.tsx
- [ ] MediaPreviewModal.tsx
- [ ] WatchedShowsNewEpisodes.tsx
- [ ] RecentlyAddedMovies.tsx
- [ ] RecentlyAddedEpisodes.tsx

Optional:
- [ ] SearchDropdown.tsx
- [ ] RandomTrekButton.tsx
```

---

## Support

If you encounter any issues:

1. Check `IMPLEMENTATION_GUIDE.md` for detailed info
2. Look for console warnings/errors
3. Check React Query DevTools for mutation/query status
4. Review the hook implementations in `src/hooks/`

Happy migrating! 🚀
