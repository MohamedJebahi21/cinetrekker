import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Film,
  Tv,
  Edit,
  Users,
  MessageSquare,
  Star,
  Calendar,
  ChevronRight,
  UserCheck,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  socialService,
  type PublicConnectionProfile as ConnectionProfile,
  type PublicProfileComment as PublicComment,
} from "@/services/social";
import SEO from "@/components/SEO";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import { buildCanonicalUrl } from "@/lib/seo";
import { useToast } from "@/hooks/use-toast";
import { TasteMatchCard } from "@/components/social/TasteMatchCard";
import { PublicProfileSkeleton } from "@/components/profile/ProfilePageSkeletons";

// Public-profile response contracts are parsed in the social service, keeping
// direct Supabase RPC details out of this presentation component.

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarOrPlaceholder({
  src,
  name,
  size = "lg",
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-24 h-24 md:w-28 md:h-28",
  };
  const iconSizes = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-12 w-12" };

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-background shrink-0",
        sizeClasses[size],
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "User avatar"}
          width={size === "lg" ? 112 : size === "md" ? 56 : 40}
          height={size === "lg" ? 112 : size === "md" ? 56 : 40}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className={cn("text-primary", iconSizes[size])} />
      )}
    </div>
  );
}

function FavoritePosterCard({
  mediaKey,
}: {
  mediaKey: string;
}) {
  const parts = mediaKey.split("-");
  const mediaType = parts[0] as "movie" | "tv";
  const mediaId = parseInt(parts[1] ?? "0", 10);

  const { data: details } = useQuery({
    queryKey: ["media-preview", mediaType, mediaId],
    queryFn: async () => {
      const { getMovieDetails, getTVDetails } = await import("@/services/tmdb");
      return mediaType === "movie"
        ? getMovieDetails(mediaId)
        : getTVDetails(mediaId);
    },
    enabled: !!mediaId && !!mediaType,
    staleTime: 1000 * 60 * 30,
  });

  const title = details ? getMediaTitle(details) : "";
  const posterUrl = details?.poster_path
    ? getImageUrl(details.poster_path, "w185")
    : null;

  return (
    <Link
      to={`/${mediaType}/${mediaId}`}
      className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-border/40 bg-muted hover:border-primary/40 transition-all"
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={title}
          width={185}
          height={278}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          {mediaType === "movie" ? (
            <Film className="h-8 w-8 text-muted-foreground" />
          ) : (
            <Tv className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {title && (
        <p className="absolute bottom-0 left-0 right-0 px-2 py-2 text-[10px] font-medium text-white line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {title}
        </p>
      )}
    </Link>
  );
}

function CommentActivityCard({ comment }: { comment: PublicComment }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Link
      to={`/${comment.media_type}/${comment.media_id}`}
      className="group block rounded-2xl border border-border/50 bg-card/60 p-4 hover:border-primary/30 hover:bg-card/80 transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {comment.media_type === "movie" ? (
            <Film className="h-3 w-3 mr-1" />
          ) : (
            <Tv className="h-3 w-3 mr-1" />
          )}
          {comment.media_type}
        </Badge>
        {comment.contains_spoiler && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setRevealed((r) => !r);
            }}
            className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 transition-colors"
          >
            {revealed ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            Spoiler
          </button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {new Date(comment.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <p
        className={cn(
          "text-sm text-muted-foreground line-clamp-3 group-hover:text-foreground transition-colors",
          comment.contains_spoiler && !revealed && "blur-sm select-none",
        )}
      >
        {comment.content}
      </p>
      {comment.likes_count > 0 && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <Star className="h-3 w-3 text-amber-400" />
          {comment.likes_count} {comment.likes_count === 1 ? "like" : "likes"}
        </div>
      )}
    </Link>
  );
}

