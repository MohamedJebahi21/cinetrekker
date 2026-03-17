import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { profileService } from "@/services/profile";
import { useToast } from "@/hooks/use-toast";
import { AgeVerificationDialog } from "@/components/AgeVerificationDialog";
import {
  MaturityRating,
  SafetyLevel,
  maturityToFlags,
} from "@/lib/contentFilter";

type ContentPolicyState = {
  ageVerified: boolean;
  maturityRating: SafetyLevel;
};

type ContentPolicyContextType = ContentPolicyState & {
  strictFiltering: boolean;
  moderateFiltering: boolean;
  adultContentEnabled: boolean;
  isAgeKnown: boolean;
  loading: boolean;
  setAge: (age: number) => Promise<void>;
  setMaturityRating: (
    level: MaturityRating,
  ) => Promise<{ syncedRemotely: boolean }>;
  setStrictFiltering: (enabled: boolean) => Promise<void>;
  setModerateFiltering: (enabled: boolean) => Promise<void>;
};

type LegacyContentPolicyState = Partial<{
  age: number | null;
  strictFiltering: boolean;
  moderateFiltering: boolean;
  adultContentEnabled: boolean;
}>;

const GUEST_STORAGE_KEY = "cinetrekker_content_policy_guest";
const GLOBAL_STORAGE_KEY = "cinetrekker_content_policy";

const ContentPolicyContext = createContext<
  ContentPolicyContextType | undefined
>(undefined);

function isMissingSchemaError(error: unknown, columnNames: string[]): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code !== "PGRST204") return false;
  const message = (candidate.message || "").toLowerCase();
  return columnNames.some((columnName) =>
    message.includes(columnName.toLowerCase()),
  );
}

function isMissingMaturitySchemaError(error: unknown): boolean {
  return isMissingSchemaError(error, [
    "maturity_rating",
    "content_policy_confirmed_at",
  ]);
}

function isMissingLegacyPolicySchemaError(error: unknown): boolean {
  return isMissingSchemaError(error, [
    "adult_content_enabled",
    "age_verified",
    "age_verified_at",
    "strict_filtering_enabled",
    "moderate_filtering_enabled",
  ]);
}

function defaultState(): ContentPolicyState {
  return { ageVerified: false, maturityRating: SafetyLevel.NONE };
}

function normalizeMaturity(level: MaturityRating): SafetyLevel {
  if (
    level === SafetyLevel.STRICT ||
    level === SafetyLevel.MODERATE ||
    level === SafetyLevel.NONE
  )
    return level;
  return SafetyLevel.NONE;
}

function deriveMaturityFromLegacy(
  payload: LegacyContentPolicyState,
): MaturityRating {
  if (
    typeof payload.strictFiltering === "boolean" ||
    typeof payload.moderateFiltering === "boolean"
  ) {
    if (payload.strictFiltering === true) return "strict";
    if (payload.moderateFiltering === true) return "moderate";
    return "none";
  }

  if (typeof payload.adultContentEnabled === "boolean") {
    return payload.adultContentEnabled ? "none" : "strict";
  }

  if (typeof payload.age === "number") {
    return payload.age < 18 ? "strict" : "none";
  }

  return "none";
}

function normalizeState(payload: unknown): ContentPolicyState {
  if (!payload || typeof payload !== "object") return defaultState();
  const record = payload as Record<string, unknown>;

  const maturity = record.maturityRating;
  if (
    maturity === SafetyLevel.STRICT ||
    maturity === SafetyLevel.MODERATE ||
    maturity === SafetyLevel.NONE
  ) {
    return {
      ageVerified: record.ageVerified === true,
      maturityRating: maturity,
    };
  }

  const legacy = payload as LegacyContentPolicyState;
  const hasLegacyAge = typeof legacy.age === "number";
  return {
    ageVerified: hasLegacyAge || record.ageVerified === true,
    maturityRating: deriveMaturityFromLegacy(legacy),
  };
}

