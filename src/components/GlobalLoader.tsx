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
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
      <div 
        className={cn(
          "h-full bg-gradient-to-r from-primary via-red-500 to-primary",
          "animate-pulse shadow-[0_0_10px_rgba(229,9,20,0.5)]"
        )}
        style={{
          width: '30%',
          animation: 'load 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}
      />
      <style>{`
        @keyframes load {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
