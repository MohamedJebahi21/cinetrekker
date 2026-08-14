import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/envValidation";
import { createLogger } from "@/lib/logger";
import { loadSupabaseModule } from "@/lib/loadSupabaseModule";
import {
  clearAuthPersistence,
  setAuthPersistence,
} from "@/integrations/supabase/client";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    code: string,
    options?: { username?: string; rememberMe?: boolean },
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    code: string,
    options?: { rememberMe?: boolean },
  ) => Promise<{ error: Error | null }>;
  signInWithProvider: (
    provider: "google" | "facebook" | "apple",
    options?: { rememberMe?: boolean },
  ) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const logger = createLogger("auth");
const AUTH_INIT_TIMEOUT_MS = 4000;
const MISSING_ENV_AUTH_ERROR =
  "Supabase environment is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and restart the dev server.";
let didWarnMissingSupabaseEnv = false;

function toAuthError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      setUser(null);
      setLoading(false);
      if (!didWarnMissingSupabaseEnv) {
        didWarnMissingSupabaseEnv = true;
        logger.warn(
          "Supabase env is missing. Auth requests are disabled until environment variables are configured.",
        );
      }
      return;
    }

    let isMounted = true;
    let unsubscribe: () => void = () => {};

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    void (async () => {
      try {
        const { supabase } = await loadSupabaseModule();

        if (!isMounted) {
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          applySession(nextSession);
          if (isMounted) {
            setLoading(false);
          }
        });

        unsubscribe = () => subscription.unsubscribe();

        let timeoutId: number | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error("Auth session check timed out."));
          }, AUTH_INIT_TIMEOUT_MS);
        });

        let sessionResult: Awaited<ReturnType<typeof supabase.auth.getSession>>;
        try {
          sessionResult = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise,
          ]);
        } finally {
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
        }

        const {
          data: { session: currentSession },
          error,
        } = sessionResult;

        if (error) {
          throw error;
        }

        applySession(currentSession);
      } catch (error) {
        logger.warn("Failed to initialize session state.", toAuthError(error));
        applySession(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      code: string,
      options?: { username?: string; rememberMe?: boolean },
    ) => {
      if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

      setAuthPersistence(options?.rememberMe === true);

      try {
        const { supabase } = await loadSupabaseModule();
        const { error } = await supabase.auth.signUp({
        email,
        password: code,
        options: {
          data: {
            username: options?.username,
          },
        },
      });
        return { error: (error as Error | null) ?? null };
      } catch (error) {
        return { error: toAuthError(error) };
      }
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, code: string, options?: { rememberMe?: boolean }) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

      setAuthPersistence(options?.rememberMe === true);

      try {
        const { supabase } = await loadSupabaseModule();
        const { error } = await supabase.auth.signInWithPassword({
        email,
        password: code,
      });
        return { error: (error as Error | null) ?? null };
      } catch (error) {
        return { error: toAuthError(error) };
      }
    },
    [],
  );

  const signInWithProvider = useCallback(async (
    provider: "google" | "facebook" | "apple",
    options?: { rememberMe?: boolean },
  ) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

    setAuthPersistence(options?.rememberMe === true);

    try {
      const { supabase } = await loadSupabaseModule();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error: (error as Error | null) ?? null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      clearAuthPersistence();
      return;
    }

    try {
      const { supabase } = await loadSupabaseModule();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      const signedOutUserId = session?.user?.id;
      if (signedOutUserId && typeof window !== "undefined") {
        window.localStorage.removeItem(`cinetrekker_profile_${signedOutUserId}`);
      }

      setSession(null);
      setUser(null);
      clearAuthPersistence();
      window.dispatchEvent(new Event("cinetrekker:sign-out"));
    } catch (error) {
      logger.warn("Sign out failed.", toAuthError(error));
    }
  }, [session?.user?.id]);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

    try {
      const { supabase } = await loadSupabaseModule();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      return { error: (error as Error | null) ?? null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithProvider,
      resetPassword,
      signOut,
    }),
    [
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithProvider,
      resetPassword,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
