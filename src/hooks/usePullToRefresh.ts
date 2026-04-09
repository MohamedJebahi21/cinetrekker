import { useEffect, useRef, useState } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
}

interface PullToRefreshHandlers {
  onTouchStart: (event: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 100,
  maxPull = 150,
}: PullToRefreshOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resetPull = () => {
    isPullingRef.current = false;
    startYRef.current = null;
    setPullDistance(0);
  };

  const handlers: PullToRefreshHandlers = {
    onTouchStart: (event) => {
      // Only start pull gesture if at top of page, not already pulling, and not refreshing
      if (window.scrollY !== 0 || isRefreshing || isPullingRef.current) return;
      startYRef.current = event.touches[0].clientY;
      isPullingRef.current = true;
    },
    onTouchMove: (event) => {
      // Validate pulling state and position
      if (!isPullingRef.current || startYRef.current === null || isRefreshing) {
        resetPull();
        return;
      }
      
      // If user scrolls past top, abort pull gesture
      if (window.scrollY !== 0) {
        resetPull();
        return;
      }

      const delta = event.touches[0].clientY - startYRef.current;
      
      // Only pull downward
      if (delta <= 0) {
        resetPull();
        return;
      }

      // Calculate visual resistance
      const resisted = Math.min(maxPull, delta * 0.6);
      setPullDistance(resisted);
      
      // Only prevent default if actively pulling (delta > threshold)
      // This prevents interference with normal scrolling
      if (delta > 20) {
        event.preventDefault();
      }
    },
    onTouchEnd: async () => {
      if (!isPullingRef.current || isRefreshing) {
        resetPull();
        return;
      }

      const shouldRefresh = pullDistance >= threshold;
      if (shouldRefresh) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      resetPull();
    },
    onTouchCancel: () => {
      resetPull();
    },
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.style.transform = `translateY(${pullDistance}px)`;
    container.style.transition = isPullingRef.current
      ? "none"
      : "transform 240ms ease-out";
    container.style.willChange = "transform";
  }, [pullDistance]);

  return {
    handlers,
    containerRef,
    pullDistance,
    isRefreshing,
    threshold,
  };
}
