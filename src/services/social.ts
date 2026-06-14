
import { loadSupabaseModule } from "@/lib/loadSupabaseModule";
import type { UserProfile } from "./profile";
import { v4 as uuidv4 } from "uuid";

export interface Comment {
  id: string;
  user_id: string;
  media_id: number;
  media_type: "movie" | "tv";
  content: string;
  parent_id?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profile?: Partial<UserProfile>;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface CommentLike {
  id: string;
  user_id: string;
  comment_id: string;
  created_at: string;
}

export const socialService = {
  // --- Follow functions ---
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("follows")
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    if (error) throw error;
    return data as Follow;
  },

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { supabase } = await loadSupabaseModule();
    const { count, error } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw error;
    return (count || 0) > 0;
  },

  async getFollowers(userId: string): Promise<Follow[]> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("follows")
      .select("*, profiles!follows_follower_id_fkey(*)")
      .eq("following_id", userId);
    if (error) throw error;
    return data as Follow[];
  },

  async getFollowing(userId: string): Promise<Follow[]> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("follows")
      .select("*, profiles!follows_following_id_fkey(*)")
      .eq("follower_id", userId);
    if (error) throw error;
    return data as Follow[];
  },

  // --- Comment functions ---
  async getComments(
    mediaId: number,
    mediaType: "movie" | "tv",
  ): Promise<Comment[]> {
    const { supabase } = await loadSupabaseModule();
    // First fetch comments without relation, then fetch profiles if needed
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .order("created_at", { ascending: false });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      throw commentsError;
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    // Now fetch profiles for the user_ids in comments
    const userIds = commentsData.map((c) => c.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url, bio")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Create a map of user_id to profile
    const profileMap = new Map();
    (profilesData || []).forEach((profile) => {
      profileMap.set(profile.user_id, profile);
    });

    // Combine comments with their profiles
    return commentsData.map((comment) => ({
      ...comment,
      profile: profileMap.get(comment.user_id) || null,
    })) as Comment[];
  },

  async addComment(
    userId: string,
    mediaId: number,
    mediaType: "movie" | "tv",
    content: string,
    parentId?: string,
  ): Promise<Comment> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: userId,
        media_id: mediaId,
        media_type: mediaType,
        content,
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  },

  async deleteComment(commentId: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    await supabase.from("comments").delete().eq("id", commentId);
  },

  async likeComment(userId: string, commentId: string): Promise<void> {
    console.log("likeComment called with userId:", userId, "commentId:", commentId);
    const { supabase } = await loadSupabaseModule();
    
    // First get the comment to find who wrote it
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("*")
      .eq("id", commentId)
      .single();
      
    if (commentError) {
      console.error("Error fetching comment:", commentError);
      throw commentError;
    }
    if (!comment) {
      console.error("Comment not found");
      throw new Error("Comment not found");
    }
    console.log("Found comment:", comment);
    
    // Don't create a notification if the user likes their own comment
    if (comment.user_id === userId) {
      console.log("User is liking their own comment, skipping notification");
      // Still insert the like, but no notification
      const { error: likeError } = await supabase.from("comment_likes").insert({
        user_id: userId,
        comment_id: commentId,
      });
      if (likeError) {
        console.error("Error inserting like:", likeError);
        throw likeError;
      }
      console.log("Successfully inserted like (own comment)");
      return;
    }
    
    // Get the user who is liking (to get their display name)
    const { data: likerProfile, error: likerError } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .single();
      
    if (likerError) {
      console.error("Error fetching liker profile:", likerError);
    }
    console.log("Liker profile:", likerProfile);
    
    const likerName = likerProfile?.display_name || "Someone";
    const notificationMessage = `${likerName} liked your comment!`;
    const eventKey = `comment_like:${commentId}:${userId}`;
    console.log("Notification message:", notificationMessage);
    
    // Now insert the like and notification in a transaction-like way
    const { error: likeError } = await supabase.from("comment_likes").insert({
      user_id: userId,
      comment_id: commentId,
    });
    if (likeError) {
      console.error("Error inserting like:", likeError);
      throw likeError;
    }
    console.log("Successfully inserted like");
    
    // Create notification for the comment author
    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: comment.user_id,
      movie_id: `${comment.media_type}-${comment.media_id}`,
      event_key: eventKey,
      type: "comment_like",
      message: notificationMessage,
      is_read: false,
    });
    if (notificationError) {
      if (notificationError.code === "23505") {
        // This is a duplicate key error - which means the user already liked this comment before
        // This is fine, just ignore it
        console.log("Notification already exists, skipping");
      } else {
        console.error("Error inserting notification:", notificationError);
      }
    } else {
      console.log("Successfully inserted notification");
    }
  },

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    await supabase
      .from("comment_likes")
      .delete()
      .eq("user_id", userId)
      .eq("comment_id", commentId);
  },

  async getLikedComments(userId: string): Promise<string[]> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map((like) => like.comment_id);
  },

  async getUserProfileByUserId(
    userId: string,
  ): Promise<UserProfile | null> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }
    return data as UserProfile;
  },

  async getAllPublicProfiles(): Promise<UserProfile[]> {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_public", true);

    if (error) throw error;
    return data as UserProfile[];
  },
};
