import { loadSupabaseModule } from "@/lib/loadSupabaseModule";
import { createLogger } from "@/lib/logger";
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
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<QueryResult<T>>;
}

/**
 * Curated, non-sensitive slice of a profile that is safe to expose to any
 * viewer. Mirrors exactly the columns returned by the `get_public_profile`
 * SECURITY DEFINER function — never date_of_birth, maturity/filtering flags,
 * or show_* preference toggles.
 */
export interface PublicProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  profile_photo: string | null;
  favorite_genres: number[] | null;
  favorite_titles: string[] | null;
  is_public: boolean;
  created_at: string;
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

export interface PublicProfileSummary {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  favorite_genres: number[] | null;
  favorite_titles: string[] | null;
  is_public: boolean;
  created_at: string;
  followers_count: number;
  following_count: number;
  comments_count: number;
  movies_count: number;
  episodes_count: number;
  shows_count: number;
}

export interface PublicProfileComment {
  id: string;
  media_id: number;
  media_type: "movie" | "tv";
  content: string;
  parent_id: string | null;
  contains_spoiler: boolean;
  likes_count: number;
  created_at: string;
}

export interface PublicConnectionProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  favorite_genres: number[] | null;
  favorite_titles: string[] | null;
  created_at: string;
  followers_count: number;
}

export interface DirectoryProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  favorite_titles: string[] | null;
  created_at: string;
  followers_count: number;
  comments_count: number;
}

type UnknownRecord = Record<string, unknown>;

type CommentRow = Comment;
type ProfileRow = Pick<
  UserProfile,
  "user_id" | "display_name" | "avatar_url" | "bio"
>;

