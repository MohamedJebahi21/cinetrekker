import { loadSupabaseModule } from "@/lib/loadSupabaseModule";
import { createLogger } from "@/lib/logger";
import type { PersonDetails } from "@/services/tmdb";

const logger = createLogger("profile-service");

const isMissingContentPolicySchemaError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const err = error as { code?: string; message?: string };
  if (err.code !== "PGRST204") return false;

  const message = (err.message || "").toLowerCase();

  const missingFields = [
    "adult_content_enabled",
    "age_verified",
    "age_verified_at",
    "strict_filtering_enabled",
    "moderate_filtering_enabled",
    "maturity_rating",
    "content_policy_confirmed_at",
  ];

  return missingFields.some((field) => message.includes(field));
};

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  date_of_birth: string | null;
  profile_photo: string | null;
  avatar_url: string | null;
  favorite_genres: number[];
  favorite_titles: string[];
  is_public: boolean;
  show_watchlist: boolean;
  show_stats: boolean;
  allow_recommendations: boolean;
  show_age: boolean;
  age_verified: number | null; // probably boolean or timestamp, but kept as-is
  age_verified_at: string | null;
  maturity_rating: "strict" | "moderate" | "none";
  content_policy_confirmed_at: string | null;
  adult_content_enabled: boolean;
  strict_filtering_enabled: boolean;
  moderate_filtering_enabled: boolean;
  actor_matches: PersonDetails[] | null;
  actor_matches_updated_at: string | null;
  actor_matches_context: {
    age: number | null;
    genres: number[];
    language?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

type ProfileWritePayload = Partial<UserProfile> & {
  user_id?: string;
  updated_at?: string;
};

type ProfileQueryResult<T = unknown> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

interface ProfileQueryBuilder {
  select(columns?: string): ProfileQueryBuilder;
  update(values: ProfileWritePayload): ProfileQueryBuilder;
  insert(values: ProfileWritePayload[]): ProfileQueryBuilder;
  eq(column: string, value: unknown): ProfileQueryBuilder;
  single<T = unknown>(): Promise<ProfileQueryResult<T>>;
}

interface ProfileDatabaseClient {
  from(table: "profiles"): ProfileQueryBuilder;
}

function asProfileDatabase(supabase: unknown): ProfileDatabaseClient {
  return supabase as ProfileDatabaseClient;
}

const DEFAULT_PROFILE: Omit<UserProfile, "id" | "user_id"> = {
  display_name: null,
  bio: null,
  date_of_birth: null,
  profile_photo: null,
  avatar_url: null,
  favorite_genres: [],
  favorite_titles: [],
  is_public: false,
  show_watchlist: true,
  show_stats: true,
  allow_recommendations: true,
  show_age: false,
  age_verified: null,
  age_verified_at: null,
  maturity_rating: "none",
  content_policy_confirmed_at: null,
  adult_content_enabled: false,
  strict_filtering_enabled: true,
  moderate_filtering_enabled: false,
  actor_matches: null,
  actor_matches_updated_at: null,
  actor_matches_context: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { supabase } = await loadSupabaseModule();
      const db = asProfileDatabase(supabase);
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Profile doesn't exist
        }
        logger.error("Error fetching profile", error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      logger.error("Unexpected error fetching profile", error);
      return null;
    }
  },

  async saveProfile(
    userId: string,
    profile: Partial<UserProfile>,
  ): Promise<UserProfile> {
    try {
      const { supabase } = await loadSupabaseModule();
      const db = asProfileDatabase(supabase);
      const existing = await this.getProfile(userId);

      const profileData: Partial<UserProfile> & { user_id: string; updated_at: string } = {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      };

      // Remove profile_photo validation (now using Supabase Storage URLs)
      if ("profile_photo" in profile) {
        profileData.profile_photo = profile.profile_photo ?? null;
      }

      let result;

      if (existing) {
        // Update
        result = await db
          .from("profiles")
          .update(profileData)
          .eq("user_id", userId)
          .select()
          .single();
      } else {
        // Insert new profile
        const insertData = {
          ...DEFAULT_PROFILE,
          ...profileData,
          created_at: new Date().toISOString(),
        };

        result = await db
          .from("profiles")
          .insert([insertData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      return result.data as UserProfile;
    } catch (error) {
      if (!isMissingContentPolicySchemaError(error)) {
        logger.error("Error saving profile", error);
      }
      throw error;
    }
  },

  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    return this.saveProfile(userId, updates);
  },

  async initializeProfile(userId: string): Promise<UserProfile> {
    try {
      const { supabase } = await loadSupabaseModule();
      const db = asProfileDatabase(supabase);
      const insertData = {
        user_id: userId,
        ...DEFAULT_PROFILE,
      };

      const { data, error } = await db
        .from("profiles")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      logger.error("Error initializing profile", error);
      throw error;
    }
  },

  async subscribeToProfile(
    userId: string,
    callback: (profile: UserProfile) => void,
  ) {
    const { supabase } = await loadSupabaseModule();
    return supabase
      .channel(`profiles_user_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRecord = payload.new as UserProfile | null;
          if (newRecord?.user_id === userId) {
            callback(newRecord);
          }
        },
      )
      .subscribe();
  },
};
