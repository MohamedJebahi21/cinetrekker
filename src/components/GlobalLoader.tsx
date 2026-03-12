import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Global loading indicator that appears during route transitions
 * Shows a progress bar at the top of the page
 */
export function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  if (!isLoading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-1/2 bg-gradient-to-r from-primary via-red-500 to-primary",
          "animate-pulse shadow-[0_0_10px_rgba(229,9,20,0.5)]"
        )}
        style={{
          animation: 'load 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}
      />
      <style>{`
        @keyframes load {
          0% { transform: translateX(-100%) scaleX(0.4); opacity: 0.5; }
          50% { transform: translateX(50%) scaleX(1); opacity: 1; }
          100% { transform: translateX(200%) scaleX(0.4); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
