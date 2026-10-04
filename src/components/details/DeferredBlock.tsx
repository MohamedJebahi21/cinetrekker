import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function DeferredBlock({
  children,
  className,
  placeholderClassName,
}: {
  children: React.ReactNode;
  className?: string;
  placeholderClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || ready) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "280px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div ref={ref} className={className}>
      {ready ? (
        children
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            "rounded-2xl border border-white/8 bg-white/3 animate-pulse",
            placeholderClassName
          )}
        />
      )}
    </div>
  );
}
