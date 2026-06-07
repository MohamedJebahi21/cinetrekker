import { discoverMovies } from '@/services/tmdb';
import type { Media } from '@/types/media';

export type MoodId =
  | 'escapist'
  | 'mindless'
  | 'cathartic'
  | 'mindbending'
  | 'feelgood'
  | 'edge';

export type TimeSlot = 'short' | 'medium' | 'long';

const MOOD_GENRE_MAP: Record<MoodId, string> = {
  escapist: '878',
  mindless: '35',
  cathartic: '18',
  mindbending: '9648',
  feelgood: '10751',
  edge: '53',
};

function runtimeParamsFor(time?: TimeSlot) {
  if (time === 'short') return { with_runtime_gte: '0', with_runtime_lte: '90' };
  if (time === 'medium') return { with_runtime_gte: '90', with_runtime_lte: '120' };
  if (time === 'long') return { with_runtime_gte: '120', with_runtime_lte: '500' };
  return {};
}

export async function fetchMoodMatch(mood: MoodId, time?: TimeSlot, language = 'en'): Promise<Media | null> {
  const genre = MOOD_GENRE_MAP[mood];
  const params: Record<string, string | number> = {
    page: '1',
    with_genres: genre,
    sort_by: 'popularity.desc',
    ...runtimeParamsFor(time),
  };
  try {
    const resp = await discoverMovies(params, language);
    const list = resp?.results || [];
    return list.length ? ({ ...list[0], media_type: 'movie' } as Media) : null;
  } catch {
    return null;
  }
}
