# EmptyState Component Guide

## Overview
The `EmptyState` component is a reusable, flexible component for displaying empty states in sections like Favorites, Recent Activity, and other placeholder scenarios. It features:

- ✅ Stylized Lucide-react icons with customizable sizing
- ✅ Subtle grey placeholder text
- ✅ Call-to-action buttons with CineTrekker red branding
- ✅ Flexible layout options (sm/md/lg sizes)
- ✅ Optional button icons
- ✅ Light and dark variants

---

## Basic Usage

```tsx
import { EmptyState } from '@/components/EmptyState';
import { Heart, TrendingUp } from 'lucide-react';

export function MyComponent() {
  return (
    <EmptyState
      icon={Heart}
      title="No favorites yet"
      description="Like movies and TV shows to build your collection of favorites."
      actionLabel="Browse Movies"
      actionLink="/search"
    />
  );
}
```

---

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | **Required** | Lucide-react icon component to display |
| `title` | `string` | **Required** | Main heading text |
| `description` | `string` | **Required** | Descriptive subtitle text (subtle grey) |
| `actionLabel` | `string` | `undefined` | Button label text (optional - hides button if not provided) |
| `actionLink` | `string` | `'/'` | Link destination when button is clicked |
| `actionIcon` | `LucideIcon` | `undefined` | Optional icon to display in the button |
| `variant` | `'default' \| 'muted'` | `'default'` | Visual variant (default = red branding, muted = neutral) |
| `iconSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | Icon size (small, medium, large) |
| `containerSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | Container/background size |
| `className` | `string` | `undefined` | Additional CSS classes for wrapper |

---

## Examples

### 1. Favorites Section (Muted Variant)
```tsx
<EmptyState
  icon={Heart}
  title="No favorites yet"
  description="Like movies and TV shows to build your collection of favorites."
  actionLabel="Browse Movies"
  actionLink="/search"
  variant="muted"
  containerSize="md"
  className="py-8"
/>
```

### 2. Recent Activity (With Action Icon)
```tsx
<EmptyState
  icon={Clapperboard}
  title="No recent activity"
  description="Start watching movies and your activity will appear here."
  actionLabel="Browse Trending"
  actionLink="/trending"
  actionIcon={TrendingUp}
  variant="default"
  containerSize="md"
  className="py-8"
/>
```

### 3. Search Results (Compact)
```tsx
<EmptyState
  icon={Search}
  title="No results found"
  description={`No movies or shows match "${searchQuery}". Try different keywords.`}
  actionLabel="Clear Search"
  actionLink="/browse"
  iconSize="lg"
  containerSize="lg"
  variant="muted"
/>
```

### 4. Watchlist (No Button)
```tsx
<EmptyState
  icon={Bookmark}
  title="Your watchlist is empty"
  description="Add movies and TV shows to keep track of what you want to watch."
  variant="default"
  containerSize="md"
  // No actionLabel = no button displayed
/>
```

### 5. Recommendations (Custom Size)
```tsx
<EmptyState
  icon={Sparkles}
  title="Personalized recommendations coming soon"
  description="Explore more content to get better tailored recommendations."
  actionLabel="Start Exploring"
  actionLink="/trending"
  actionIcon={TrendingUp}
  iconSize="sm"
  containerSize="sm"
  className="py-4"
/>
```

---

## Icon Size Reference

### `iconSize` prop values:
- **`'sm'`**: `w-8 h-8` (small icons, 32px)
- **`'md'`**: `w-10 h-10` (medium icons, 40px) — *default*
- **`'lg'`**: `w-12 h-12` (large icons, 48px)

### `containerSize` prop values:
- **`'sm'`**: `w-16 h-16` (tight, 64px) — `py-8` padding
- **`'md'`**: `w-20 h-20` (standard, 80px) — `py-16` padding — *default*
- **`'lg'`**: `w-24 h-24` (spacious, 96px) — `py-20` padding

---

## Variant Comparison

### Default Variant (Red Branding)
```tsx
<EmptyState
  icon={Heart}
  title="No favorites"
  description="Add your favorite movies."
  actionLabel="Browse"
  actionLink="/search"
  variant="default"  // ← CineTrekker red button, red icon background
/>
```
**Use for:** Primary actions, key sections like Recent Activity

