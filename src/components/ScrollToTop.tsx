import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component
 * Scrolls window to top whenever the location pathname changes.
 * Mount this inside the Router but outside Routes so all navigations reset scroll position.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch (e) {
      // fail silently in non-browser or restricted environments
      console.warn('ScrollToTop: unable to scroll to top', e);
    }
  }, [pathname]);

  return null;
}
