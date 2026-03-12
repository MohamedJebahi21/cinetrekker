export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      followed_title_state: {
        Row: {
          movie_id: string;
          media_type: string;
          tmdb_id: number;
          release_date: string | null;
          status: string | null;
          number_of_seasons: number | null;
          last_episode_air_date: string | null;
          last_episode_season_number: number | null;
          last_episode_number: number | null;
          updated_at: string;
        };
        Insert: {
          movie_id: string;
          media_type: string;
          tmdb_id: number;
          release_date?: string | null;
          status?: string | null;
          number_of_seasons?: number | null;
          last_episode_air_date?: string | null;
          last_episode_season_number?: number | null;
          last_episode_number?: number | null;
          updated_at?: string;
        };
        Update: {
          movie_id?: string;
          media_type?: string;
          tmdb_id?: number;
          release_date?: string | null;
          status?: string | null;
          number_of_seasons?: number | null;
          last_episode_air_date?: string | null;
          last_episode_season_number?: number | null;
          last_episode_number?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      movie_followers: {
        Row: {
          id: string;
          user_id: string;
          movie_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          movie_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          movie_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          movie_id: string;
          event_key: string | null;
          type: string;
          message: string;
          created_at: string;
          is_read: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          movie_id: string;
          event_key?: string | null;
          type: string;
          message: string;
          created_at?: string;
          is_read?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          movie_id?: string;
          event_key?: string | null;
          type?: string;
          message?: string;
          created_at?: string;
          is_read?: boolean;
        };
        Relationships: [];
      };
      followed_shows: {
        Row: {
          followed_at: string;
          id: string;
          last_watched_episode: number | null;
          last_watched_season: number | null;
          poster_path: string | null;
          show_id: number;
          show_name: string;
          user_id: string;
        };
        Insert: {
          followed_at?: string;
          id?: string;
          last_watched_episode?: number | null;
          last_watched_season?: number | null;
          poster_path?: string | null;
          show_id: number;
          show_name: string;
          user_id: string;
        };
        Update: {
          followed_at?: string;
          id?: string;
          last_watched_episode?: number | null;
          last_watched_season?: number | null;
          poster_path?: string | null;
          show_id?: number;
          show_name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          adult_content_enabled: boolean;
          actor_matches: Json | null;
          actor_matches_context: Json | null;
          actor_matches_updated_at: string | null;
          strict_filtering_enabled: boolean;
          moderate_filtering_enabled: boolean;
          maturity_rating: string;
          content_policy_confirmed_at: string | null;
          age_verified: number | null;
          age_verified_at: string | null;
          allow_recommendations: boolean | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          favorite_genres: number[] | null;
          id: string;
          is_public: boolean | null;
          profile_photo: string | null;
          show_age: boolean;
          show_stats: boolean | null;
          show_watchlist: boolean | null;
          updated_at: string;
          user_id: string;
          date_of_birth: string | null;
        };
        Insert: {
          adult_content_enabled?: boolean;
          actor_matches?: Json | null;
          actor_matches_context?: Json | null;
          actor_matches_updated_at?: string | null;
          strict_filtering_enabled?: boolean;
          moderate_filtering_enabled?: boolean;
          maturity_rating?: string;
          content_policy_confirmed_at?: string | null;
          age_verified?: number | null;
          age_verified_at?: string | null;
          allow_recommendations?: boolean | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          favorite_genres?: number[] | null;
          id?: string;
          is_public?: boolean | null;
          profile_photo?: string | null;
          show_age?: boolean;
          show_stats?: boolean | null;
          show_watchlist?: boolean | null;
          updated_at?: string;
          user_id: string;
          date_of_birth?: string | null;
        };
        Update: {
          adult_content_enabled?: boolean;
          actor_matches?: Json | null;
          actor_matches_context?: Json | null;
          actor_matches_updated_at?: string | null;
          strict_filtering_enabled?: boolean;
          moderate_filtering_enabled?: boolean;
          maturity_rating?: string;
          content_policy_confirmed_at?: string | null;
          age_verified?: number | null;
          age_verified_at?: string | null;
          allow_recommendations?: boolean | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          favorite_genres?: number[] | null;
          id?: string;
          is_public?: boolean | null;
          profile_photo?: string | null;
          show_age?: boolean;
          show_stats?: boolean | null;
          show_watchlist?: boolean | null;
          updated_at?: string;
          user_id?: string;
          date_of_birth?: string | null;
        };
        Relationships: [];
      };
      user_watched: {
        Row: {
          id: string;
          media_id: number;
          media_type: string;
          note: string | null;
          rating: number | null;
          status: string | null;
          user_id: string;
          watched_at: string;
        };
        Insert: {
          id?: string;
          media_id: number;
          media_type: string;
          note?: string | null;
          rating?: number | null;
          status?: string | null;
          user_id: string;
          watched_at?: string;
        };
        Update: {
          id?: string;
          media_id?: number;
          media_type?: string;
          note?: string | null;
          rating?: number | null;
          status?: string | null;
          user_id?: string;
          watched_at?: string;
        };
        Relationships: [];
      };
      user_watchlist: {
        Row: {
          added_at: string;
          id: string;
          media_id: number;
          media_type: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          id?: string;
          media_id: number;
          media_type: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          id?: string;
          media_id?: number;
          media_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      watched_episodes: {
        Row: {
          air_date: string | null;
          episode_name: string | null;
          episode_number: number;
          id: string;
          season_number: number;
          show_id: number;
          user_id: string;
          watched_at: string;
        };
        Insert: {
          air_date?: string | null;
          episode_name?: string | null;
          episode_number: number;
          id?: string;
          season_number: number;
          show_id: number;
          user_id: string;
          watched_at?: string;
        };
        Update: {
          air_date?: string | null;
          episode_name?: string | null;
          episode_number?: number;
          id?: string;
          season_number?: number;
          show_id?: number;
          user_id?: string;
          watched_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
