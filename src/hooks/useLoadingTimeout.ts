import { useEffect, useState } from "react";

export function useLoadingTimeout(
  isLoading: boolean,
  timeoutMs: number = 12_000,
  resetKey?: string | number,
) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    setTimedOut(false);
    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, timeoutMs, resetKey]);

  return timedOut;
}