function readPolicyFromStorage(key: string): ContentPolicyState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writePolicyToStorage(key: string, value: ContentPolicyState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function stateFromProfile(
  profile: Record<string, unknown>,
): ContentPolicyState {
  const hasMaturityField = Object.prototype.hasOwnProperty.call(
    profile,
    "maturity_rating",
  );
  if (hasMaturityField) {
    const maturity = profile.maturity_rating;
    const maturityRating: SafetyLevel =
      maturity === SafetyLevel.STRICT ||
      maturity === SafetyLevel.MODERATE ||
      maturity === SafetyLevel.NONE
        ? maturity
        : SafetyLevel.NONE;

    const confirmed =
      profile.content_policy_confirmed_at !== null ||
      profile.age_verified_at !== null ||
      typeof profile.age_verified === "number";

    return {
      ageVerified: Boolean(confirmed),
      maturityRating,
    };
  }

  const legacyAge =
    typeof profile.age_verified === "number" ? profile.age_verified : null;
  return {
    ageVerified: legacyAge !== null || profile.age_verified_at !== null,
    maturityRating: deriveMaturityFromLegacy({
      age: legacyAge,
      strictFiltering: profile.strict_filtering_enabled === true,
      moderateFiltering: profile.moderate_filtering_enabled === true,
      adultContentEnabled: profile.adult_content_enabled === true,
    }),
  };
}

function toLegacyFlags(level: MaturityRating): {
  strict_filtering_enabled: boolean;
  moderate_filtering_enabled: boolean;
  adult_content_enabled: boolean;
} {
  const flags = maturityToFlags(level);
  return {
    strict_filtering_enabled: flags.strictFiltering,
    moderate_filtering_enabled: flags.moderateFiltering,
    adult_content_enabled: level === SafetyLevel.NONE,
  };
}

export function ContentPolicyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ContentPolicyState>(defaultState());
  const [loading, setLoading] = useState(true);
  const [savingAge, setSavingAge] = useState(false);

  const remoteMaturityUnsupportedRef = useRef(false);
  const remoteLegacyUnsupportedRef = useRef(false);
  const remoteUnsupportedToastShownRef = useRef(false);
  const bootstrapTokenRef = useRef(0);
  const lastGuestSyncUserRef = useRef<string | null>(null);

  const persistLocalMirrors = useCallback(
    (next: ContentPolicyState) => {
      writePolicyToStorage(GLOBAL_STORAGE_KEY, next);
      if (!user?.id) {
        writePolicyToStorage(GUEST_STORAGE_KEY, next);
      }
    },
    [user?.id],
  );

  const persistRemote = useCallback(
    async (next: ContentPolicyState, includeConfirmedAt: boolean) => {
      if (!user?.id) return;

      const confirmedAt = includeConfirmedAt
        ? new Date().toISOString()
        : undefined;
      const legacyPayload = {
        ...toLegacyFlags(next.maturityRating),
        age_verified: null,
        age_verified_at: confirmedAt,
      };

      const maturityPayload = {
        ...legacyPayload,
        maturity_rating: next.maturityRating,
        content_policy_confirmed_at: confirmedAt,
      };

      if (!remoteMaturityUnsupportedRef.current) {
        try {
          await profileService.updateProfile(user.id, maturityPayload);
          return;
        } catch (error) {
          if (isMissingMaturitySchemaError(error)) {
            remoteMaturityUnsupportedRef.current = true;
          } else {
            throw error;
          }
        }
      }

      if (remoteLegacyUnsupportedRef.current) return;
      try {
        await profileService.updateProfile(user.id, legacyPayload);
      } catch (error) {
        if (isMissingLegacyPolicySchemaError(error)) {
          remoteLegacyUnsupportedRef.current = true;
          if (!remoteUnsupportedToastShownRef.current) {
            remoteUnsupportedToastShownRef.current = true;
            toast({
              title: "Server schema update pending",
              description:
                "Safety preferences are saved locally until database migration is applied.",
            });
          }
          return;
        }
        throw error;
      }
    },
    [toast, user?.id],
  );

  const syncGuestToUser = useCallback(
    async (userId: string): Promise<ContentPolicyState | null> => {
      const guestPolicy = readPolicyFromStorage(GUEST_STORAGE_KEY);
      if (!guestPolicy || !guestPolicy.ageVerified) return null;
      if (lastGuestSyncUserRef.current === userId) return guestPolicy;
      await persistRemote(guestPolicy, true);
      lastGuestSyncUserRef.current = userId;
      return guestPolicy;
    },
    [persistRemote],
  );

  useEffect(() => {
    let isMounted = true;
    const bootstrapToken = ++bootstrapTokenRef.current;

    const bootstrap = async () => {
      setLoading(true);
      const persistedPolicy = readPolicyFromStorage(GLOBAL_STORAGE_KEY);
      const guestPolicy = readPolicyFromStorage(GUEST_STORAGE_KEY);

      if (persistedPolicy?.ageVerified) {
        setState(persistedPolicy);
      }

      if (!user?.id) {
        if (!isMounted || bootstrapTokenRef.current !== bootstrapToken) return;
        setState(guestPolicy ?? persistedPolicy ?? defaultState());
        setLoading(false);
        return;
      }

      try {
        let profile = await profileService.getProfile(user.id);
        if (!profile) {
          profile = await profileService.initializeProfile(user.id);
        }

        if (
          !isMounted ||
          bootstrapTokenRef.current !== bootstrapToken ||
          !profile
        )
          return;

        const profileState = stateFromProfile(
          profile as unknown as Record<string, unknown>,
        );
        if (profileState.ageVerified) {
          setState(profileState);
          persistLocalMirrors(profileState);
        } else if (persistedPolicy?.ageVerified) {
          setState(persistedPolicy);
          persistLocalMirrors(persistedPolicy);

          try {
            await persistRemote(persistedPolicy, true);
            await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
            await queryClient.invalidateQueries({ queryKey: ["search"] });
            await queryClient.invalidateQueries({ queryKey: ["details"] });
          } catch (syncError) {
            console.error(
              "Error syncing persisted age verification:",
              syncError,
            );
          }
        } else {
          const syncedGuest = await syncGuestToUser(user.id);
          if (!isMounted || bootstrapTokenRef.current !== bootstrapToken)
            return;
          const next = syncedGuest ?? profileState;
          setState(next);
          persistLocalMirrors(next);
        }
      } catch (error) {
        console.error("Error loading content policy:", error);
        if (!isMounted || bootstrapTokenRef.current !== bootstrapToken) return;
        setState(persistedPolicy ?? guestPolicy ?? defaultState());
        toast({
          title: "Content preferences unavailable",
          description: "Using local preferences for this session.",
          variant: "destructive",
        });
      } finally {
        if (isMounted && bootstrapTokenRef.current === bootstrapToken) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    persistLocalMirrors,
    persistRemote,
    queryClient,
    syncGuestToUser,
    toast,
    user?.id,
  ]);

  const setMaturityRating = useCallback(
    async (level: MaturityRating) => {
      const normalized = normalizeMaturity(level);
      const next = { ...state, maturityRating: normalized, ageVerified: true };
      setState(next);
      persistLocalMirrors(next);

      try {
        await persistRemote(next, false);
        await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        await queryClient.invalidateQueries({ queryKey: ["search"] });
        await queryClient.invalidateQueries({ queryKey: ["details"] });
        return { syncedRemotely: true };
      } catch (error) {
        console.error("Error saving maturity preference:", error);
        toast({
          title: "Saved locally",
          description:
            "Safety preference is active on this device and will sync when server update succeeds.",
          variant: "destructive",
        });
        return { syncedRemotely: false };
      }
    },
    [persistLocalMirrors, persistRemote, queryClient, state, toast],
  );

  const setAge = useCallback(
    async (age: number) => {
      const next: ContentPolicyState = {
        ageVerified: true,
        maturityRating: age < 18 ? SafetyLevel.STRICT : SafetyLevel.NONE,
      };

      setSavingAge(true);
      setState(next);
      persistLocalMirrors(next);

      try {
        await persistRemote(next, true);
        await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        await queryClient.invalidateQueries({ queryKey: ["search"] });
        await queryClient.invalidateQueries({ queryKey: ["details"] });
      } catch (error) {
        console.error("Error saving age verification:", error);
        toast({
          title: "Could not sync age preference",
          description:
            "Your current session keeps this setting, but server sync failed.",
          variant: "destructive",
        });
      } finally {
        setSavingAge(false);
      }
    },
    [persistLocalMirrors, persistRemote, queryClient, toast],
  );

  const setStrictFiltering = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await setMaturityRating(SafetyLevel.STRICT);
        return;
      }
      if (state.maturityRating === SafetyLevel.STRICT) {
        await setMaturityRating(SafetyLevel.MODERATE);
      }
    },
    [setMaturityRating, state.maturityRating],
  );

  const setModerateFiltering = useCallback(
    async (enabled: boolean) => {
      if (state.maturityRating === SafetyLevel.STRICT) {
        return;
      }

      if (enabled) {
        if (state.maturityRating === SafetyLevel.NONE) {
          await setMaturityRating(SafetyLevel.MODERATE);
        }
        return;
      }
      if (state.maturityRating === SafetyLevel.MODERATE) {
        await setMaturityRating(SafetyLevel.NONE);
      }
    },
    [setMaturityRating, state.maturityRating],
  );

  const { strictFiltering, moderateFiltering } = maturityToFlags(
    state.maturityRating,
  );
  const adultContentEnabled = state.maturityRating === SafetyLevel.NONE;
  const shouldPromptAgeVerification =
    Boolean(user?.id) &&
    location.pathname === "/settings" &&
    !loading &&
    !state.ageVerified;

  const value = useMemo<ContentPolicyContextType>(
    () => ({
      ageVerified: state.ageVerified,
      maturityRating: state.maturityRating,
      strictFiltering,
      moderateFiltering,
      adultContentEnabled,
      isAgeKnown: state.ageVerified,
      loading,
      setAge,
      setMaturityRating,
      setStrictFiltering,
      setModerateFiltering,
    }),
    [
      adultContentEnabled,
      loading,
      moderateFiltering,
      setAge,
      setMaturityRating,
      setModerateFiltering,
      setStrictFiltering,
      state.ageVerified,
      state.maturityRating,
      strictFiltering,
    ],
  );

  return (
    <ContentPolicyContext.Provider value={value}>
      {children}
      <AgeVerificationDialog
        open={shouldPromptAgeVerification}
        onSubmit={setAge}
        isSaving={savingAge}
      />
    </ContentPolicyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContentPolicy(): ContentPolicyContextType {
  const context = useContext(ContentPolicyContext);
  if (!context) {
    throw new Error(
      "useContentPolicy must be used within ContentPolicyProvider",
    );
  }
  return context;
}
