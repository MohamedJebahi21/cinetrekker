/**
 * Client-Side Rate Limiter
 * 
 * Prevents spam/abuse by limiting the frequency of user actions
 * Particularly useful for user reviews, comments, and form submissions
 * 
 * Usage:
 * ```typescript
 * import { reviewRateLimiter } from '@/lib/reviewRateLimiter';
 * 
 * const canSubmit = reviewRateLimiter.canSubmitReview(userId);
 * if (!canSubmit.allowed) {
 *   toast.error(`Please wait ${canSubmit.retryAfter} seconds before submitting again`);
 *   return;
 * }
 * 
 * // Submit review...
 * ```
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

/**
 * Generic rate limiter class
 */
class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if an action is allowed for the given key
   * @param key - Unique identifier (e.g., userId)
   * @returns {RateLimitResult} Whether the action is allowed and retry info
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry || now > entry.resetAt) {
      // Reset window
      this.cache.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      
      return { 
        allowed: true, 
        remaining: this.maxRequests - 1 
      };
    }

    if (entry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { 
        allowed: false, 
        retryAfter,
        remaining: 0 
      };
    }

    entry.count += 1;
    
    return { 
      allowed: true, 
      remaining: this.maxRequests - entry.count 
    };
  }

  /**
   * Reset the rate limit for a specific key
   * @param key - Unique identifier to reset
   */
  reset(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all rate limit entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get current status for a key without incrementing
   * @param key - Unique identifier
   */
  getStatus(key: string): { count: number; remaining: number; resetAt: number } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.resetAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }
}

/**
 * Review Rate Limiter
 * Limits: 5 reviews per minute per user
 */
class ReviewRateLimiter {
  private limiter: RateLimiter;

  constructor() {
    // 5 reviews per minute
    this.limiter = new RateLimiter(60 * 1000, 5);
  }

  /**
   * Check if a user can submit a review
   * @param userId - User identifier
   */
  canSubmitReview(userId: string): RateLimitResult {
    return this.limiter.check(userId);
  }

  /**
   * Reset rate limit for a user
   * @param userId - User identifier
   */
  reset(userId: string): void {
    this.limiter.reset(userId);
  }

  /**
   * Get current review submission status for a user
   * @param userId - User identifier
   */
  getStatus(userId: string) {
    return this.limiter.getStatus(userId);
  }
}

/**
 * Profile Update Rate Limiter
 * Limits: 10 updates per minute per user
 */
class ProfileUpdateRateLimiter {
  private limiter: RateLimiter;

  constructor() {
    // 10 updates per minute
    this.limiter = new RateLimiter(60 * 1000, 10);
  }

  /**
   * Check if a user can update their profile
   * @param userId - User identifier
   */
  canUpdateProfile(userId: string): RateLimitResult {
    return this.limiter.check(userId);
  }

  /**
   * Reset rate limit for a user
   * @param userId - User identifier
   */
  reset(userId: string): void {
    this.limiter.reset(userId);
  }
}

/**
 * Search Rate Limiter
 * Limits: 30 searches per minute per session
 */
class SearchRateLimiter {
  private limiter: RateLimiter;

  constructor() {
    // 30 searches per minute
    this.limiter = new RateLimiter(60 * 1000, 30);
  }

  /**
   * Check if a search is allowed
   * @param sessionId - Session identifier (can use userId or session token)
   */
  canSearch(sessionId: string): RateLimitResult {
    return this.limiter.check(sessionId);
  }

  /**
   * Reset rate limit for a session
   * @param sessionId - Session identifier
   */
  reset(sessionId: string): void {
    this.limiter.reset(sessionId);
  }
}

// Export singleton instances
export const reviewRateLimiter = new ReviewRateLimiter();
export const profileUpdateRateLimiter = new ProfileUpdateRateLimiter();
export const searchRateLimiter = new SearchRateLimiter();

// Export constructor for custom rate limiters
export { RateLimiter };
