import { supabase } from "@/integrations/supabase/client";
import type { PersonDetails } from "@/services/tmdb";

const ALLOWED_PROFILE_PHOTO_DATA_URL =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PROFILE_PHOTO_DATA_URL_LENGTH = 3_000_000;

function isMissingContentPolicySchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code !== "PGRST204") return false;
  const message = (candidate.message || "").toLowerCase();
  return (
    message.includes("adult_content_enabled") ||
    message.includes("age_verified") ||
    message.includes("age_verified_at") ||
    message.includes("strict_filtering_enabled") ||
    message.includes("moderate_filtering_enabled") ||
    message.includes("maturity_rating") ||
    message.includes("content_policy_confirmed_at")
  );
}

function validateProfilePhotoDataUrl(
  value: string | null | undefined,
): string | null {
  // Now skipping Data URL validation since we are using Supabase Storage URLs.
  // Still maintaining the function signature to avoid breaking logic relying on it.
  return value || null;
}

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
  age_verified: number | null;
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

export const profileService = {
  // Get user profile from Supabase
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If profile doesn't exist, return null (not an error)
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  },

  // Create or update user profile
  async saveProfile(
    userId: string,
    profile: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    try {
      // First check for profile record
      const existing = await this.getProfile(userId);
      const profileData: Record<string, unknown> = {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      };
      if (Object.prototype.hasOwnProperty.call(profile, "profile_photo")) {
        profileData.profile_photo = validateProfilePhotoDataUrl(
          profile.profile_photo,
        );
      }

      let result;
      if (existing) {
        // Update existing profile
        result = await supabase
          .from("profiles")
          .update(profileData as never)
          .eq("user_id", userId)
          .select()
          .single();
      } else {
        // Create new profile
        result = await supabase
          .from("profiles")
          .insert([profileData] as never)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      return result.data as UserProfile;
    } catch (error) {
      if (!isMissingContentPolicySchemaError(error)) {
        console.error("Error saving profile:", error);
      }
      throw error;
    }
  },

  // Update user profile (alias for saveProfile used by settings)
  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    return this.saveProfile(userId, updates);
  },

  // Subscribe to real-time profile updates
  subscribeToProfile(userId: string, callback: (profile: UserProfile) => void) {
    const channel = supabase
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
          const newRecord = payload.new as Record<string, unknown> | null;
          if (newRecord && (newRecord.user_id as string) === userId) {
            callback(newRecord as unknown as UserProfile);
          }
        },
      )
      .subscribe();

    return channel;
  },

  // Initialize profile for new user
  async initializeProfile(userId: string): Promise<UserProfile> {
    try {
      const DEFAULT_PROFILE = {
        user_id: userId,
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
        maturity_rating: "none",
        actor_matches: null,
        actor_matches_updated_at: null,
        actor_matches_context: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .insert([DEFAULT_PROFILE])
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      console.error("Error initializing profile:", error);
      throw error;
    }
  },
};
