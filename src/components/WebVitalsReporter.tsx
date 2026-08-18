import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { trackProductEvent } from "@/lib/analytics";

type DiscoveryRoute = "home" | "search";
type VitalName = "CLS" | "INP" | "LCP";

function getDiscoveryRoute(pathname: string): DiscoveryRoute | null {
  if (pathname === "/") return "home";
  if (pathname === "/search") return "search";
  return null;
}

function getRating(metric: Metric): "good" | "needs_improvement" | "poor" {
  if (metric.rating === "good") return "good";
  if (metric.rating === "needs-improvement") return "needs_improvement";
  return "poor";
}

function getValueBucket(metric: Metric): string {
  if (metric.name === "CLS") {
    if (metric.value <= 0.1) return "0_to_0_1";
    if (metric.value <= 0.25) return "0_1_to_0_25";
    return "above_0_25";
  }

  if (metric.name === "INP") {
    if (metric.value <= 200) return "0_to_200ms";
    if (metric.value <= 500) return "201_to_500ms";
    return "above_500ms";
  }

  if (metric.value <= 2500) return "0_to_2500ms";
  if (metric.value <= 4000) return "2501_to_4000ms";
  return "above_4000ms";
}

function doNotTrackEnabled() {
  return (
    typeof navigator !== "undefined" &&
    ["1", "yes"].includes(navigator.doNotTrack?.toLowerCase() ?? "")
  );
}

/**
 * Measures the Core Web Vitals for CineTrekker's two main discovery routes.
 * It emits only coarse, consent-gated buckets through the existing Umami
 * wrapper—never a user ID, title, search query, media ID, or raw value.
 */
export function WebVitalsReporter() {
  const { pathname } = useLocation();
  const { hasAcceptedConsent } = useCookieConsent();
  const reported = useRef(new Set<string>());

  useEffect(() => {
    const route = getDiscoveryRoute(pathname);

    if (
      !import.meta.env.PROD ||
      !route ||
      !hasAcceptedConsent ||
      doNotTrackEnabled()
    ) {
      return;
    }

    const report = (metric: Metric) => {
      if (
        metric.name !== "CLS" &&
        metric.name !== "INP" &&
        metric.name !== "LCP"
      ) {
        return;
      }

      const key = `${route}:${metric.name}:${metric.id}`;
      if (reported.current.has(key)) return;
      reported.current.add(key);

      trackProductEvent("web_vital", {
        metric: metric.name as VitalName,
        route,
        rating: getRating(metric),
        value_bucket: getValueBucket(metric),
      });
    };

    onCLS(report);
    onINP(report);
    onLCP(report);
  }, [hasAcceptedConsent, pathname]);

  return null;
}

export default WebVitalsReporter;
