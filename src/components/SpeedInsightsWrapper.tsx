import { useEffect } from 'react';
import injectSpeedInsights from '@vercel/speed-insights';

/**
 * Generic Speed Insights injector for React apps.
 * This uses the official `injectSpeedInsights` function from
 * `@vercel/speed-insights` and runs it once on mount.
 */
export function SpeedInsightsWrapper() {
  useEffect(() => {
    try {
      injectSpeedInsights();
    } catch (err) {
      // Non-fatal — log for visibility
      console.warn('injectSpeedInsights failed:', err);
    }
  }, []);

  return null;
}

export default SpeedInsightsWrapper;
