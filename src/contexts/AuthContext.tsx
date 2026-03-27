import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/envValidation";
import { createLogger } from "@/lib/logger";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, code: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, code: string) => Promise<{ error: Error | null }>;
  signInWithProvider: (
    provider: "google" | "facebook" | "apple",
  ) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const logger = createLogger("auth");
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

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
      if (isMounted) {
        setLoading(false);
      }
    });

    const initSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

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
    };

    void initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, code: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: code,
      });
      return { error: (error as Error | null) ?? null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signIn = async (email: string, code: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: code,
      });
      return { error: (error as Error | null) ?? null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signInWithProvider = async (
    provider: "google" | "facebook" | "apple",
  ) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

    try {
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
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn("Sign out failed.", toAuthError(error));
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error(MISSING_ENV_AUTH_ERROR) };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      return { error: (error as Error | null) ?? null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithProvider,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
