import { useEffect, useRef, useState } from "react";

// Shared observer registry to pool observers by options configuration
const observersMap = new Map<string, IntersectionObserver>();
const callbacksMap = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>();

function getPooledObserver(options: IntersectionObserverInit): IntersectionObserver {
  const cacheKey = JSON.stringify({
    rootMargin: options.rootMargin || "200px",
    threshold: options.threshold || 0,
  });

  let observer = observersMap.get(cacheKey);
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const callback = callbacksMap.get(entry.target);
        if (callback) {
          callback(entry);
        }
      });
    }, options);
    observersMap.set(cacheKey, observer);
  }
  return observer;
}

export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  // Extract primitive fields to avoid reference equality checks in deps array
  const rootMargin = options?.rootMargin || "200px";
  const threshold = options?.threshold || 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const pooledObserver = getPooledObserver({ rootMargin, threshold });

    callbacksMap.set(el, (entry) => {
      if (entry.isIntersecting) {
        setInView(true);
        // once visible, unobserve to avoid extra rendering / CPU cycles
        pooledObserver.unobserve(el);
      }
    });

    pooledObserver.observe(el);

    return () => {
      if (el) {
        pooledObserver.unobserve(el);
        callbacksMap.delete(el);
      }
    };
  }, [rootMargin, threshold]);

  return [ref, inView] as const;
}
