# CineTrekker Core Foundation Implementation Guide

## Overview
This document outlines the comprehensive foundation improvements implemented for CineTrekker, focusing on reliability, search optimization, and security hardening.

---

## 1. State Management - TanStack Query Migration

### Files Created
- `src/hooks/useWatchlistQueries.ts` - Watchlist state management
- `src/hooks/useWatchedQueries.ts` - Watched items state management
- `src/hooks/useHiddenRecommendationsQueries.ts` - Hidden recommendations state management

### Key Features
✅ **Optimistic Updates** - UI updates immediately while requests process
✅ **Automatic Rollback** - Reverts changes if requests fail
✅ **Cross-Page Persistence** - State syncs across all pages automatically
✅ **Local + Cloud Storage** - Works both authenticated (Supabase) and anonymous (localStorage)

### Implementation Details

#### Watchlist Hooks
```typescript
useWatchlistQuery()           // Fetch watchlist
useAddToWatchlist()           // Add with optimistic update
useRemoveFromWatchlist()      // Remove with optimistic update
useIsInWatchlist()            // Check if item is in watchlist
```

#### Watched Hooks
```typescript
useWatchedQuery()             // Fetch watched items
useAddToWatched()             // Add with ratings/notes
useRemoveFromWatched()        // Remove watched item
useUpdateWatched()            // Update rating/note/status
useIsWatched()                // Check if watched
useGetWatchedItem()           // Get watched details
```

#### Hidden Recommendations Hooks
```typescript
useHiddenRecommendationsQuery()  // Fetch hidden items
useHideFromRecommendations()     // Hide with optimistic update
useUnhideFromRecommendations()   // Restore recommendation
useIsHiddenFromRecommendations() // Check if hidden
```

### Usage Example
```typescript
import { useAddToWatchlist, useIsInWatchlist } from '@/hooks/useWatchlistQueries';

function MediaCard({ media }) {
  const { mutate: addToWatchlist } = useAddToWatchlist();
  const isInWatchlist = useIsInWatchlist(media.id, 'movie');

  const handleToggleWatchlist = () => {
    addToWatchlist({ mediaId: media.id, mediaType: 'movie' });
  };

  return (
    <button 
      onClick={handleToggleWatchlist}
      className={isInWatchlist ? 'active' : ''}
    >
      {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
    </button>
  );
}
```

---

## 2. Search & Discovery Improvements

### Files Created
- `src/hooks/useSearch.ts` - Search with debounce and cancellation
- `src/components/SearchSkeletons.tsx` - Loading state components
- `src/lib/requestUtils.ts` - Debounce and throttle utilities
- `src/services/tmdb.ts` - Added `searchPeople()` endpoint

### Features

#### 300ms Debounce
- User input waits 300ms before making API request
- Prevents excessive API calls while typing
- Implemented via `useSearch` hook

#### Request Cancellation
- Automatically cancels previous requests when new query is made
- Uses `AbortController` for clean cancellation
- Prevents race conditions and outdated results

#### Multiple Search Types
```typescript
useMultiSearch()      // Search movies, TV, and people
useMovieSearch()      // Search movies only
useTVSearch()         // Search TV shows only
usePeopleSearch()     // Search actors/crew
```

#### Skeleton Loaders
```typescript
<MediaSearchSkeleton />          // Individual media card skeleton
<SearchResultsSkeletons />       // Grid of skeletons
<PersonSearchSkeleton />         // Individual person skeleton
<PersonSearchResultsSkeletons /> // List of person skeletons
<MixedSearchSkeletons />         // Combined media + people
```

### Usage Example
```typescript
import { useMultiSearch } from '@/hooks/useSearch';
import { SearchResultsSkeletons } from '@/components/SearchSkeletons';

function SearchPage() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useMultiSearch(query);

  if (isLoading) return <SearchResultsSkeletons count={6} />;

  return (
    <div className="media-grid">
      {data?.results.map(item => (
        <MediaCard key={item.id} media={item} />
      ))}
    </div>
  );
}
```

---

## 3. Personalization - Optimistic Hide Feature

### Implementation
Built into `useHiddenRecommendationsQueries.ts` with:
- **Immediate Feedback** - Hidden items removed from UI instantly
- **Error Recovery** - Automatically restores if save fails
- **Dual Storage** - Persists to Supabase (if authenticated) or localStorage
- **Per-User** - Separate hidden lists for each user

### Usage Example
```typescript
import { useHideFromRecommendations, useIsHiddenFromRecommendations } from '@/hooks/useHiddenRecommendationsQueries';

function RecommendationCard({ media }) {
  const { mutate: hideFromRecs } = useHideFromRecommendations();
  const isHidden = useIsHiddenFromRecommendations(media.id, media.media_type);

  return (
    <button onClick={() => hideFromRecs({ mediaId: media.id, mediaType: media.media_type })}>
      {isHidden ? '✓ Hidden' : 'Hide'}
    </button>
  );
}
```

---

## 4. Security Enhancements

### 4.1 Content Security Policy (CSP)
**File**: `vite.config.ts`

Configured headers:
```typescript
"Content-Security-Policy": [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "connect-src 'self' https://image.tmdb.org https://*.supabase.co",
  "media-src 'self' https:",
  "frame-ancestors 'self'",
].join("; ")
```

