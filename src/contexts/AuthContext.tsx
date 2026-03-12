import React, { useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/contexts/auth-context";
import { isSupabaseConfigured } from "@/lib/envValidation";

function toAuthError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

const MISSING_ENV_AUTH_ERROR =
  "Supabase environment is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and restart the dev server.";

let didWarnMissingSupabaseEnv = false;

export function AuthProvider({ children }: { children: ReactNode }) {
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
        console.warn(
          "[Auth] Supabase env is missing. Auth requests are disabled until environment variables are configured.",
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
        console.warn(
          "[Auth] Failed to initialize session state",
          toAuthError(error),
        );
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
      console.warn("[Auth] Sign out failed", toAuthError(error));
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
