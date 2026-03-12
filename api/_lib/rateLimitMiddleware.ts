/**
 * Rate Limiting Middleware for Vercel Serverless Functions
 *
 * Implements token bucket algorithm to prevent:
 * - Brute force attacks (auth endpoints)
 * - API spam (general endpoints)
 * - DDoS attacks (search, recommendations)
 * - Bot exhaustion of TMDB/OpenAI quotas
 *
 * For production, use Upstash Redis for multi-instance rate limiting:
 * https://upstash.com/docs/redis/features/ratelimiting
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory store - works for single instance dev/testing
 * For production with multiple serverless instances, use:
 * - Upstash Redis (recommended)
 * - AWS DynamoDB
 * - Cloudflare Workers KV
 */
const requestStore = new Map<string, RateLimitEntry>();

/**
 * Clean up old entries to prevent memory leak
 * Run periodically to remove expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  requestStore.forEach((entry, key) => {
    if (now > entry.resetAt + 60000) { // Keep for 1 minute after reset
      entriesToDelete.push(key);
    }
  });

  entriesToDelete.forEach(key => requestStore.delete(key));
}

/**
 * Extracts client IP from Vercel request
 * Handles x-forwarded-for proxy headers correctly
 */
export function getClientIP(req: VercelRequest): string {
  // x-forwarded-for can have multiple IPs: "client, proxy1, proxy2"
  // Take the first one (original client IP)
  const forwarded = req.headers['x-forwarded-for'] as string;
  const real = req.headers['x-real-ip'] as string;

  if (forwarded) {
    // Handle multiple IPs, take first
    return forwarded.split(',')[0].trim();
  }

  if (real) {
    return real;
  }

  return req.socket?.remoteAddress || 'unknown';
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: VercelRequest) => string; // Custom key function
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Creates a rate limiter middleware
 *
 * Usage:
 * ```typescript
 * const limiter = createRateLimiter({ windowMs: 60*1000, maxRequests: 100 });
 * 
 * export default function handler(req, res) {
 *   const result = limiter(req, res);
 *   if (!result.success) return; // Rate limit hit, response already sent
 *   
 *   // Handle request...
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 100,
    keyGenerator = (req) => getClientIP(req),
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return (req: VercelRequest, res: VercelResponse): RateLimitResult | null => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Cleanup every 100 requests to prevent memory leak
    if (requestStore.size % 100 === 0) {
      cleanupExpiredEntries();
    }

    let entry = requestStore.get(key);

    // Reset if window expired
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      requestStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers (useful for client-side handling)
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, maxRequests - entry.count).toString()
    );
    res.setHeader('X-RateLimit-Reset', (entry.resetAt / 1000).toFixed(0));

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });

      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      };
    }

    // Allow request
    return {
      success: true,
      remaining: Math.max(0, maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  };
}

/**
 * Pre-configured rate limiters for common endpoints
 */

/**
 * Strict limit for auth endpoints (prevent brute force)
 * - Max 5 login attempts per minute per IP
 * - Protects against credential stuffing attacks
 */
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 attempts max
  message: 'Too many login attempts. Please try again later.',
});

/**
 * Moderate limit for search endpoints
 * - Max 30 searches per minute per IP
 * - Prevents search API spam while allowing normal usage
 */
export const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many searches. Please slow down.',
});

/**
 * General API rate limiting
 * - Max 100 requests per minute per IP
 * - Baseline for unknown endpoints
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Rate limit exceeded. Please try again later.',
});

/**
 * Very strict limit for expensive operations
 * - Max 10 AI recommendations per minute per IP
 * - Protects OpenAI API quota from exhaustion
 */
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'AI recommendations are rate limited. Please try again later.',
});

/**
 * Moderate limit for user actions
 * - Max 30 profile updates per minute per user
 * - Prevents profile update spam
 */
export const profileLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: (req) => {
    // Use user ID if available, otherwise IP
    const userId = (req.query?.userId as string) || getClientIP(req);
    return `profile-${userId}`;
  },
  message: 'Too many profile updates. Please try again later.',
});

/**
 * Example: How to use in a Vercel serverless function
 *
 * ```typescript
 * import { authLimiter } from './_lib/rateLimitMiddleware';
 *
 * export default async function handler(req, res) {
 *   // Apply rate limiting FIRST
 *   const rateLimitError = authLimiter(req, res);
 *   if (rateLimitError?.success === false) {
 *     return; // Rate limit hit, response already sent
 *   }
 *
 *   // Handle actual request
 *   // ...
 * }
 * ```
 */