Additional security headers:
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: DENY` - Disable framing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Privacy
- `Permissions-Policy` - Restrict browser features

### 4.2 API Security
- ✅ All TMDB API calls routed through Supabase Edge Functions proxy
- ✅ Sensitive API keys never exposed to client
- ✅ Edge Functions provide authentication layer

### 4.3 Framework Fingerprinting Removal
- Removed `lovable-tagger` package from dependencies
- Removed `componentTagger` plugin from Vite config
- Reduces attack surface by obscuring tech stack

### 4.4 Client-Side Rate Limiting
**File**: `src/lib/requestUtils.ts`

`RequestThrottler` class for API call throttling:
```typescript
const throttler = new RequestThrottler(1000); // 1 second minimum

if (throttler.canMakeRequest('search-api')) {
  await makeRequest();
  throttler.recordRequest('search-api');
}
```

---

## 5. Integration Guide

### Updating Components

#### Replace UserListsContext Usage
**Before:**
```typescript
const { addToWatchlist, watchlist } = useUserLists();
const isInWatchlist = watchlist.some(item => item.mediaId === media.id);
```

**After:**
```typescript
import { useAddToWatchlist, useIsInWatchlist } from '@/hooks/useWatchlistQueries';

const { mutate: addToWatchlist } = useAddToWatchlist();
const isInWatchlist = useIsInWatchlist(media.id, 'movie');

const handleAdd = () => addToWatchlist({ mediaId: media.id, mediaType: 'movie' });
```

#### Update Search Implementation
**Before:**
```typescript
const { data } = useQuery({
  queryKey: ['search', query],
  queryFn: () => searchMulti(query),
});
```

**After:**
```typescript
import { useMultiSearch } from '@/hooks/useSearch';
import { SearchResultsSkeletons } from '@/components/SearchSkeletons';

const { data, isLoading } = useMultiSearch(query);

if (isLoading) return <SearchResultsSkeletons />;
return <results />;
```

---

## 6. Configuration Changes

### Vite Configuration
- ✅ Added CSP headers for dev server
- ✅ Added security headers
- ✅ Removed framework fingerprinting plugin
- ✅ Optimized for WASM support

### Package Dependencies
- ✅ Removed `lovable-tagger` (was only used for dev fingerprinting)
- ✅ All other dependencies unchanged
- ✅ TanStack Query already included

---

## 7. Performance Benefits

### Before → After

| Feature | Before | After |
|---------|--------|-------|
| Search Response | Immediate on keystroke | 300ms debounce (fewer requests) |
| API Calls | One per keystroke | One per 300ms of no typing |
| State Updates | Network dependent | Instant (optimistic) |
| Rollback on Error | Manual | Automatic |
| Cross-Page Sync | Manual | Automatic via React Query |
| XSS Risk | Higher | Lower (CSP headers) |
| Framework Exposure | Identified | Hidden |

---

## 8. Testing Checklist

- [ ] Watchlist add/remove works across all pages
- [ ] Watched items persist on page refresh
- [ ] Search debounces properly (check network tab)
- [ ] Search cancels previous requests
- [ ] Hidden recommendations work optimistically
- [ ] CSP headers in browser DevTools network tab
- [ ] Authenticated users sync with Supabase
- [ ] Unauthenticated users use localStorage
- [ ] Error states rollback correctly
- [ ] Skeleton loaders display while loading

---

## 9. Next Steps (Session 2)

1. **Advanced Search Filters** - Year, runtime, rating ranges
2. **Recommendations Algorithm** - ML-based suggestions
3. **Watch History** - Track viewing patterns
4. **Social Features** - Share lists, follow users
5. **Performance** - Image optimization, code splitting
6. **Analytics** - Track user engagement
7. **Offline Support** - Service workers, cache strategy
8. **Mobile Optimization** - Touch gestures, responsive design

---

## 10. Troubleshooting

### Search Not Debouncing
- Check browser DevTools Network tab
- Verify `useSearch` hook is being used
- Look for console errors

### Optimistic Updates Not Working
- Check if mutation hook is imported correctly
- Verify `mutate()` is called after button click
- Check React Query DevTools for mutation status

### Cross-Page State Not Syncing
- Ensure using correct query key
- Verify `useQueryClient().invalidateQueries()` is called
- Check localStorage for unauthenticated users

### CSP Errors in Console
- Add required domains to `connect-src` in vite.config.ts
- For TMDB images, already whitelisted
- For other services, add to appropriate directive

---

## File Summary

```
src/
├── hooks/
│   ├── useWatchlistQueries.ts              [NEW] Watchlist state management
│   ├── useWatchedQueries.ts                [NEW] Watched items state management
│   ├── useHiddenRecommendationsQueries.ts  [NEW] Hidden recommendations
│   └── useSearch.ts                        [NEW] Search with debounce
├── lib/
│   └── requestUtils.ts                     [NEW] Debounce & throttle utilities
├── components/
│   └── SearchSkeletons.tsx                 [NEW] Loading state components
├── services/
│   └── tmdb.ts                             [UPDATED] Added searchPeople()
├── types/
│   └── media.ts                            [UPDATED] Added PersonSearchResult
└── vite.config.ts                          [UPDATED] Added CSP & security headers

package.json                                [UPDATED] Removed lovable-tagger
```

This foundation establishes reliability, security, and search optimization for future features.
