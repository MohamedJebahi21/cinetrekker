import { useEffect, useMemo, useState } from "react";
import { readEngagementState, registerEngagementVisit, trackEngagementEvent } from "@/lib/engagement";

let hasRegisteredSession = false;

export function useEngagementLoop() {
  const [streakDays, setStreakDays] = useState(0);
  const [comebackDays, setComebackDays] = useState(0);
  const [inactivityHours, setInactivityHours] = useState(0);

  useEffect(() => {
    const firstVisit = registerEngagementVisit();
    setStreakDays(firstVisit.streakDays);
    setComebackDays(Math.max(0, firstVisit.comebackDays));
    setInactivityHours(
      Math.max(0, Math.floor((Date.now() - firstVisit.lastActiveAt) / (60 * 60 * 1000))),
    );
    if (!hasRegisteredSession) {
      trackEngagementEvent("session_start", {
        streakDays: firstVisit.streakDays,
        comebackDays: Math.max(0, firstVisit.comebackDays),
      });
      hasRegisteredSession = true;
    }

    const syncFromState = () => {
      const state = readEngagementState();
      setStreakDays(state.streakDays);
      setInactivityHours(state.inactivityHours);
    };

    let intervalId: number | null = null;
    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(syncFromState, 60_000);
    };
    const stopPolling = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncFromState();
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const reminderTone = useMemo(() => {
    if (comebackDays >= 3 || inactivityHours >= 72) return "comeback";
    if (streakDays >= 7) return "streak";
    return "nudge";
  }, [comebackDays, inactivityHours, streakDays]);

  return {
    streakDays,
    comebackDays,
    inactivityHours,
    reminderTone,
  };
}

