import { useEffect, useState } from "react";

export function useLoadingTimeout(
  isLoading: boolean,
  timeoutMs: number = 12_000,
) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, timeoutMs]);

  return timedOut;
}
