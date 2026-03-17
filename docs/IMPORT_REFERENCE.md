# Import Reference - Session 1 Hooks

Copy-paste these imports for the most common use cases.

---

## Watchlist Operations

```typescript
// Get watchlist
import { useWatchlistQuery } from '@/hooks/useWatchlistQueries';

// Add to watchlist
import { useAddToWatchlist } from '@/hooks/useWatchlistQueries';

// Remove from watchlist
import { useRemoveFromWatchlist } from '@/hooks/useWatchlistQueries';

// Check if in watchlist
import { useIsInWatchlist } from '@/hooks/useWatchlistQueries';

// All at once
import {
  useWatchlistQuery,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useIsInWatchlist,
} from '@/hooks/useWatchlistQueries';
```

---

## Watched Items Operations

```typescript
// Get all watched items
import { useWatchedQuery } from '@/hooks/useWatchedQueries';

// Add to watched
import { useAddToWatched } from '@/hooks/useWatchedQueries';

// Remove from watched
import { useRemoveFromWatched } from '@/hooks/useWatchedQueries';

// Update watched (rating, note, status)
import { useUpdateWatched } from '@/hooks/useWatchedQueries';

// Check if watched
import { useIsWatched } from '@/hooks/useWatchedQueries';

// Get watched item details
import { useGetWatchedItem } from '@/hooks/useWatchedQueries';

// All at once
import {
  useWatchedQuery,
  useAddToWatched,
  useRemoveFromWatched,
  useUpdateWatched,
  useIsWatched,
  useGetWatchedItem,
} from '@/hooks/useWatchedQueries';
```

---

## Hidden Recommendations Operations

```typescript
// Get all hidden recommendations
import { useHiddenRecommendationsQuery } from '@/hooks/useHiddenRecommendationsQueries';

// Hide a recommendation
import { useHideFromRecommendations } from '@/hooks/useHiddenRecommendationsQueries';

// Unhide a recommendation
import { useUnhideFromRecommendations } from '@/hooks/useHiddenRecommendationsQueries';

// Check if hidden
import { useIsHiddenFromRecommendations } from '@/hooks/useHiddenRecommendationsQueries';

// All at once
import {
  useHiddenRecommendationsQuery,
  useHideFromRecommendations,
  useUnhideFromRecommendations,
  useIsHiddenFromRecommendations,
} from '@/hooks/useHiddenRecommendationsQueries';
```

---

## Search Operations

```typescript
// Multi-type search (movies, TV, people)
import { useMultiSearch } from '@/hooks/useSearch';

// Movies only
import { useMovieSearch } from '@/hooks/useSearch';

// TV shows only
import { useTVSearch } from '@/hooks/useSearch';

// Actors/people only
import { usePeopleSearch } from '@/hooks/useSearch';

// Generic search hook (advanced)
import { useSearch } from '@/hooks/useSearch';

// All at once
import {
  useSearch,
  useMultiSearch,
  useMovieSearch,
  useTVSearch,
  usePeopleSearch,
} from '@/hooks/useSearch';
```

---

## UI Components

```typescript
// All search skeleton loaders
import {
  MediaSearchSkeleton,
  SearchResultsSkeletons,
  PersonSearchSkeleton,
  PersonSearchResultsSkeletons,
  MixedSearchSkeletons,
} from '@/components/SearchSkeletons';
```

---

## Utility Functions

```typescript
// Request cancellation
import { RequestCanceller } from '@/lib/requestUtils';

// Request throttling
import { RequestThrottler } from '@/lib/requestUtils';

// Debounce hook
import { useDebounce } from '@/lib/requestUtils';

// Create debounced callback
import { createDebouncedCallback } from '@/lib/requestUtils';
```

---

## Types

```typescript
import { UserMediaItem } from '@/types/media';
import { HiddenRecommendation } from '@/types/media';
import { PersonSearchResult } from '@/types/media';
import { Media } from '@/types/media';
import { TMDBResponse } from '@/types/media';
```

---

## Complete Setup Example

```typescript
// src/pages/MyPage.tsx
import { useState } from 'react';
import {
  useWatchlistQuery,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useIsInWatchlist,
} from '@/hooks/useWatchlistQueries';
import {
  useWatchedQuery,
  useAddToWatched,
  useUpdateWatched,
  useIsWatched,
} from '@/hooks/useWatchedQueries';
import {
  useHideFromRecommendations,
  useIsHiddenFromRecommendations,
} from '@/hooks/useHiddenRecommendationsQueries';
import { useMultiSearch } from '@/hooks/useSearch';
import {
  SearchResultsSkeletons,
  MediaSearchSkeleton,
} from '@/components/SearchSkeletons';

export default function MyPage() {
  const [query, setQuery] = useState('');
  
  // Watchlist
  const { data: watchlist } = useWatchlistQuery();
  const { mutate: addToWatchlist } = useAddToWatchlist();
  
  // Watched
  const { data: watched } = useWatchedQuery();
  const { mutate: addToWatched } = useAddToWatched();
  
  // Search
  const { data: searchResults, isLoading } = useMultiSearch(query);
  
  // Hide
  const { mutate: hideFromRecs } = useHideFromRecommendations();

  return <div>{/* your JSX */}</div>;
}
```