function ConnectionCard({ profile }: { profile: ConnectionProfile }) {
  return (
    <Link
      to={`/user/${profile.user_id}`}
      className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-3 hover:border-primary/30 hover:bg-card/80 transition-all group"
    >
      <AvatarOrPlaceholder
        src={profile.avatar_url}
        name={profile.display_name}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {profile.display_name ?? "CineTrekker User"}
        </p>
        {profile.bio && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {profile.bio}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {profile.followers_count} followers
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOwnProfile = !!user?.id && user.id === userId;
  const [activeTab, setActiveTab] = useState<"favorites" | "activity" | "followers" | "following">("favorites");

  // ── Profile summary ──────────────────────────────────────────────────────
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["public-profile-summary", userId],
    queryFn: async () => {
      if (!userId) return null;
      return socialService.getPublicProfileSummary(userId);
    },
    enabled: !!userId,
  });

  const resolvedProfile = profile;
  const isLoading = isLoadingProfile;

  // ── Follow state ─────────────────────────────────────────────────────────
  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, userId],
    queryFn: async () => {
      if (!userId || !user?.id || user.id === userId) return false;
      return socialService.isFollowing(user.id, userId);
    },
    enabled: !!userId && !!user?.id && user.id !== userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !user?.id) throw new Error("User not logged in");
      if (isFollowing) {
        await socialService.unfollowUser(user.id, userId);
      } else {
        await socialService.followUser(user.id, userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile-summary", userId] });
    },
    onError: (error: Error) => {
      toast({
        title: t("userProfile.followError", "Unable to update follow status"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ── Tab data ─────────────────────────────────────────────────────────────
  const { data: comments = [] } = useQuery({
    queryKey: ["public-profile-comments", userId],
    queryFn: () => socialService.getPublicProfileComments(userId!),
    enabled: !!userId && activeTab === "activity",
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["public-profile-followers", userId],
    queryFn: () => socialService.getPublicProfileConnections(userId!, "followers"),
    enabled: !!userId && activeTab === "followers",
  });

  const { data: following = [] } = useQuery({
    queryKey: ["public-profile-following", userId],
    queryFn: () => socialService.getPublicProfileConnections(userId!, "following"),
    enabled: !!userId && activeTab === "following",
  });

  // ── Render states ─────────────────────────────────────────────────────────
  if (!userId) return null;

  if (isLoading) {
    return <PublicProfileSkeleton />;
  }

  if (!resolvedProfile) {
    return (
      <div className="page-container pt-24">
        <div className="text-center py-24 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {t("userProfile.notFound", "Profile not found")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t(
              "userProfile.notFoundDesc",
              "This profile doesn't exist or isn't public yet.",
            )}
          </p>
          <Button asChild>
            <Link to="/">{t("common.goHome", "Go home")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = resolvedProfile.display_name ?? "CineTrekker User";
  const favoriteKeys = Array.isArray(resolvedProfile.favorite_titles)
    ? resolvedProfile.favorite_titles.filter(
        (k) => k.startsWith("movie-") || k.startsWith("tv-"),
      )
    : [];

  const joinedYear = resolvedProfile.created_at
    ? new Date(resolvedProfile.created_at).getFullYear()
    : null;

  return (
    <>
      <SEO
        title={`${displayName} — CineTrekker`}
        description={
          resolvedProfile.bio ??
          `${displayName}'s cinephile profile on CineTrekker`
        }
        canonical={buildCanonicalUrl(`/user/${userId}`)}
      />

      <div className="min-h-screen">
        {/* ── Hero / cover ─────────────────────────────────────────────── */}
        <div className="relative h-40 md:h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="page-container relative -mt-16 md:-mt-20 pb-24 md:pb-12">
          {/* ── Identity block ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6"
          >
            {/* Avatar */}
            <div className="ring-4 ring-background rounded-full">
              <AvatarOrPlaceholder
                src={resolvedProfile.avatar_url}
                name={displayName}
                size="lg"
              />
            </div>

            {/* Name, bio, meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {displayName}
                </h1>
                {resolvedProfile.is_public && (
                  <Badge variant="secondary" className="text-[10px]">
                    Public
                  </Badge>
                )}
              </div>
              {resolvedProfile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-2">
                  {resolvedProfile.bio}
                </p>
              )}
              {joinedYear && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Joined {joinedYear}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isOwnProfile ? (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/profile">
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Link>
                </Button>
              ) : user ? (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className="gap-2 min-w-[110px]"
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
              ) : (
                <Button asChild size="sm" className="gap-2">
                  <Link to="/login">
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>

          {/* ── Social proof rail ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            className="flex items-center gap-6 mb-8 border-b border-border/50 pb-6 overflow-x-auto no-scrollbar"
          >
            {[
              {
                label: "Followers",
                value: resolvedProfile.followers_count,
                tab: "followers" as const,
                icon: Users,
              },
              {
                label: "Following",
                value: resolvedProfile.following_count,
                tab: "following" as const,
                icon: Users,
              },
              {
                label: "Movies",
                value: resolvedProfile.movies_count,
                tab: "favorites" as const,
                icon: Film,
              },
              {
                label: "Episodes",
                value: resolvedProfile.episodes_count,
                tab: "favorites" as const,
                icon: Tv,
              },
              {
                label: "Comments",
                value: resolvedProfile.comments_count,
                tab: "activity" as const,
                icon: MessageSquare,
              },
            ].map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => setActiveTab(stat.tab)}
                className="flex flex-col items-start hover:text-primary transition-colors group"
              >
                <span className="text-xl font-bold tabular-nums group-hover:text-primary transition-colors">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors">
                  {stat.label}
                </span>
              </button>
            ))}
          </motion.div>

          {!isOwnProfile && user && (
            <TasteMatchCard target={resolvedProfile} />
          )}

          {/* ── Tabbed content ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.14, ease: "easeOut" }}
          >
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(
                  v as "favorites" | "activity" | "followers" | "following",
                )
              }
            >
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1 mb-6 bg-muted/50 rounded-xl">
                <TabsTrigger
                  value="favorites"
                  className="shrink-0 rounded-lg px-4 py-2 gap-2 text-sm font-medium"
                >
                  <Star className="h-3.5 w-3.5" />
                  Favorites
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="shrink-0 rounded-lg px-4 py-2 gap-2 text-sm font-medium"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comments
                </TabsTrigger>
                <TabsTrigger
                  value="followers"
                  className="shrink-0 rounded-lg px-4 py-2 gap-2 text-sm font-medium"
                >
                  <Users className="h-3.5 w-3.5" />
                  Followers
                </TabsTrigger>
                <TabsTrigger
                  value="following"
                  className="shrink-0 rounded-lg px-4 py-2 gap-2 text-sm font-medium"
                >
                  <Users className="h-3.5 w-3.5" />
                  Following
                </TabsTrigger>
              </TabsList>

              {/* Favorites tab */}
              <TabsContent value="favorites">
                {favoriteKeys.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {favoriteKeys.map((key) => (
                      <FavoritePosterCard key={key} mediaKey={key} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {isOwnProfile
                        ? "Pin your favorite titles from any movie or TV page."
                        : `${displayName} hasn't pinned any favorites yet.`}
                    </p>
                    {isOwnProfile && (
                      <Button asChild size="sm" variant="outline" className="mt-4">
                        <Link to="/discover">Discover titles</Link>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Activity / comments tab */}
              <TabsContent value="activity">
                {comments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comments.map((comment) => (
                      <CommentActivityCard key={comment.id} comment={comment} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {resolvedProfile.comments_count > 0
                        ? "Comment activity is loading…"
                        : isOwnProfile
                        ? "Leave your first comment on any title page."
                        : `${displayName} hasn't commented yet.`}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Followers tab */}
              <TabsContent value="followers">
                {followers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {followers.map((profile) => (
                      <ConnectionCard key={profile.user_id} profile={profile} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {isOwnProfile
                        ? "No followers yet. Share your profile to grow your audience."
                        : `${displayName} doesn't have any followers yet.`}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Following tab */}
              <TabsContent value="following">
                {following.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {following.map((profile) => (
                      <ConnectionCard key={profile.user_id} profile={profile} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {isOwnProfile
                        ? "You're not following anyone yet."
                        : `${displayName} isn't following anyone yet.`}
                    </p>
                    {isOwnProfile && (
                      <Button asChild size="sm" variant="outline" className="mt-4">
                        <Link to="/people">Find cinephiles</Link>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </>
  );
}
