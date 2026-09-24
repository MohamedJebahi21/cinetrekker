import { z } from "zod";
import {
  mediaTypeSchema,
  statusSchema,
  ratingSchema,
  userNoteSchema,
  displayNameSchema,
  bioSchema,
  searchQuerySchema,
  episodeNameSchema,
  showNameSchema,
  reviewSchema,
  type ReviewInput,
} from "../validation.ts";

// Re-export validated primitives for unified cross-stack consumption
export {
  mediaTypeSchema,
  statusSchema,
  ratingSchema,
  userNoteSchema,
  displayNameSchema,
  bioSchema,
  searchQuerySchema,
  episodeNameSchema,
  showNameSchema,
  reviewSchema,
  type ReviewInput,
};

// ── Common / Identifier Schemas ─────────────────────────────────────────────

export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Must be a valid UUID format",
  );

export const mediaIdSchema = z.number().int().positive();

export const movieStringIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9:_-]{1,128}$/, "Invalid media identifier format");

// ── Follow / Unfollow Payloads ──────────────────────────────────────────────

export const followRequestSchema = z.object({
  user_id: uuidSchema,
  movie_id: movieStringIdSchema,
});

export type FollowRequest = z.infer<typeof followRequestSchema>;

// ── Watchlist Mutations ─────────────────────────────────────────────────────

export const watchlistMutationSchema = z.object({
  mediaId: mediaIdSchema,
  mediaType: mediaTypeSchema,
});

export type WatchlistMutation = z.infer<typeof watchlistMutationSchema>;

// ── Watched Mutations ───────────────────────────────────────────────────────

export const watchedMutationSchema = z.object({
  mediaId: mediaIdSchema,
  mediaType: mediaTypeSchema,
  rating: ratingSchema,
  note: userNoteSchema,
  status: statusSchema,
});

export type WatchedMutation = z.infer<typeof watchedMutationSchema>;

// ── Notification Actions ────────────────────────────────────────────────────

export const notificationMarkReadSchema = z.object({
  notification_id: uuidSchema,
});

export type NotificationMarkRead = z.infer<typeof notificationMarkReadSchema>;

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

// ── Feedback Submission ─────────────────────────────────────────────────────

export const feedbackSubmissionSchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email("Invalid email address").max(254).optional().or(z.literal("")),
  message: z.string().min(1, "Message is required").max(4000, "Message too long"),
  category: z.enum(["general", "bug", "feature", "content", "security"]).default("general"),
  turnstileToken: z.string().optional(),
  recaptchaToken: z.string().optional(),
  honeypot: z.string().optional(),
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;

// ── Multi-API Enrichment Schemas ──────────────────────────────────────────

export const imdbIdSchema = z
  .string()
  .regex(/^tt\d{5,10}$/, "Invalid IMDb identifier format (expected e.g. tt0137523)");

export const enrichedRatingsSchema = z.object({
  imdbRating: z.string().nullable(),
  imdbVotes: z.string().nullable(),
  rottenTomatoes: z.string().nullable(),
  metascore: z.string().nullable(),
  awards: z.string().nullable(),
  boxOffice: z.string().nullable(),
});

export type EnrichedRatings = z.infer<typeof enrichedRatingsSchema>;

export const nextEpisodeScheduleSchema = z.object({
  name: z.string(),
  airdate: z.string(),
  airtime: z.string().optional().nullable(),
  season: z.number().int().positive(),
  number: z.number().int().positive(),
});

export type NextEpisodeSchedule = z.infer<typeof nextEpisodeScheduleSchema>;

export const tvScheduleSchema = z.object({
  network: z.string().nullable(),
  days: z.array(z.string()),
  time: z.string().nullable(),
  nextEpisode: nextEpisodeScheduleSchema.nullable(),
});

export type TVSchedule = z.infer<typeof tvScheduleSchema>;
