import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { ENV } from "@/lib/envValidation";

const PERSISTENCE_PREFERENCE_KEY = "cinetrekker_auth_persistence";
const AUTH_TOKEN_KEY = /auth-token$/i;
const memoryStorage = new Map<string, string>();

function getBrowserStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readPersistencePreference(): boolean {
  const storage = getBrowserStorage("local");
  try {
    return storage?.getItem(PERSISTENCE_PREFERENCE_KEY) !== "session";
  } catch {
    return true;
  }
}

let rememberSession = readPersistencePreference();

function getActiveStorage(): Storage | null {
  return getBrowserStorage(rememberSession ? "local" : "session");
}

function getInactiveStorage(): Storage | null {
  return getBrowserStorage(rememberSession ? "session" : "local");
}

function safeGet(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | null, key: string, value: string): boolean {
  try {
    storage?.setItem(key, value);
    return Boolean(storage);
  } catch {
    return false;
  }
}

function safeRemove(storage: Storage | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function moveAuthTokens(from: Storage | null, to: Storage | null): void {
  if (!from || !to || from === to) return;

  try {
    for (let index = from.length - 1; index >= 0; index -= 1) {
      const key = from.key(index);
      if (!key || !AUTH_TOKEN_KEY.test(key)) continue;

      const value = from.getItem(key);
      if (value !== null && safeSet(to, key, value)) {
        safeRemove(from, key);
      }
    }
  } catch {
    // The auth storage adapter below still reads both stores as a fallback.
  }
}

const authStorage = {
  getItem(key: string): string | null {
    const activeValue = safeGet(getActiveStorage(), key);
    if (activeValue !== null) return activeValue;

    const inactiveValue = safeGet(getInactiveStorage(), key);
    return inactiveValue ?? memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (safeSet(getActiveStorage(), key, value)) {
      safeRemove(getInactiveStorage(), key);
      memoryStorage.delete(key);
      return;
    }

    memoryStorage.set(key, value);
  },
  removeItem(key: string): void {
    safeRemove(getActiveStorage(), key);
    safeRemove(getInactiveStorage(), key);
    memoryStorage.delete(key);
  },
};

/**
 * Select whether the next Supabase auth session should survive browser restarts.
 * The preference is deliberately non-sensitive; the session itself remains in
 * localStorage only when the user explicitly opts into Remember Me.
 */
export function setAuthPersistence(remember: boolean): void {
  rememberSession = remember;

  const preferenceStorage = getBrowserStorage("local");
  try {
    preferenceStorage?.setItem(
      PERSISTENCE_PREFERENCE_KEY,
      remember ? "persistent" : "session",
    );
  } catch {
    // Continue with the in-memory preference for this tab.
  }

  moveAuthTokens(getInactiveStorage(), getActiveStorage());
}

export function clearAuthPersistence(): void {
  authStorage.removeItem(PERSISTENCE_PREFERENCE_KEY);

  const local = getBrowserStorage("local");
  const session = getBrowserStorage("session");
  for (const storage of [local, session]) {
    if (!storage) continue;
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && AUTH_TOKEN_KEY.test(key)) {
          storage.removeItem(key);
        }
      }
    } catch {
      // Best-effort cleanup; Supabase signOut handles its active store.
    }
  }
}

export const supabase = createClient<Database>(
  ENV.VITE_SUPABASE_URL,
  ENV.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
