import { Media } from '@/types/media';

export type SortOption = 
  | 'title-asc' 
  | 'title-desc' 
  | 'rating-desc' 
  | 'rating-asc' 
  | 'date-desc' 
  | 'date-asc'
  | 'runtime-desc'
  | 'runtime-asc'
  | 'popularity-desc'
  | 'added-desc'
  | 'added-asc';

export function sortMedia(media: Media[], sortBy: SortOption, addedDates?: Map<string, Date>): Media[] {
  const sorted = [...media];

  switch (sortBy) {
    case 'title-asc':
      sorted.sort((a, b) => {
        const titleA = (a.title || a.name || '').toLowerCase();
        const titleB = (b.title || b.name || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
      break;

    case 'title-desc':
      sorted.sort((a, b) => {
        const titleA = (a.title || a.name || '').toLowerCase();
        const titleB = (b.title || b.name || '').toLowerCase();
        return titleB.localeCompare(titleA);
      });
      break;

    case 'rating-desc':
      sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      break;

    case 'rating-asc':
      sorted.sort((a, b) => (a.vote_average || 0) - (b.vote_average || 0));
      break;

    case 'date-desc':
      sorted.sort((a, b) => {
        const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
        const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
        return dateB.getTime() - dateA.getTime();
      });
      break;

    case 'date-asc':
      sorted.sort((a, b) => {
        const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
        const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
        return dateA.getTime() - dateB.getTime();
      });
      break;

    case 'runtime-desc':
      sorted.sort((a, b) => {
        const runtimeA = (a as any).runtime || ((a as any).episode_run_time && (a as any).episode_run_time[0]) || 0;
        const runtimeB = (b as any).runtime || ((b as any).episode_run_time && (b as any).episode_run_time[0]) || 0;
        return runtimeB - runtimeA;
      });
      break;

    case 'runtime-asc':
      sorted.sort((a, b) => {
        const runtimeA = (a as any).runtime || ((a as any).episode_run_time && (a as any).episode_run_time[0]) || 0;
        const runtimeB = (b as any).runtime || ((b as any).episode_run_time && (b as any).episode_run_time[0]) || 0;
        return runtimeA - runtimeB;
      });
      break;

    case 'popularity-desc':
      sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;

    case 'added-desc':
      if (addedDates) {
        sorted.sort((a, b) => {
          const dateA = addedDates.get(`${a.media_type}-${a.id}`) || new Date(0);
          const dateB = addedDates.get(`${b.media_type}-${b.id}`) || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      }
      break;

    case 'added-asc':
      if (addedDates) {
        sorted.sort((a, b) => {
          const dateA = addedDates.get(`${a.media_type}-${a.id}`) || new Date(0);
          const dateB = addedDates.get(`${b.media_type}-${b.id}`) || new Date(0);
          return dateA.getTime() - dateB.getTime();
        });
      }
      break;

    default:
      break;
  }

  return sorted;
}

export function filterMediaByRuntime(media: Media[], minRuntime: number, maxRuntime: number): Media[] {
  return media.filter((item) => {
    const runtime = (item as any).runtime || ((item as any).episode_run_time && (item as any).episode_run_time[0]) || 0;
    return runtime >= minRuntime && runtime <= maxRuntime;
  });
}

export function filterMediaByYear(media: Media[], minYear: number, maxYear: number): Media[] {
  return media.filter((item) => {
    const dateStr = item.release_date || item.first_air_date;
    if (!dateStr) return false;
    const year = new Date(dateStr).getFullYear();
    return year >= minYear && year <= maxYear;
  });
}

export function filterMediaByGenre(media: Media[], genreIds: number[]): Media[] {
  if (genreIds.length === 0) return media;
  return media.filter((item) => {
    const itemGenres = item.genre_ids || [];
    return genreIds.some((id) => itemGenres.includes(id));
  });
}
