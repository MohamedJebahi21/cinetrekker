import { Media } from '@/types/media';

/**
 * Normalized card data structure - consistent across all UI components
 */
export interface NormalizedMediaCard {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string;
  rating: number;
  ratingCount: number;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  genres: { id: number; name: string }[];
  popularity: number;
  adult?: boolean;
}

/**
 * Normalize media data to consistent card format
 */
export function normalizeMediaCard(media: Media): NormalizedMediaCard {
  const mediaType = media.media_type === 'tv' ? 'tv' : 'movie';
  const title = media.title || media.name || 'Unknown Title';
  const dateStr = media.release_date || media.first_air_date || '';
  const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'N/A';

  return {
    id: media.id,
    mediaType,
    title,
    year,
    rating: Math.round(media.vote_average * 10) / 10,
    ratingCount: media.vote_count,
    posterPath: media.poster_path,
    backdropPath: media.backdrop_path,
    overview: media.overview,
    genres: media.genres || [],
    popularity: media.popularity,
    adult: media.adult,
  };
}

/**
 * Format media metadata as "Type • Rating • Year"
 */
export function formatMediaMeta(media: NormalizedMediaCard): string {
  const typeLabel = media.mediaType === 'movie' ? 'Movie' : 'TV Show';
  const ratingLabel = media.rating ? `${media.rating}★` : 'N/A';
  return `${typeLabel} • ${ratingLabel} • ${media.year}`;
}

/**
 * Format rating for display (0-10)
 */
export function formatRating(rating: number | undefined): string {
  if (!rating) return 'N/A';
  return (Math.round(rating * 10) / 10).toString();
}

/**
 * Get rating color class based on score
 */
export function getRatingColorClass(rating: number | undefined): string {
  if (!rating) return 'text-muted-foreground';
  if (rating >= 8) return 'text-green-500';
  if (rating >= 7) return 'text-blue-500';
  if (rating >= 6) return 'text-yellow-500';
  if (rating >= 5) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get rating badge variant based on score
 */
export function getRatingBadgeVariant(rating: number | undefined): 'default' | 'secondary' | 'outline' {
  if (!rating) return 'outline';
  if (rating >= 8) return 'default';
  if (rating >= 6) return 'secondary';
  return 'outline';
}

/**
 * Truncate overview text
 */
export function truncateOverview(overview: string, lines: number = 2): string {
  if (!overview) return '';
  const lineArray = overview.split('\n').slice(0, lines);
  const truncated = lineArray.join('\n');
  return truncated.length > 200 ? truncated.substring(0, 200) + '...' : truncated;
}

/**
 * Get genre badges for display
 */
export function getGenreBadges(genres: { id: number; name: string }[], limit: number = 3) {
  return genres.slice(0, limit);
}

/**
 * Format popularity score (0-100)
 */
export function formatPopularity(popularity: number): string {
  return `${Math.round(popularity)}%`;
}

/**
 * Get media type icon name
 */
export function getMediaTypeIcon(mediaType: 'movie' | 'tv'): string {
  return mediaType === 'movie' ? 'Film' : 'Tv';
}

/**
 * Build sortable key for media (for lists, grids)
 */
export function buildMediaKey(media: NormalizedMediaCard): string {
  return `${media.mediaType}-${media.id}`;
}

/**
 * Compare two media items for equality
 */
export function isMediaEqual(media1: Media, media2: Media): boolean {
  const type1 = media1.media_type === 'tv' ? 'tv' : 'movie';
  const type2 = media2.media_type === 'tv' ? 'tv' : 'movie';
  return media1.id === media2.id && type1 === type2;
}

/**
 * Filter out duplicates from media array
 */
export function deduplicateMedia(media: Media[]): Media[] {
  const seen = new Set<string>();
  return media.filter(item => {
    const key = buildMediaKey(normalizeMediaCard(item));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sort media by various criteria
 */
export function sortMedia(
  media: Media[],
  by: 'rating' | 'popularity' | 'date' | 'title' = 'popularity',
  descending = true
): Media[] {
  const sorted = [...media].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (by) {
      case 'rating':
        aVal = a.vote_average || 0;
        bVal = b.vote_average || 0;
        break;
      case 'popularity':
        aVal = a.popularity || 0;
        bVal = b.popularity || 0;
        break;
      case 'date':
        aVal = new Date(a.release_date || a.first_air_date || 0).getTime();
        bVal = new Date(b.release_date || b.first_air_date || 0).getTime();
        break;
      case 'title':
        aVal = (a.title || a.name || '').toLowerCase();
        bVal = (b.title || b.name || '').toLowerCase();
        break;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return descending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }

    return descending ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  return sorted;
}