### Muted Variant (Neutral)
```tsx
<EmptyState
  icon={Heart}
  title="No favorites"
  description="Add your favorite movies."
  actionLabel="Browse"
  actionLink="/search"
  variant="muted"  // ← Neutral button, grey icon background
/>
```
**Use for:** Secondary sections, optional content like Favorites sidebar

---

## Color/Branding Details

- **Primary Red**: `#D90429` (hsl(350 96% 43%))
- **Icon Background (default)**: Gradient from `primary/20` to `primary/5`
- **Icon Background (muted)**: Gradient from `muted/50` to `muted/20`
- **Placeholder Text**: Uses `.text-muted-foreground` class (subtle grey)
- **Button**: Inherits primary color for default variant

---

## In Profile.tsx Usage

The Profile page now uses EmptyState for both:

### 1. Favorites Section
```tsx
<EmptyState
  icon={Heart}
  title={t('profile.noFavoritesYet')}
  description={t('profile.noFavoritesDesc')}
  actionLabel={t('profile.addFavorites')}
  actionLink="/search"
  variant="muted"
  containerSize="md"
  className="py-8"
/>
```

### 2. Recent Activity Section
```tsx
<EmptyState
  icon={Clapperboard}
  title={t('profile.noRecentActivity')}
  description={t('profile.noActivityDesc')}
  actionLabel={t('profile.browseTrending')}
  actionLink="/trending"
  actionIcon={TrendingUp}
  variant="default"
  containerSize="md"
  className="py-8"
/>
```

---

## Available Lucide Icons

Common icons to use with EmptyState:

- `Heart` — Favorites, likes
- `Bookmark` — Watchlist, saved items
- `Check` — Completed, watched
- `TrendingUp` — Popular, trending
- `Film` — Movies, cinema
- `Clapperboard` — Shows, activity
- `Search` — Search results
- `AlertCircle` — Errors, warnings
- `Inbox` — Generic empty state
- `Users` — Social, followers
- `Clock` — Recent, history
- `Sparkles` — Recommendations, special

See [Lucide Icons](https://lucide.dev/) for full list of 1000+ icons.

---

## Accessibility

- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy (`<h2>`)
- ✅ Sufficient color contrast (grey text meets WCAG AA)
- ✅ Keyboard-navigable buttons (inherited from shadcn/ui Button)
- ✅ Focus states on interactive elements
- ✅ Translatable text via i18n

---

## Migration Guide

### Before (Manual Markup)
```tsx
<div className="text-center py-16 max-w-md mx-auto">
  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
    <Heart className="w-10 h-10 text-primary" />
  </div>
  <h2 className="text-2xl font-bold mb-3">{title}</h2>
  <p className="text-muted-foreground mb-6">{description}</p>
  <Link to="/search">
    <Button>
      <TrendingUp className="w-4 h-4" />
      Browse Movies
    </Button>
  </Link>
</div>
```

### After (Using EmptyState)
```tsx
<EmptyState
  icon={Heart}
  title={title}
  description={description}
  actionLabel="Browse Movies"
  actionLink="/search"
  actionIcon={TrendingUp}
/>
```

✨ **Cleaner, more maintainable, and reusable!**

---

## File Location

```
src/components/EmptyState.tsx
```

Import it in your components:
```tsx
import { EmptyState } from '@/components/EmptyState';
```

---

## Related Components

- **EmptyStates.tsx**: Pre-built empty state components (EmptyFavorites, EmptyWatched, etc.)
- **Button**: shadcn/ui button component
- **Card/CardContent**: Layout wrapper for sections
- **Badge**: Status indicators (if needed alongside empty states)

---

## Performance

- Lightweight: ~1.16 kB bundle size (0.60 kB gzip)
- No external dependencies beyond existing ones
- Efficiently uses Framer Motion when wrapped in motion.section
- Lazy-loaded icons via Lucide-react tree-shaking

---

## Last Updated

February 21, 2026 — Commit: `f04bbc1`
