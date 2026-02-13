import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  date_of_birth: string | null;
  profile_photo: string | null;
  favorite_genres: number[];
  is_public: boolean;
  show_watchlist: boolean;
  show_stats: boolean;
  allow_recommendations: boolean;
  created_at: string;
  updated_at: string;
}

export const profileService = {
  // Get user profile from Supabase
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  // Create or update user profile
  async saveProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      // First check if profile exists
      const existing = await this.getProfile(userId);

      const profileData = {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existing) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        // Create new profile
        result = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      return result.data as UserProfile;
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  },

  // Subscribe to real-time profile updates
  subscribeToProfile(userId: string, callback: (profile: UserProfile) => void) {
    const channel = supabase
      .channel(`profiles_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown> | null;
          if (newRecord && (newRecord.user_id as string) === userId) {
            callback(newRecord as UserProfile);
          }
        }
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
        favorite_genres: [],
        is_public: false,
        show_watchlist: true,
        show_stats: true,
        allow_recommendations: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([DEFAULT_PROFILE])
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      console.error('Error initializing profile:', error);
      throw error;
    }
  },
};
