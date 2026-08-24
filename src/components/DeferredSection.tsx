import { ReactNode, useEffect, useRef, useState } from "react";

interface DeferredSectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  rootMargin?: string;
}

/**
 * Delays non-critical content until it is close to the viewport. The fallback
 * reserves a modest, accessible loading region so later sections do not jump
 * abruptly into view. Browsers without IntersectionObserver render content
 * immediately rather than hiding it.
 */
export function DeferredSection({
  children,
  fallback = <div className="min-h-24 rounded-2xl bg-card/35" aria-hidden="true" />,
  className,
  rootMargin = "320px 0px",
}: DeferredSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {isNearViewport ? children : fallback}
    </div>
  );
}
