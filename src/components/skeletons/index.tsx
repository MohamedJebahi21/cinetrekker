import React, { useEffect, useState } from 'react';

type Props = { className?: string; delay?: number };

function useClientAnimate() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAnimate(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setAnimate(!e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);
  return animate;
}

export function MovieCardSkeleton({ className = '', delay = 0 }: Props) {
  const animate = useClientAnimate();
  const pulse = animate ? 'animate-pulse' : '';
  const delayStyle = animate ? { animationDelay: `${delay}ms` } as React.CSSProperties : undefined;

  return (
    <div aria-hidden className={`glass-card overflow-hidden rounded-xl ${className}`} style={{ minWidth: 0 }}>
      <div className={`w-full aspect-[2/3] rounded-t-xl dark:bg-gray-800 bg-gray-200 ${pulse}`} style={delayStyle} />
      <div className="p-3 space-y-2">
        <div className={`${pulse} h-4 rounded bg-gray-300 dark:bg-gray-700`} style={delayStyle} />
        <div className={`${pulse} h-3 w-1/2 rounded bg-gray-300 dark:bg-gray-700`} style={{ ...delayStyle, animationDelay: `${delay + 80}ms` }} />
        <div className="flex items-center justify-between mt-2">
          <div className={`${pulse} h-6 w-16 rounded bg-gray-300 dark:bg-gray-700`} style={{ ...delayStyle, animationDelay: `${delay + 160}ms` }} />
          <div className="flex items-center gap-2">
            <div className={`${pulse} w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700`} style={{ ...delayStyle, animationDelay: `${delay + 200}ms` }} />
            <div className={`${pulse} h-3 w-10 rounded bg-gray-300 dark:bg-gray-700`} style={{ ...delayStyle, animationDelay: `${delay + 220}ms` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSkeleton({ className = '', delay = 0 }: Props) {
  const animate = useClientAnimate();
  const pulse = animate ? 'animate-pulse' : '';
  const delayStyle = animate ? { animationDelay: `${delay}ms` } as React.CSSProperties : undefined;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className={`w-full h-56 md:h-[360px] dark:bg-gray-800 bg-gray-200 ${pulse}`} style={delayStyle} />
      <div className="absolute inset-0 flex items-end p-6">
        <div className="w-full max-w-3xl space-y-3">
          <div className={`${pulse} h-8 rounded bg-gray-300 dark:bg-gray-700`} style={delayStyle} />
          <div className={`${pulse} h-4 w-2/3 rounded bg-gray-300 dark:bg-gray-700`} style={{ ...delayStyle, animationDelay: `${delay + 100}ms` }} />
          <div className={`${pulse} h-3 w-1/3 rounded bg-gray-300 dark:bg-gray-700`} style={{ ...delayStyle, animationDelay: `${delay + 180}ms` }} />
        </div>
      </div>
    </div>
  );
}

export function CarouselSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-3 overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="min-w-[160px] md:min-w-[180px]">
          <MovieCardSkeleton delay={i * 100} />
        </div>
      ))}
    </div>
  );
}

export default {} as Record<string, unknown>;
