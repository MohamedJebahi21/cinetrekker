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

import { hasAcceptedCookieConsent } from "@/lib/cookieConsent";

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

type ProductFeature =
  | "calendar"
  | "notification_center"
  | "statistics"
  | "watchlist"
  | "recommendations";

type FeatureViewedProps = {
  feature: ProductFeature;
  surface: "public" | "account";
};

type FeatureActionProps = {
  feature: ProductFeature;
  action: "save_toggle" | "review_history" | "open_details";
};

type NotificationActionProps = {
  action: "opened" | "marked_read" | "archived";
  source: "inbox";
};

type ReliabilitySignalProps = {
  signal: "client_error" | "dependency_degraded" | "worker_failure";
  source: "client" | "server";
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
  feature_viewed: FeatureViewedProps;
  feature_action: FeatureActionProps;
  notification_action: NotificationActionProps;
  reliability_signal: ReliabilitySignalProps;
};

const allowedEventProperties: Record<keyof AnalyticsEvents, readonly string[]> = {
  web_vital: ["metric", "route", "rating", "value_bucket"],
  signup_intent: ["entry_surface"],
  account_created: ["auth_method"],
  first_title_saved: ["media_kind"],
  first_progress_recorded: ["media_kind", "progress_mode"],
  activation_completed: ["completed_required_steps", "optional_taste_complete"],
  activation_dismissed: ["completed_required_steps"],
  activation_step_opened: ["step"],
  feature_viewed: ["feature", "surface"],
  feature_action: ["feature", "action"],
  notification_action: ["action", "source"],
  reliability_signal: ["signal", "source"],
};

function hasSafeAnalyticsProperties(eventName: keyof AnalyticsEvents, props: Record<string, unknown>) {
  const allowedKeys = allowedEventProperties[eventName];
  const keys = Object.keys(props);

  return (
    keys.length === allowedKeys.length &&
    keys.every((key) => allowedKeys.includes(key)) &&
    Object.values(props).every(
      (value) => typeof value === "string" && value.length <= 64 && /^[a-z0-9_+.-]+$/i.test(value),
    )
  );
}

type UmamiWindow = Window & {
  umami?: {
    track?: (eventName: string, properties?: Record<string, string>) => void;
  };
};

function doNotTrackEnabled() {
  return (
    typeof navigator !== "undefined" &&
    ["1", "yes"].includes(navigator.doNotTrack?.toLowerCase() ?? "")
  );
}

/**
 * Tracks a product event only after explicit non-essential-cookie consent.
 * Fails silently when analytics are unavailable, consent is absent or revoked,
 * or the visitor has enabled Do Not Track.
 */
export function trackProductEvent<K extends keyof AnalyticsEvents>(
  eventName: K,
  props: AnalyticsEvents[K]
) {
  if (
    typeof window === "undefined" ||
    !hasAcceptedCookieConsent() ||
    doNotTrackEnabled()
  ) {
    return;
  }

  if (!hasSafeAnalyticsProperties(eventName, props)) {
    return;
  }

  const umami = (window as UmamiWindow).umami;

  if (typeof umami?.track === "function") {
    try {
      umami.track(eventName, props);
    } catch {
      // Analytics must never disrupt the product experience.
    }
  }
}
