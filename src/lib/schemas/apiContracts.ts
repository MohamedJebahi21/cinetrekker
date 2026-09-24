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

// ── TVmaze TV Details & Episodes ────────────────────────────────────────────

export const tvBroadcastScheduleSchema = z.object({
  network: z.string().nullable(),
  networkCountry: z.string().nullable().optional(),
  webChannel: z.string().nullable(),
  days: z.array(z.string()),
  time: z.string().nullable(),
  timezone: z.string().nullable().optional(),
});

export type TVBroadcastSchedule = z.infer<typeof tvBroadcastScheduleSchema>;

export const tvNextOrPrevEpisodeSchema = z.object({
  id: z.number().nullable().optional(),
  name: z.string(),
  season: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  airdate: z.string(),
  airtime: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export type TVNextOrPrevEpisode = z.infer<typeof tvNextOrPrevEpisodeSchema>;

export const tvSeasonSummarySchema = z.object({
  seasonNumber: z.number().int().nonnegative(),
  name: z.string(),
  overview: z.string().nullable(),
  episodeCount: z.number().int().nonnegative(),
  airDate: z.string().nullable(),
  posterPath: z.string().nullable(),
});

export type TVSeasonSummary = z.infer<typeof tvSeasonSummarySchema>;

export const tvDetailsResponseSchema = z.object({
  found: z.boolean(),
  imdbId: z.string().optional(),
  tvmazeId: z.number().optional().nullable(),
  tvdbId: z.number().optional().nullable(),
  broadcastSchedule: tvBroadcastScheduleSchema.optional(),
  nextEpisode: tvNextOrPrevEpisodeSchema.nullable().optional(),
  previousEpisode: tvNextOrPrevEpisodeSchema.nullable().optional(),
  totalSeasons: z.number().int().nonnegative().optional(),
  totalEpisodes: z.number().int().nonnegative().optional(),
  status: z.string().nullable().optional(),
  seasons: z.array(tvSeasonSummarySchema).optional(),
});

export type TVDetailsResponse = z.infer<typeof tvDetailsResponseSchema>;

export const normalizedEpisodeSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  seasonNumber: z.number().int().nonnegative(),
  episodeNumber: z.number().int().nonnegative(),
  name: z.string(),
  overview: z.string().nullable(),
  airDate: z.string().nullable(),
  airTime: z.string().nullable().optional(),
  runtime: z.number().nullable().optional(),
  stillPath: z.string().nullable().optional(),
  voteAverage: z.number().nullable().optional(),
  isSpecial: z.boolean(),
  tvmazeUrl: z.string().nullable().optional(),
});

export type NormalizedEpisodeSchema = z.infer<typeof normalizedEpisodeSchema>;

export const tvEpisodesResponseSchema = z.object({
  found: z.boolean(),
  tvmazeShowId: z.number().optional(),
  episodes: z.array(normalizedEpisodeSchema),
});

export type TVEpisodesResponse = z.infer<typeof tvEpisodesResponseSchema>;
