import { loadSupabaseModule } from "@/lib/loadSupabaseModule";
import type { UserProfile } from "./profile";

type DbError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type QueryResult<T = unknown> = {
  data: T | null;
  error: DbError | null;
  count?: number;
};

interface QueryBuilder {
  select(
    columns?: string,
    options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ): QueryBuilder;
  insert(values: unknown): QueryBuilder;
  update(values: unknown): QueryBuilder;
  delete(): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  in(column: string, values: readonly unknown[]): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  single<T = unknown>(): Promise<QueryResult<T>>;
  maybeSingle<T = unknown>(): Promise<QueryResult<T>>;
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): PromiseLike<TResult1 | TResult2>;
}

interface LooseSupabaseClient {
  from(table: string): QueryBuilder;
}

export interface Comment {
  id: string;
  user_id: string;
  media_id: number;
  media_type: "movie" | "tv";
  content: string;
  parent_id?: string | null;
  contains_spoiler?: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profile?: Partial<UserProfile> | null;
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

type CommentRow = Comment;
type ProfileRow = Pick<
  UserProfile,
  "user_id" | "display_name" | "avatar_url" | "bio"
>;

const asDb = (supabase: unknown) => supabase as LooseSupabaseClient;

export const socialService = {
  // --- Follow functions ---
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { data, error } = await db
      .from("follows")
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single<Follow>();

    if (error) throw error;
    return data as Follow;
  },

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    await db
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { count, error } = await db
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) throw error;
    return (count || 0) > 0;
  },

  async getFollowers(userId: string): Promise<Follow[]> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { data, error } = await db
      .from("follows")
      .select("*, profiles!follows_follower_id_fkey(*)")
      .eq("following_id", userId);

    if (error) throw error;
    return (data || []) as Follow[];
  },

  async getFollowing(userId: string): Promise<Follow[]> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { data, error } = await db
      .from("follows")
      .select("*, profiles!follows_following_id_fkey(*)")
      .eq("follower_id", userId);

    if (error) throw error;
    return (data || []) as Follow[];
  },

  // --- Comment functions ---
  async getComments(
    mediaId: number,
    mediaType: "movie" | "tv",
  ): Promise<Comment[]> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);

    const { data: commentsData, error: commentsError } = await db
      .from("comments")
      .select("*")
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .order("created_at", { ascending: false });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      throw commentsError;
    }

    const comments = Array.isArray(commentsData)
      ? (commentsData as CommentRow[])
      : [];

    if (comments.length === 0) {
      return [];
    }

    const userIds = comments.map((c) => c.user_id);
    const { data: profilesData, error: profilesError } = await db
      .from("profiles")
      .select("user_id, display_name, avatar_url, bio")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    const profiles = Array.isArray(profilesData)
      ? (profilesData as ProfileRow[])
      : [];

    const profileMap = new Map<string, Partial<UserProfile>>();
    profiles.forEach((profile) => {
      profileMap.set(profile.user_id, profile);
    });

    return comments.map((comment) => ({
      ...comment,
      profile: profileMap.get(comment.user_id) || null,
    }));
  },

  async addComment(
    userId: string,
    mediaId: number,
    mediaType: "movie" | "tv",
    content: string,
    parentId?: string,
    containsSpoiler?: boolean,
  ): Promise<Comment> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const payload: {
      user_id: string;
      media_id: number;
      media_type: "movie" | "tv";
      content: string;
      parent_id: string | null;
      contains_spoiler?: boolean;
    } = {
      user_id: userId,
      media_id: mediaId,
      media_type: mediaType,
      content,
      parent_id: parentId || null,
    };

    if (typeof containsSpoiler === "boolean") {
      payload.contains_spoiler = containsSpoiler;
    }

    const { data, error } = await db
      .from("comments")
      .insert(payload)
      .select()
      .single<Comment>();

    if (error) throw error;
    return data as Comment;
  },

  async deleteComment(commentId: string, _userId?: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    await db.from("comments").delete().eq("id", commentId);
  },

  async likeComment(userId: string, commentId: string): Promise<void> {
    console.log("likeComment called with userId:", userId, "commentId:", commentId);
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);

    const { data: comment, error: commentError } = await db
      .from("comments")
      .select("*")
      .eq("id", commentId)
      .single<Comment>();

    if (commentError) {
      console.error("Error fetching comment:", commentError);
      throw commentError;
    }
    if (!comment) {
      console.error("Comment not found");
      throw new Error("Comment not found");
    }

    console.log("Found comment:", comment);

    if (comment.user_id === userId) {
      console.log("User is liking their own comment, skipping notification");
      const { error: likeError } = await db.from("comment_likes").insert({
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

    const { data: likerProfile, error: likerError } = await db
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .single<Pick<UserProfile, "display_name" | "avatar_url">>();

    if (likerError) {
      console.error("Error fetching liker profile:", likerError);
    }
    console.log("Liker profile:", likerProfile);

    const likerName = likerProfile?.display_name || "Someone";
    const notificationMessage = `${likerName} liked your comment!`;
    const eventKey = `comment_like:${commentId}:${userId}`;
    console.log("Notification message:", notificationMessage);

    const { error: likeError } = await db.from("comment_likes").insert({
      user_id: userId,
      comment_id: commentId,
    });
    if (likeError) {
      console.error("Error inserting like:", likeError);
      throw likeError;
    }
    console.log("Successfully inserted like");

    const { error: notificationError } = await db.from("notifications").insert({
      user_id: comment.user_id,
      movie_id: `${comment.media_type}-${comment.media_id}`,
      event_key: eventKey,
      type: "comment_like",
      message: notificationMessage,
      is_read: false,
    });
    if (notificationError) {
      if (notificationError.code === "23505") {
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
    const db = asDb(supabase);
    await db
      .from("comment_likes")
      .delete()
      .eq("user_id", userId)
      .eq("comment_id", commentId);
  },

  async getLikedComments(userId: string): Promise<string[]> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { data, error } = await db
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", userId);

    if (error) throw error;
    const rows = Array.isArray(data) ? (data as Array<{ comment_id: string }>) : [];
    return rows.map((like) => like.comment_id);
  },

  async getUserProfileByUserId(userId: string): Promise<UserProfile | null> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single<UserProfile>();

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
    const db = asDb(supabase);
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("is_public", true);

    if (error) throw error;
    return (Array.isArray(data) ? data : []) as UserProfile[];
  },
};
