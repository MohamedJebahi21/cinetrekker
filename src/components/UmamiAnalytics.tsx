import { useEffect } from "react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const SCRIPT_ID = "cinetrekker-umami-script";

function doNotTrackEnabled() {
  return (
    typeof navigator !== "undefined" &&
    ["1", "yes"].includes(navigator.doNotTrack?.toLowerCase() ?? "")
  );
}

function getValidatedScriptUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Loads Umami only after the visitor accepts non-essential cookies. Its public
 * configuration is injected at build time, excludes search parameters, and
 * leaves Core Web Vitals to CineTrekker's coarse custom-event reporter.
 */
export function UmamiAnalytics() {
  const { hasAcceptedConsent } = useCookieConsent();

  useEffect(() => {
    if (!import.meta.env.PROD || !hasAcceptedConsent || doNotTrackEnabled()) {
      return;
    }

    const scriptUrl = getValidatedScriptUrl(import.meta.env.VITE_UMAMI_SCRIPT_URL);
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim();

    if (!scriptUrl || !websiteId || document.getElementById(SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    // This script is deliberately injected only after consent, after document
    // parsing is complete. Explicit async execution is reliable for dynamic
    // scripts; `defer` only governs parser-discovered script tags.
    script.async = true;
    script.src = scriptUrl;
    script.dataset.websiteId = websiteId;
    script.dataset.excludeSearch = "true";
    script.dataset.doNotTrack = "true";
    script.dataset.performance = "false";
    script.onerror = () => {
      // Cleanly remove script if blocked by an ad-blocker or client extension
      script.remove();
    };

    document.head.appendChild(script);
  }, [hasAcceptedConsent]);

  return null;
}

export default UmamiAnalytics;
