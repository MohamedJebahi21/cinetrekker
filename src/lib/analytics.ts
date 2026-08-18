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

type ActivationStep = "queue" | "watch" | "follow" | "taste";

type ActivationCompletedProps = {
  completed_required_steps: "3";
  optional_taste_complete: "yes" | "no";
};

type ActivationDismissedProps = {
  completed_required_steps: "0" | "1" | "2";
};

type ActivationStepOpenedProps = {
  step: ActivationStep;
};

type WebVitalProps = {
  metric: "CLS" | "INP" | "LCP";
  route: "home" | "search";
  rating: "good" | "needs_improvement" | "poor";
  value_bucket: string;
};

type AnalyticsEvents = {
  web_vital: WebVitalProps;
  signup_intent: SignupIntentProps;
  account_created: AccountCreatedProps;
  first_title_saved: FirstTitleSavedProps;
  first_progress_recorded: FirstProgressRecordedProps;
  activation_completed: ActivationCompletedProps;
  activation_dismissed: ActivationDismissedProps;
  activation_step_opened: ActivationStepOpenedProps;
};

type UmamiWindow = Window & {
  umami?: {
    track?: (eventName: string, properties?: Record<string, string>) => void;
  };
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
  const umami = (window as UmamiWindow).umami;
  
  if (typeof umami?.track === "function") {
    try {
      umami.track(eventName, props);
    } catch (error) {
      // Silent failure for analytics
      console.warn(`[Analytics] Failed to track ${eventName}:`, error);
    }
  }
}