---

## Hook Patterns Cheatsheet

### Get all items with status
```typescript
const { data: items = [], isLoading } = useWatchlistQuery();
```

### Add item
```typescript
const { mutate: add } = useAddToWatchlist();
add({ mediaId: 123, mediaType: 'movie' });
```

### Check if exists
```typescript
const isInList = useIsInWatchlist(123, 'movie');
```

### Toggle
```typescript
const isInList = useIsInWatchlist(id, type);
const { mutate: add } = useAddToWatchlist();
const { mutate: remove } = useRemoveFromWatchlist();

const toggle = () => {
  isInList 
    ? remove({ mediaId: id, mediaType: type })
    : add({ mediaId: id, mediaType: type });
};
```

### Search with debounce
```typescript
const [query, setQuery] = useState('');
const { data: results, isLoading } = useMultiSearch(query);
```

### Update watched with rating
```typescript
const { mutate: update } = useUpdateWatched();
update({
  mediaId: 123,
  mediaType: 'movie',
  updates: { rating: 8 }
});
```

### Error handling
```typescript
const { mutate, isError, error } = useAddToWatchlist();
{isError && <div>Error: {error?.message}</div>}
```

---

## File Organization

```
src/
├── hooks/
│   ├── useWatchlistQueries.ts              ← Watchlist hooks
│   ├── useWatchedQueries.ts                ← Watched hooks
│   ├── useHiddenRecommendationsQueries.ts  ← Hidden hooks
│   └── useSearch.ts                        ← Search hooks
├── lib/
│   └── requestUtils.ts                     ← Utilities
├── components/
│   └── SearchSkeletons.tsx                 ← UI skeletons
├── types/
│   └── media.ts                            ← Type definitions
└── services/
    └── tmdb.ts                             ← API integration
```

---

## One-Liner Examples

```typescript
// Add to watchlist
const { mutate } = useAddToWatchlist();
mutate({ mediaId: 123, mediaType: 'movie' });

// Check if watched
const watched = useIsWatched(123, 'movie');

// Search movies
const { data } = useMovieSearch('Avatar');

// Get watchlist count
const { data: list } = useWatchlistQuery();
console.log(list?.length || 0);

// Hide recommendation
const { mutate } = useHideFromRecommendations();
mutate({ mediaId: 456, mediaType: 'tv' });

// Update rating
const { mutate } = useUpdateWatched();
mutate({ mediaId: 789, mediaType: 'movie', updates: { rating: 9 } });
```

---

## CommonMistakes to Avoid

❌ **Wrong**: Forgetting to call `mutate()`
```typescript
const { mutate } = useAddToWatchlist();
// Missing mutate call!
```

✅ **Correct**: Call the mutation function
```typescript
const { mutate: add } = useAddToWatchlist();
add({ mediaId: 123, mediaType: 'movie' });
```

---

❌ **Wrong**: Not providing required parameters
```typescript
const { mutate } = useAddToWatchlist();
mutate(); // Missing parameters!
```

✅ **Correct**: Provide all required fields
```typescript
const { mutate } = useAddToWatchlist();
mutate({ mediaId: 123, mediaType: 'movie' });
```

---

❌ **Wrong**: Accessing data before it loads
```typescript
const { data } = useWatchlistQuery();
console.log(data.length); // Could be undefined!
```

✅ **Correct**: Check or provide defaults
```typescript
const { data: watchlist = [] } = useWatchlistQuery();
console.log(watchlist.length); // Safe!
```

---

❌ **Wrong**: Not debouncing search input
```typescript
const { data } = useMultiSearch(query);
// Each keystroke makes API call!
```

✅ **Correct**: useMultiSearch auto-debounces
```typescript
const { data } = useMultiSearch(query);
// Auto-debounced, only 1 call per 300ms
```

---

## Performance Tips

1. **Use query selectors** to only subscribe to needed data:
```typescript
const { data: ids } = useWatchlistQuery({
  select: data => data?.map(item => item.mediaId) || []
});
```

2. **Memoize callbacks** to prevent unnecessary re-renders:
```typescript
const handleAdd = useCallback(
  () => addToWatchlist({ mediaId, mediaType }),
  [mediaId, mediaType, addToWatchlist]
);
```

3. **Disable auto-fetching** when not needed:
```typescript
const { data } = useWatchlistQuery({ enabled: false });
```

---

## Debugging

**React Query DevTools**:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In your App component
<ReactQueryDevtools initialIsOpen={false} />
```

**Check mutation status**:
```typescript
const { mutate, status, data, error } = useAddToWatchlist();
console.log('Status:', status); // 'idle' | 'pending' | 'success' | 'error'
```

**Check Network debouncing**:
1. Open DevTools → Network tab
2. Filter by Fetch/XHR
3. Type in search box slowly
4. Should see max 1 request per 300ms

---

Print this page or bookmark it for quick reference! 📌
