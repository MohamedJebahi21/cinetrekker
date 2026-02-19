import { z } from 'zod';

// Validation schemas for user input
export const userNoteSchema = z
  .string()
  .max(5000, 'Note must be less than 5000 characters')
  .optional()
  .transform((val) => val?.trim() || undefined);

export const showNameSchema = z
  .string()
  .min(1, 'Show name is required')
  .max(500, 'Show name must be less than 500 characters')
  .transform((val) => val.trim());

export const displayNameSchema = z
  .string()
  .max(100, 'Display name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s_-]*$/, 'Only letters, numbers, spaces, underscores and hyphens allowed')
  .optional()
  .transform((val) => val?.trim() || undefined);

export const bioSchema = z
  .string()
  .max(500, 'Bio must be 500 characters or less')
  .regex(/^[^<>]*$/, 'Bio cannot contain HTML tags')
  .optional()
  .transform((val) => val?.trim() || undefined);

export const searchQuerySchema = z
  .string()
  .min(1, 'Search query required')
  .max(200, 'Search query too long')
  .regex(/^[a-zA-Z0-9\s\-'.,:!?()&]*$/, 'Invalid characters in search');

export const episodeNameSchema = z
  .string()
  .max(500, 'Episode name must be less than 500 characters')
  .optional()
  .transform((val) => val?.trim() || undefined);

export const mediaTypeSchema = z.enum(['movie', 'tv']);

export const statusSchema = z.enum(['watching', 'completed', 'dropped', 'plan_to_watch']).optional();

export const ratingSchema = z
  .number()
  .int()
  .min(0, 'Rating must be at least 0')
  .max(10, 'Rating must be at most 10')
  .optional();

// Validation functions
export function validateNote(note: string | undefined): string | undefined {
  const result = userNoteSchema.safeParse(note);
  if (result.success) {
    return result.data;
  }
  console.warn('Note validation failed:', result.error.message);
  return note?.slice(0, 5000).trim();
}

export function validateShowName(name: string): string {
  const result = showNameSchema.safeParse(name);
  if (result.success) {
    return result.data;
  }
  console.warn('Show name validation failed:', result.error.message);
  return name.slice(0, 500).trim();
}

export function validateDisplayName(name: string | undefined): string | undefined {
  const result = displayNameSchema.safeParse(name);
  if (result.success) {
    return result.data;
  }
  console.warn('Display name validation failed:', result.error.message);
  // Sanitize on failure - remove special chars and limit length
  return name?.replace(/[^a-zA-Z0-9\s_-]/g, '').slice(0, 100).trim();
}

export function validateBio(bio: string | undefined): string | undefined {
  const result = bioSchema.safeParse(bio);
  if (result.success) {
    return result.data;
  }
  console.warn('Bio validation failed:', result.error.message);
  // Sanitize on failure - remove HTML tags and limit length
  return bio?.replace(/[<>]/g, '').slice(0, 500).trim();
}

export function validateSearchQuery(query: string): string {
  const result = searchQuerySchema.safeParse(query);
  if (result.success) {
    return result.data;
  }
  console.warn('Search query validation failed:', result.error.message);
  // Sanitize on failure - remove special chars and limit length
  return query.replace(/[^a-zA-Z0-9\s\-'.,:!?()&]/g, '').slice(0, 200).trim();
}

export function validateEpisodeName(name: string | undefined): string | undefined {
  const result = episodeNameSchema.safeParse(name);
  if (result.success) {
    return result.data;
  }
  console.warn('Episode name validation failed:', result.error.message);
  return name?.slice(0, 500).trim();
}

export function validateRating(rating: number | undefined): number | undefined {
  const result = ratingSchema.safeParse(rating);
  if (result.success) {
    return result.data;
  }
  console.warn('Rating validation failed:', result.error.message);
  if (rating === undefined) return undefined;
  return Math.max(0, Math.min(10, Math.round(rating)));
}
