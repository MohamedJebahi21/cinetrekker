/**
 * Privacy-conscious product analytics wrapper for CineTrekker.
 * 
 * This module implements the approved event contract from 
 * docs/PRIVACY_CONSCIOUS_ANALYTICS_PLAN.md.
 * 
 * Guardrails:
 * - No user IDs, emails, or personal identifiers.
 * - No media titles or TMDB IDs.
 * - No free-form text or search queries.
 */

type SignupIntentProps = {
  entry_surface: "home" | "login" | "settings";
};

type AccountCreatedProps = {
  auth_method: "email" | "google";
};

type FirstTitleSavedProps = {
  media_kind: "movie" | "tv";
};

type FirstProgressRecordedProps = {
  media_kind: "movie" | "tv";
  progress_mode: "title" | "episode";
};

type AnalyticsEvents = {
  signup_intent: SignupIntentProps;
  account_created: AccountCreatedProps;
  first_title_saved: FirstTitleSavedProps;
  first_progress_recorded: FirstProgressRecordedProps;
};

/**
 * Tracks a product event using the configured analytics provider (Umami).
 * Fails silently if analytics are not configured or blocked.
 */
export function trackProductEvent<K extends keyof AnalyticsEvents>(
  eventName: K,
  props: AnalyticsEvents[K]
) {
  // Only track if Umami is available in the global scope
  const umami = (window as any).umami;
  
  if (typeof umami?.track === "function") {
    try {
      umami.track(eventName, props);
    } catch (error) {
      // Silent failure for analytics
      console.warn(`[Analytics] Failed to track ${eventName}:`, error);
    }
  }
}
