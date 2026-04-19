import { createLogger } from "@/lib/logger";

const logger = createLogger("engagement");

const VISITS_KEY = "cinetrekker_engagement_visits_v1";
const EVENTS_KEY = "cinetrekker_engagement_events_v1";
const MAX_EVENTS = 200;
const EVENTS_PERSIST_DEBOUNCE_MS = 180;

type EngagementVisitState = {
  lastVisitDay: string | null;
  streakDays: number;
  lastActiveAt: number;
};

export type EngagementEventName =
  | "session_start"
  | "page_view"
  | "watchlist_add"
  | "watchlist_remove"
  | "watched_add"
  | "watched_remove"
  | "recommendation_hide"
  | "share_open"
  | "share_copy_link";

export type EngagementEvent = {
  name: EngagementEventName;
  at: string;
  context?: Record<string, string | number | boolean | null>;
};

let cachedEvents: EngagementEvent[] | null = null;
let persistTimer: number | null = null;
let idlePersistHandle: number | null = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function dayKeyFromTs(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function parseVisits(raw: string | null): EngagementVisitState {
  if (!raw) {
    return { lastVisitDay: null, streakDays: 0, lastActiveAt: Date.now() };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<EngagementVisitState>;
    return {
      lastVisitDay: typeof parsed.lastVisitDay === "string" ? parsed.lastVisitDay : null,
      streakDays: Number.isFinite(Number(parsed.streakDays))
        ? Math.max(0, Number(parsed.streakDays))
        : 0,
      lastActiveAt: Number.isFinite(Number(parsed.lastActiveAt))
        ? Number(parsed.lastActiveAt)
        : Date.now(),
    };
  } catch {
    return { lastVisitDay: null, streakDays: 0, lastActiveAt: Date.now() };
  }
}

function readStoredEvents(): EngagementEvent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as EngagementEvent[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function getEventCache(): EngagementEvent[] {
  if (cachedEvents) return cachedEvents;
  cachedEvents = readStoredEvents();
  return cachedEvents;
}

function persistEventCache() {
  if (!canUseStorage() || !cachedEvents) return;
  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(cachedEvents.slice(0, MAX_EVENTS)));
  } catch {
    // Ignore local analytics persistence failures.
  }
}

function scheduleEventPersist() {
  if (!canUseStorage()) return;

  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
  }

  persistTimer = window.setTimeout(() => {
    persistTimer = null;

    const flush = () => {
      idlePersistHandle = null;
      persistEventCache();
    };

    if ("requestIdleCallback" in window) {
      idlePersistHandle = window.requestIdleCallback(flush, { timeout: 1200 });
      return;
    }

    flush();
  }, EVENTS_PERSIST_DEBOUNCE_MS);
}

export function registerEngagementVisit(nowTs = Date.now()) {
  const today = dayKeyFromTs(nowTs);
  const yesterday = dayKeyFromTs(nowTs - 24 * 60 * 60 * 1000);

  if (!canUseStorage()) {
    return { streakDays: 1, comebackDays: 0, lastActiveAt: nowTs };
  }

  const current = parseVisits(window.localStorage.getItem(VISITS_KEY));
  const previousActiveAt = current.lastActiveAt;

  if (current.lastVisitDay === today) {
    const next = { ...current, lastActiveAt: nowTs };
    window.localStorage.setItem(VISITS_KEY, JSON.stringify(next));
    return {
      streakDays: next.streakDays || 1,
      comebackDays: Math.floor((nowTs - previousActiveAt) / (24 * 60 * 60 * 1000)),
      lastActiveAt: previousActiveAt,
    };
  }

  const nextStreak =
    current.lastVisitDay === yesterday ? Math.max(1, current.streakDays + 1) : 1;
  const next: EngagementVisitState = {
    lastVisitDay: today,
    streakDays: nextStreak,
    lastActiveAt: nowTs,
  };
  window.localStorage.setItem(VISITS_KEY, JSON.stringify(next));

  return {
    streakDays: next.streakDays,
    comebackDays: Math.floor((nowTs - previousActiveAt) / (24 * 60 * 60 * 1000)),
    lastActiveAt: previousActiveAt,
  };
}

export function readEngagementState() {
  if (!canUseStorage()) {
    return {
      streakDays: 0,
      lastActiveAt: Date.now(),
      inactivityHours: 0,
    };
  }
  const parsed = parseVisits(window.localStorage.getItem(VISITS_KEY));
  const inactivityHours = Math.floor((Date.now() - parsed.lastActiveAt) / (60 * 60 * 1000));
  return {
    streakDays: parsed.streakDays,
    lastActiveAt: parsed.lastActiveAt,
    inactivityHours: Math.max(0, inactivityHours),
  };
}

export function trackEngagementEvent(
  name: EngagementEventName,
  context?: Record<string, string | number | boolean | null>,
) {
  const event: EngagementEvent = {
    name,
    at: new Date().toISOString(),
    context,
  };

  logger.debug("event", event);
  if (!canUseStorage()) return;

  const events = getEventCache();
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
  scheduleEventPersist();
}