const asDb = (supabase: unknown) => supabase as LooseSupabaseClient;
const logger = createLogger("social");

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(row: UnknownRecord, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNullableString(row: UnknownRecord, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function readNumberArray(row: UnknownRecord, key: string): number[] | null {
  const value = row[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "number")) {
    return null;
  }
  return value;
}

function readStringArray(row: UnknownRecord, key: string): string[] | null {
  const value = row[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }
  return value;
}

function readCount(row: UnknownRecord, key: string): number {
  const value = row[key];
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

function parsePublicProfileSummary(value: unknown): PublicProfileSummary | null {
  if (!isRecord(value)) return null;
  const userId = readRequiredString(value, "user_id");
  const createdAt = readRequiredString(value, "created_at");
  if (!userId || !createdAt || typeof value.is_public !== "boolean") return null;

  return {
    user_id: userId,
    display_name: readNullableString(value, "display_name"),
    bio: readNullableString(value, "bio"),
    avatar_url: readNullableString(value, "avatar_url"),
    favorite_genres: readNumberArray(value, "favorite_genres"),
    favorite_titles: readStringArray(value, "favorite_titles"),
    is_public: value.is_public,
    created_at: createdAt,
    followers_count: readCount(value, "followers_count"),
    following_count: readCount(value, "following_count"),
    comments_count: readCount(value, "comments_count"),
    movies_count: readCount(value, "movies_count"),
    episodes_count: readCount(value, "episodes_count"),
    shows_count: readCount(value, "shows_count"),
  };
}

function parsePublicProfileComment(value: unknown): PublicProfileComment | null {
  if (!isRecord(value)) return null;
  const id = readRequiredString(value, "id");
  const content = readRequiredString(value, "content");
  const createdAt = readRequiredString(value, "created_at");
  const mediaType = value.media_type;
  const mediaId = value.media_id;
  if (
    !id ||
    !content ||
    !createdAt ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof mediaId !== "number"
  ) {
    return null;
  }

  return {
    id,
    media_id: mediaId,
    media_type: mediaType,
    content,
    parent_id: readNullableString(value, "parent_id"),
    contains_spoiler: value.contains_spoiler === true,
    likes_count: readCount(value, "likes_count"),
    created_at: createdAt,
  };
}

function parsePublicConnectionProfile(
  value: unknown,
): PublicConnectionProfile | null {
  if (!isRecord(value)) return null;
  const userId = readRequiredString(value, "user_id");
  const createdAt = readRequiredString(value, "created_at");
  if (!userId || !createdAt) return null;

  return {
    user_id: userId,
    display_name: readNullableString(value, "display_name"),
    bio: readNullableString(value, "bio"),
    avatar_url: readNullableString(value, "avatar_url"),
    favorite_genres: readNumberArray(value, "favorite_genres"),
    favorite_titles: readStringArray(value, "favorite_titles"),
    created_at: createdAt,
    followers_count: readCount(value, "followers_count"),
  };
}

function parseDirectoryProfile(value: unknown): DirectoryProfile | null {
  const connection = parsePublicConnectionProfile(value);
  if (!connection || !isRecord(value)) return null;

  return {
    user_id: connection.user_id,
    display_name: connection.display_name,
    bio: connection.bio,
    avatar_url: connection.avatar_url,
    favorite_titles: connection.favorite_titles,
    created_at: connection.created_at,
    followers_count: connection.followers_count,
    comments_count: readCount(value, "comments_count"),
  };
}

async function getPublicRpcRows(
  functionName: string,
  args: Record<string, unknown>,
): Promise<unknown[]> {
  try {
    const { supabase } = await loadSupabaseModule();
    const { data, error } = await asDb(supabase).rpc<unknown>(functionName, args);
    if (error) {
      logger.error(`Public social RPC failed: ${functionName}`, error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error(`Public social RPC failed: ${functionName}`, error);
    return [];
  }
}

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
    const { error } = await db
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) throw error;
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
      logger.error("Error fetching comments:", commentsError);
      throw commentsError;
    }

    const comments = Array.isArray(commentsData)
      ? (commentsData as CommentRow[])
      : [];

    if (comments.length === 0) {
      return [];
    }

    const userIds = comments.map((c) => c.user_id);
    const { data: profilesData, error: profilesError } = await db.rpc<ProfileRow[]>(
      "get_public_profile_summaries",
      { target_user_ids: [...new Set(userIds)] },
    );

    if (profilesError) {
      logger.error("Error fetching profiles:", profilesError);
    }

    const profiles = Array.isArray(profilesData)
      ? (profilesData as ProfileRow[])
      : [];

    const profileMap = new Map<string, Partial<UserProfile>>();
    profiles.forEach((profile) => {
      profileMap.set(profile.user_id, {
        ...profile,
        // Ensure avatar_url is populated from the curated public RPC result
        avatar_url: (profile as { avatar_url?: string | null }).avatar_url ?? null,
      });
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
    const { error } = await db.from("comments").delete().eq("id", commentId);

    if (error) throw error;
  },

  async likeComment(userId: string, commentId: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { error } = await db.from("comment_likes").insert({
      user_id: userId,
      comment_id: commentId,
    });

    if (error) throw error;
  },

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { error } = await db
      .from("comment_likes")
      .delete()
      .eq("user_id", userId)
      .eq("comment_id", commentId);

    if (error) throw error;
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

  /**
   * Fetch the curated public view of a profile via the `get_public_profile`
   * RPC. Returns the row only when the target profile is public (or the
   * caller is its owner); otherwise `null`. Never exposes sensitive columns.
   */
  async getPublicProfile(userId: string): Promise<PublicProfile | null> {
    const { supabase } = await loadSupabaseModule();
    const db = asDb(supabase);
    const { data, error } = await db.rpc<PublicProfile[]>(
      "get_public_profile",
      { target_user_id: userId },
    );

    if (error) {
      logger.error("Error fetching public profile:", error);
      return null;
    }

    const rows = Array.isArray(data) ? data : [];
    return rows[0] ?? null;
  },

  async getPublicProfileSummary(
    userId: string,
  ): Promise<PublicProfileSummary | null> {
    const rows = await getPublicRpcRows("get_public_profile_summary", {
      target_user_id: userId,
    });
    return rows.map(parsePublicProfileSummary).find(Boolean) ?? null;
  },

  async getPublicProfileComments(userId: string): Promise<PublicProfileComment[]> {
    const rows = await getPublicRpcRows("get_public_profile_comments", {
      target_user_id: userId,
      result_limit: 12,
    });
    return rows
      .map(parsePublicProfileComment)
      .filter((comment): comment is PublicProfileComment => comment !== null);
  },

  async getPublicProfileConnections(
    userId: string,
    kind: "followers" | "following",
  ): Promise<PublicConnectionProfile[]> {
    const rows = await getPublicRpcRows("get_public_profile_connections", {
      target_user_id: userId,
      connection_kind: kind,
      result_limit: 24,
    });
    return rows
      .map(parsePublicConnectionProfile)
      .filter((profile): profile is PublicConnectionProfile => profile !== null);
  },

  async listPublicProfiles(searchTerm: string): Promise<DirectoryProfile[]> {
    const rows = await getPublicRpcRows("list_public_profiles", {
      search_term: searchTerm || null,
      result_limit: 24,
    });
    return rows
      .map(parseDirectoryProfile)
      .filter((profile): profile is DirectoryProfile => profile !== null);
  },
};
