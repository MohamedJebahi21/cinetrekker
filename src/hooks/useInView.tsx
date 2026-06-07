import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Shared IntersectionObserver pool.
 *
 * Previously every card created its own IntersectionObserver, causing 20–100+
 * separate layout-poll observers on a single page. Now we reuse one observer
 * per distinct rootMargin/threshold key, reducing overhead by ~95%.
 */
type ObserverCallback = (inView: boolean) => void;

const observerPool = new Map<
  string,
  { observer: IntersectionObserver; callbacks: Map<Element, ObserverCallback> }
>();

function getPoolKey(rootMargin: string, threshold: number): string {
  return `${rootMargin}|${threshold}`;
}

function getSharedObserver(
  rootMargin: string,
  threshold: number,
): { observer: IntersectionObserver; callbacks: Map<Element, ObserverCallback> } {
  const key = getPoolKey(rootMargin, threshold);
  if (observerPool.has(key)) {
    return observerPool.get(key)!;
  }

  const callbacks = new Map<Element, ObserverCallback>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target);
        if (cb) cb(entry.isIntersecting);
      }
    },
    { rootMargin, threshold },
  );

  const entry = { observer, callbacks };
  observerPool.set(key, entry);
  return entry;
}

export interface UseInViewOptions {
  /** CSS margin around root viewport. Default: "200px" */
  rootMargin?: string;
  /** Intersection ratio threshold. Default: 0 */
  threshold?: number;
}

/**
 * Lightweight IntersectionObserver hook backed by a shared observer pool.
 *
 * Accepts primitive option values (not an object) so the options never change
 * reference between renders, avoiding runaway observer re-creation.
 */
export function useInView<T extends Element>(
  options?: UseInViewOptions,
): readonly [React.RefCallback<T>, boolean] {
  const rootMargin = options?.rootMargin ?? '200px';
  const threshold = options?.threshold ?? 0;

  const [inView, setInView] = useState(false);
  const elementRef = useRef<T | null>(null);

  // Stable ref callback — only runs when the DOM element mounts or unmounts.
  // Since rootMargin and threshold are primitives, the reference remains stable
  // even if the caller passes an inline options object.
  const callbackRef: React.RefCallback<T> = useCallback((node) => {
    if (node === null) {
      if (elementRef.current) {
        const { observer, callbacks } = getSharedObserver(rootMargin, threshold);
        observer.unobserve(elementRef.current);
        callbacks.delete(elementRef.current);
        elementRef.current = null;
      }
      return;
    }

    if (elementRef.current === node) {
      return;
    }

    // Clean up previous element if it existed
    if (elementRef.current) {
      const { observer, callbacks } = getSharedObserver(rootMargin, threshold);
      observer.unobserve(elementRef.current);
      callbacks.delete(elementRef.current);
    }

    elementRef.current = node;
    setInView(false);

    const { observer, callbacks } = getSharedObserver(rootMargin, threshold);
    const handleIntersection = (isIntersecting: boolean) => {
      if (isIntersecting) {
        setInView(true);
        // Unobserve once visible — "load once" semantics
        observer.unobserve(node);
        callbacks.delete(node);
      }
    };

    callbacks.set(node, handleIntersection);
    observer.observe(node);
  }, [rootMargin, threshold]);

  // Cleanup effect in case the hook itself unmounts
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        const { observer, callbacks } = getSharedObserver(rootMargin, threshold);
        observer.unobserve(elementRef.current);
        callbacks.delete(elementRef.current);
      }
    };
  }, [rootMargin, threshold]);

  return [callbackRef, inView] as const;
}
